import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db/index'
import {
  employees,
  employeeIdCards,
  googleProfiles,
} from '../db/schema'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'

// Only issue cards for active employees
const ISSUABLE_STATUSES = ['active'] as const

// ── Helper: enrich a card row with employee + avatar data ─────────────────

async function enrichCard(card: typeof employeeIdCards.$inferSelect) {
  const [emp] = await db
    .select({
      id:                       employees.id,
      firstName:                employees.firstName,
      lastName:                 employees.lastName,
      department:               employees.department,
      position:                 employees.position,
      employeeNumber:           employees.employeeNumber,
      email:                    employees.email,
      address:                  employees.address,
      homeAddress:              employees.homeAddress,
      sssNumber:                employees.sssNumber,
      tinNumber:                employees.tinNumber,
      startDate:                employees.startDate,
      bloodType:                employees.bloodType,
      emergencyContactName:     employees.emergencyContactName,
      emergencyContactNumber:   employees.emergencyContactNumber,
      emergencyContactAddress:  employees.emergencyContactAddress,
      companyName:              employees.companyName,
      companyAddress:           employees.companyAddress,
      companyPhone:             employees.companyPhone,
    })
    .from(employees)
    .where(eq(employees.id, card.employeeId))

  if (!emp) return { ...card, employee: undefined }

  const [gp] = await db
    .select({ avatarUrl: googleProfiles.avatarUrl })
    .from(googleProfiles)
    .where(eq(googleProfiles.email, emp.email))

  return {
    ...card,
    employee: {
      firstName:      emp.firstName,
      lastName:       emp.lastName,
      department:     emp.department,
      position:       emp.position,
      employeeNumber: emp.employeeNumber,
      homeAddress:             emp.homeAddress ?? emp.address ?? undefined,
      sssNumber:               emp.sssNumber ?? undefined,
      tinNumber:               emp.tinNumber ?? undefined,
      startDate:               emp.startDate,
      bloodType:               emp.bloodType ?? undefined,
      emergencyContactName:    emp.emergencyContactName ?? undefined,
      emergencyContactNumber:  emp.emergencyContactNumber ?? undefined,
      emergencyContactAddress: emp.emergencyContactAddress ?? undefined,
      avatarUrl:               gp?.avatarUrl ?? undefined,
      companyName:             emp.companyName ?? undefined,
      companyAddress:          emp.companyAddress ?? undefined,
      companyPhone:            emp.companyPhone ?? undefined,
    },
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Router A — mounted at /api/id-cards
//   GET  /api/id-cards         (HR) list all cards
//   GET  /api/id-cards/me      (employee) own card
//   PATCH /api/id-cards/:id/revoke  (HR)
// ════════════════════════════════════════════════════════════════════════════

export const idCardsRouter = Router()

// ── GET /api/id-cards  (HR only) ─────────────────────────────────────────

idCardsRouter.get('/', authenticate, requireRole('hr'), async (_req: Request, res: Response): Promise<void> => {
  const cards = await db.select().from(employeeIdCards)

  const empIds = cards.map(c => c.employeeId)
  if (empIds.length === 0) {
    res.json([])
    return
  }

  const empRows = await db
    .select({
      id:                       employees.id,
      firstName:                employees.firstName,
      lastName:                 employees.lastName,
      department:               employees.department,
      position:                 employees.position,
      employeeNumber:           employees.employeeNumber,
      email:                    employees.email,
      address:                  employees.address,
      homeAddress:              employees.homeAddress,
      sssNumber:                employees.sssNumber,
      tinNumber:                employees.tinNumber,
      startDate:                employees.startDate,
      bloodType:                employees.bloodType,
      emergencyContactName:     employees.emergencyContactName,
      emergencyContactNumber:   employees.emergencyContactNumber,
      emergencyContactAddress:  employees.emergencyContactAddress,
      companyName:              employees.companyName,
      companyAddress:           employees.companyAddress,
      companyPhone:             employees.companyPhone,
    })
    .from(employees)
    .where(inArray(employees.id, empIds))

  const empEmails = empRows.map(e => e.email)
  const gpRows = empEmails.length > 0
    ? await db
        .select({ email: googleProfiles.email, avatarUrl: googleProfiles.avatarUrl })
        .from(googleProfiles)
        .where(inArray(googleProfiles.email, empEmails))
    : []

  const empById   = new Map(empRows.map(e => [e.id, e]))
  const gpByEmail = new Map(gpRows.map(g => [g.email, g]))

  const result = cards.map(card => {
    const emp = empById.get(card.employeeId)
    const gp  = emp ? gpByEmail.get(emp.email) : undefined
    return {
      ...card,
      employee: emp
        ? {
            firstName:      emp.firstName,
            lastName:       emp.lastName,
            department:     emp.department,
            position:       emp.position,
            employeeNumber: emp.employeeNumber,
            homeAddress:             emp.homeAddress ?? emp.address ?? undefined,
            sssNumber:               emp.sssNumber ?? undefined,
            tinNumber:               emp.tinNumber ?? undefined,
            startDate:               emp.startDate,
            bloodType:               emp.bloodType ?? undefined,
            emergencyContactName:    emp.emergencyContactName ?? undefined,
            emergencyContactNumber:  emp.emergencyContactNumber ?? undefined,
            emergencyContactAddress: emp.emergencyContactAddress ?? undefined,
            avatarUrl:               gp?.avatarUrl ?? undefined,
            companyName:             emp.companyName ?? undefined,
            companyAddress:          emp.companyAddress ?? undefined,
            companyPhone:            emp.companyPhone ?? undefined,
          }
        : undefined,
    }
  })

  res.json(result)
})

// ── GET /api/id-cards/me  (employee only) ────────────────────────────────

idCardsRouter.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!

  const [emp] = await db
    .select()
    .from(employees)
    .where(eq(employees.email, user.email))

  if (!emp) {
    res.status(404).json({ error: 'No employee record found for this account.' })
    return
  }

  const [card] = await db
    .select()
    .from(employeeIdCards)
    .where(eq(employeeIdCards.employeeId, emp.id))

  if (!card) {
    res.status(404).json({ error: 'No ID card issued yet.' })
    return
  }

  res.json(await enrichCard(card))
})

