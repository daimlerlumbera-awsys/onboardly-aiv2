import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import path from 'path'
import { db } from '../db/index'
import { employees, employeeRequirements, googleProfiles, requirements, employeeOcrProfiles } from '../db/schema'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { runOcr } from '../services/ocr'

const router = Router({ mergeParams: true })

// ── GET /api/requirements (catalogue) — HR only ───────────────────────────

export const requirementsCatalogueRouter = Router()

requirementsCatalogueRouter.get('/', authenticate, requireRole('hr'), async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(requirements)
  res.json(rows)
})

// ── POST /api/employees/:id/requirements  (HR assigns a requirement) ──────

const assignSchema = z.object({
  requirementId: z.string().uuid('requirementId must be a UUID.'),
  dueDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD.').optional(),
})

router.post('/', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const parsed = assignSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const [employee] = await db.select({ email: employees.email }).from(employees).where(eq(employees.id, id))
  if (!employee) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  const [gpRow] = await db.select().from(googleProfiles).where(eq(googleProfiles.email, employee.email))
  if (!gpRow) {
    res.status(422).json({ error: 'Employee has no google profile. They must log in at least once before requirements can be assigned.' })
    return
  }

  const [req1] = await db.select({ id: requirements.id }).from(requirements).where(eq(requirements.id, parsed.data.requirementId))
  if (!req1) {
    res.status(404).json({ error: 'Requirement not found.' })
    return
  }

  const [inserted] = await db
    .insert(employeeRequirements)
    .values({
      employeeId:    gpRow.id,
      requirementId: parsed.data.requirementId,
      status:        'pending',
      dueDate:       parsed.data.dueDate ?? null,
    })
    .returning()

  res.status(201).json(inserted)
})

// ── GET /api/employees/:id/requirements ───────────────────────────────────
// :id = employees.id
// HR can view any employee; an employee can only view their own.

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const user = req.user!

  const [employee] = await db
    .select({ email: employees.email })
    .from(employees)
    .where(eq(employees.id, id))

  if (!employee) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  // Employees can only view their own requirements
  if (user.role !== 'hr' && user.email !== employee.email) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const [gpRow] = await db
    .select()
    .from(googleProfiles)
    .where(eq(googleProfiles.email, employee.email))

  if (!gpRow) {
    res.json([])
    return
  }

  const rows = await db
    .select({
      id:            employeeRequirements.id,
      employeeId:    employeeRequirements.employeeId,
      requirementId: employeeRequirements.requirementId,
      status:        employeeRequirements.status,
      dueDate:       employeeRequirements.dueDate,
      fileUrl:       employeeRequirements.fileUrl,
      submittedAt:   employeeRequirements.submittedAt,
      reviewedAt:    employeeRequirements.reviewedAt,
      notes:         employeeRequirements.notes,
      requirement: {
        name:        requirements.name,
        description: requirements.description,
      },
    })
    .from(employeeRequirements)
    .innerJoin(requirements, eq(employeeRequirements.requirementId, requirements.id))
    .where(eq(employeeRequirements.employeeId, gpRow.id))

  res.json(rows)
})

// ── PATCH /api/requirements/:reqId/status  (HR only) ─────────────────────
// HR approves or rejects a requirement. Notes required on rejection.

const statusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes:  z.string().optional(),
}).refine(
  data => data.status !== 'rejected' || (data.notes && data.notes.trim().length > 0),
  { message: 'Notes are required when rejecting a requirement.', path: ['notes'] },
)

router.patch('/:reqId/status', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { reqId } = req.params

  const [existing] = await db
    .select()
    .from(employeeRequirements)
    .where(eq(employeeRequirements.id, reqId))

  if (!existing) {
    res.status(404).json({ error: 'Requirement assignment not found.' })
    return
  }

  if (existing.status !== 'submitted') {
    res.status(422).json({ error: `Cannot review a requirement with status '${existing.status}'. It must be 'submitted' first.` })
    return
  }

  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const { status, notes } = parsed.data

  const [updated] = await db
    .update(employeeRequirements)
    .set({ status, notes: notes ?? null, reviewedAt: new Date() })
    .where(eq(employeeRequirements.id, reqId))
    .returning()

  res.json(updated)
})

// ── PATCH /api/requirements/:reqId/file  (employee) ──────────────────────
// Employee submits a file URL → status becomes 'submitted'.

const fileSchema = z.object({
  fileUrl: z.string().min(1, 'fileUrl is required.'),
})

router.patch('/:reqId/file', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { reqId } = req.params
  const user = req.user!
  console.log('[req/file] PATCH called — reqId:', reqId, 'user:', user.email, 'body:', req.body)

  const [existing] = await db
    .select()
    .from(employeeRequirements)
    .where(eq(employeeRequirements.id, reqId))

  if (!existing) {
    res.status(404).json({ error: 'Requirement assignment not found.' })
    return
  }

  // Employees can only update their own; HR cannot use this endpoint
  if (user.role !== 'hr') {
    const [gpRow] = await db
      .select()
      .from(googleProfiles)
      .where(eq(googleProfiles.email, user.email))

    if (!gpRow || gpRow.id !== existing.employeeId) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
  }

  if (existing.status === 'approved') {
    res.status(422).json({ error: 'This requirement has already been approved.' })
    return
  }

  const parsed = fileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const [updated] = await db
    .update(employeeRequirements)
    .set({ fileUrl: parsed.data.fileUrl, status: 'submitted', submittedAt: new Date() })
    .where(eq(employeeRequirements.id, reqId))
    .returning()

  res.json(updated)

  // Fire-and-forget OCR — only for local file URLs (contains /uploads/)
  if (parsed.data.fileUrl.includes('/uploads/')) {
    const filename = path.basename(parsed.data.fileUrl)
    const filePath = path.resolve(import.meta.dirname, '../../uploads', filename)

    // Resolve employee record to get employees.id
    const [gpRow] = await db
      .select({ email: googleProfiles.email })
      .from(googleProfiles)
      .where(eq(googleProfiles.id, existing.employeeId))

    const empRow = gpRow
      ? await db.select({ id: employees.id }).from(employees).where(eq(employees.email, gpRow.email)).then(r => r[0])
      : null

    if (empRow) {
      console.log('[ocr] starting for file:', filePath)
      runOcr(filePath)
        .then(result =>
          db.insert(employeeOcrProfiles).values({
            employeeId:    empRow.id,
            requirementId: reqId,
            fullName:      result.fullName,
            dateOfBirth:   result.dateOfBirth,
            idNumber:      result.idNumber,
            nationality:   result.nationality,
            address:       result.address,
            expiryDate:    result.expiryDate,
            documentType:  result.documentType,
            rawOcrText:    result.rawText,
          })
        )
        .catch(err => console.error('[ocr] failed for req', reqId, err))
    }
  }
})

export default router
