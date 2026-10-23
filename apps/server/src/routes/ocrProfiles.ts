import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { employees, employeeOcrProfiles } from '../db/schema'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'

type OcrRow = typeof employeeOcrProfiles.$inferSelect

/** Map OCR documentType → which employee fields to update */
function buildEmployeeUpdate(ocr: OcrRow): Record<string, string> | null {
  const updates: Record<string, string> = {}
  const dt = (ocr.documentType ?? '').toLowerCase()

  if (dt === 'sss e-1' || dt === 'sss e1') {
    // SSS employment report — SSS number only, no address
    if (ocr.idNumber)  updates.sssNumber = ocr.idNumber
  } else if (dt.includes('tin') || dt.includes('bir')) {
    // BIR/TIN form — TIN number only
    if (ocr.idNumber)  updates.tinNumber = ocr.idNumber
  } else if (ocr.address) {
    // Govt ID (SSS ID, Driver's License, Passport, PhilHealth, UMID, PRC, National ID, NBI, etc.)
    updates.homeAddress = ocr.address
    updates.address     = ocr.address
  }

  return Object.keys(updates).length ? updates : null
}

const router = Router({ mergeParams: true })

// GET /api/employees/:id/ocr-profile  (HR only)
router.get('/', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, id))
  if (!emp) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  const profiles = await db
    .select()
    .from(employeeOcrProfiles)
    .where(eq(employeeOcrProfiles.employeeId, id))

  res.json(profiles)
})

export default router

// ── Standalone router for /api/ocr-profiles/:ocrId/review ─────────────────

export const ocrReviewRouter = Router()

const reviewSchema = z.object({
  status:  z.enum(['approved', 'rejected']),
  hrNotes: z.string().optional(),
})

ocrReviewRouter.patch('/:ocrId/review', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { ocrId } = req.params

  const [existing] = await db
    .select()
    .from(employeeOcrProfiles)
    .where(eq(employeeOcrProfiles.id, ocrId))

  if (!existing) {
    res.status(404).json({ error: 'OCR profile not found.' })
    return
  }

  const parsed = reviewSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  if (parsed.data.status === 'rejected') {
    await db.delete(employeeOcrProfiles).where(eq(employeeOcrProfiles.id, ocrId))
    res.status(204).send()
    return
  }

  const [updated] = await db
    .update(employeeOcrProfiles)
    .set({ status: 'approved', hrNotes: parsed.data.hrNotes ?? null, reviewedAt: new Date() })
    .where(eq(employeeOcrProfiles.id, ocrId))
    .returning()

  // Write extracted fields back to the employee record
  const empUpdate = buildEmployeeUpdate(existing)
  console.log('[ocr-review] documentType:', existing.documentType, '| address:', existing.address, '| empUpdate:', empUpdate)
  if (empUpdate) {
    await db.update(employees).set(empUpdate).where(eq(employees.id, existing.employeeId))
  }

  res.json(updated)
})

// DELETE /api/ocr-profiles/:ocrId  (HR only) — removes any OCR record
ocrReviewRouter.delete('/:ocrId', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { ocrId } = req.params

  const [existing] = await db
    .select({ id: employeeOcrProfiles.id })
    .from(employeeOcrProfiles)
    .where(eq(employeeOcrProfiles.id, ocrId))

  if (!existing) {
    res.status(404).json({ error: 'OCR profile not found.' })
    return
  }

  await db.delete(employeeOcrProfiles).where(eq(employeeOcrProfiles.id, ocrId))
  res.status(204).send()
})