// ── PATCH /api/id-cards/:id/revoke  (HR only) ────────────────────────────

idCardsRouter.patch('/:id/revoke', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const [existing] = await db
    .select()
    .from(employeeIdCards)
    .where(eq(employeeIdCards.id, id))

  if (!existing) {
    res.status(404).json({ error: 'ID card not found.' })
    return
  }

  if (existing.status === 'revoked') {
    res.status(422).json({ error: 'ID card is already revoked.' })
    return
  }

  const [updated] = await db
    .update(employeeIdCards)
    .set({ status: 'revoked' })
    .where(eq(employeeIdCards.id, id))
    .returning()

  res.json(await enrichCard(updated))
})

// ════════════════════════════════════════════════════════════════════════════
// Router B — mounted at /api/employees (mergeParams: true)
//   GET  /api/employees/:id/id-card   (HR or owning employee)
//   POST /api/employees/:id/id-card   (HR only) issue / regenerate
// ════════════════════════════════════════════════════════════════════════════

export const employeeIdCardRouter = Router({ mergeParams: true })

const issueSchema = z.object({
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expiresAt must be YYYY-MM-DD')
    .optional(),
})

// ── GET /api/employees/:id/id-card ───────────────────────────────────────

employeeIdCardRouter.get('/:id/id-card', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const user = req.user!

  const [emp] = await db.select().from(employees).where(eq(employees.id, id))
  if (!emp) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  if (user.role !== 'hr' && user.email !== emp.email) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const [card] = await db
    .select()
    .from(employeeIdCards)
    .where(eq(employeeIdCards.employeeId, id))

  if (!card) {
    res.status(404).json({ error: 'No ID card issued yet.' })
    return
  }

  res.json(await enrichCard(card))
})

// ── POST /api/employees/:id/id-card  (HR only) ───────────────────────────

employeeIdCardRouter.post('/:id/id-card', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const [emp] = await db.select().from(employees).where(eq(employees.id, id))
  if (!emp) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  if (!ISSUABLE_STATUSES.includes(emp.status as typeof ISSUABLE_STATUSES[number])) {
    res.status(422).json({
      error: `Cannot issue an ID card for an employee with status '${emp.status}'. Employee must be active.`,
    })
    return
  }

  const parsed = issueSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const issuedAt   = new Date().toISOString().slice(0, 10)
  const cardNumber = emp.employeeNumber

  const existing = await db
    .select()
    .from(employeeIdCards)
    .where(eq(employeeIdCards.employeeId, id))

  let card: typeof employeeIdCards.$inferSelect

  if (existing.length > 0) {
    const [updated] = await db
      .update(employeeIdCards)
      .set({ cardNumber, status: 'active', issuedAt, expiresAt: parsed.data.expiresAt ?? null })
      .where(eq(employeeIdCards.employeeId, id))
      .returning()
    card = updated
  } else {
    const [inserted] = await db
      .insert(employeeIdCards)
      .values({ employeeId: id, cardNumber, status: 'active', issuedAt, expiresAt: parsed.data.expiresAt })
      .returning()
    card = inserted
  }

  res.status(existing.length > 0 ? 200 : 201).json(await enrichCard(card))
})
