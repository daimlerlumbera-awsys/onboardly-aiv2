import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db, pool } from '../db/index'
import {
  employees,
  googleProfiles,
  employeePreviousJobs,
  employeeRequirements,
  employeeTasks,
  employeeIdCards,
} from '../db/schema'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'

const router = Router()

// ── Validation schema (mirrors EmployeeForm.vue rules) ────────────────────

const previousJobSchema = z.object({
  position:         z.string().min(1),
  companyName:      z.string().min(1),
  startDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reasonForLeaving: z.string().optional(),
})

const employeeSchema = z.object({
  firstName:      z.string().min(2, 'First name must be at least 2 characters.'),
  lastName:       z.string().min(2, 'Last name must be at least 2 characters.'),
  email:          z.string().email('Enter a valid email address.'),
  phone:          z.string().regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid phone number.').optional().or(z.literal('')),
  address:        z.string().optional(),
  department:     z.enum(['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations'] as const, {
    message: 'Department is required.',
  }),
  position:       z.string().min(2, 'Position is required.'),
  employeeType:   z.enum(['first_time', 'experienced'] as const, {
    message: 'Employee type is required.',
  }),
  startDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date is required.')
    .refine(v => new Date(v).getFullYear() >= 2000, 'Start date looks incorrect — check the year.'),
  previousJobs:            z.array(previousJobSchema).optional(),
  companyName:             z.string().optional(),
  companyAddress:          z.string().optional(),
  companyPhone:            z.string().optional(),
  bloodType:               z.string().optional(),
  emergencyContactName:    z.string().optional(),
  emergencyContactNumber:  z.string().optional(),
  emergencyContactAddress: z.string().optional(),
})

// ── Helper: generate next ONB-<YEAR>-<NNNN> in a serialised transaction ────

async function generateEmployeeNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Upsert the year row and lock it
    await client.query(
      `INSERT INTO employee_number_seq (year, last_seq)
       VALUES ($1, 0)
       ON CONFLICT (year) DO NOTHING`,
      [year],
    )
    const { rows } = await client.query<{ last_seq: number }>(
      `SELECT last_seq FROM employee_number_seq WHERE year = $1 FOR UPDATE`,
      [year],
    )
    const nextSeq = rows[0].last_seq + 1
    await client.query(
      `UPDATE employee_number_seq SET last_seq = $1 WHERE year = $2`,
      [nextSeq, year],
    )
    await client.query('COMMIT')
    return `ONB-${year}-${String(nextSeq).padStart(4, '0')}`
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ── Helper: compute requirements summary for a list of google_profile ids ──

async function getRequirementsSummaries(googleProfileIds: string[]) {
  if (googleProfileIds.length === 0) return new Map<string, object>()

  const rows = await db
    .select({
      employeeId: employeeRequirements.employeeId,
      status:     employeeRequirements.status,
      dueDate:    employeeRequirements.dueDate,
    })
    .from(employeeRequirements)
    .where(inArray(employeeRequirements.employeeId, googleProfileIds))

  const now = new Date()
  const map = new Map<string, { total: number; submitted: number; approved: number; overdue: number }>()

  for (const row of rows) {
    if (!map.has(row.employeeId)) {
      map.set(row.employeeId, { total: 0, submitted: 0, approved: 0, overdue: 0 })
    }
    const s = map.get(row.employeeId)!
    s.total++
    if (row.status === 'submitted') s.submitted++
    if (row.status === 'approved')  s.approved++
    if (row.status !== 'approved' && row.dueDate && new Date(row.dueDate) < now) s.overdue++
  }

  return map
}

// ── Helper: auto-promote employee status if all requirements + tasks done ──

async function maybePromoteStatus(employeeId: string, googleProfileId: string | null) {
  if (!googleProfileId) return

  const pendingReqs = await db
    .select({ status: employeeRequirements.status })
    .from(employeeRequirements)
    .where(eq(employeeRequirements.employeeId, googleProfileId))

  const allReqsApproved = pendingReqs.length > 0 && pendingReqs.every(r => r.status === 'approved')

  const pendingTasks = await db
    .select({ status: employeeTasks.status })
    .from(employeeTasks)
    .where(eq(employeeTasks.employeeId, employeeId))

  const allTasksCompleted = pendingTasks.length > 0 && pendingTasks.every(t => t.status === 'Completed')

  if (allReqsApproved && allTasksCompleted) {
    await db
      .update(employees)
      .set({ status: 'active' })
      .where(eq(employees.id, employeeId))
  }
}

// ── GET /api/employees/me  (employee — own record by JWT email) ───────────

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.email, user.email))

  if (!employee) {
    res.status(404).json({ error: 'No employee record found for this account.' })
    return
  }

  res.json(employee)
})

// ── GET /api/employees ─────────────────────────────────────────────────────

router.get('/', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { search, department, status } = req.query as Record<string, string>

  let rows = await db.select().from(employees)

  // Filter
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(e =>
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q),
    )
  }
  if (department) rows = rows.filter(e => e.department === department)
  if (status)     rows = rows.filter(e => e.status === status)

  if (rows.length === 0) {
    res.json([])
    return
  }

  // Enrich: google_profiles by email
  const emails = rows.map(e => e.email)
  const gProfiles = await db
    .select()
    .from(googleProfiles)
    .where(inArray(googleProfiles.email, emails))

  const gProfileByEmail = new Map(gProfiles.map(g => [g.email, g]))

  // Requirements summary keyed by google_profile.id
  const gpIds = gProfiles.map(g => g.id)
  const summaryMap = await getRequirementsSummaries(gpIds)

  const result = rows.map(e => {
    const gp = gProfileByEmail.get(e.email)
    return {
      ...e,
      googleProfile:       gp ? { firstName: gp.firstName, lastName: gp.lastName, avatarUrl: gp.avatarUrl, email: gp.email } : undefined,
      requirementsSummary: gp ? summaryMap.get(gp.id) ?? { total: 0, submitted: 0, approved: 0, overdue: 0 } : undefined,
    }
  })

  res.json(result)
})

// ── GET /api/employees/:id ─────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const [employee] = await db.select().from(employees).where(eq(employees.id, id))
  if (!employee) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  const previousJobs = await db
    .select()
    .from(employeePreviousJobs)
    .where(eq(employeePreviousJobs.employeeId, id))

  const [gp] = await db
    .select()
    .from(googleProfiles)
    .where(eq(googleProfiles.email, employee.email))

  const summaryMap = gp ? await getRequirementsSummaries([gp.id]) : new Map()

  res.json({
    ...employee,
    previousJobs,
    googleProfile:       gp ? { firstName: gp.firstName, lastName: gp.lastName, avatarUrl: gp.avatarUrl, email: gp.email } : undefined,
    requirementsSummary: gp ? summaryMap.get(gp.id) ?? { total: 0, submitted: 0, approved: 0, overdue: 0 } : undefined,
  })
})

// ── POST /api/employees ────────────────────────────────────────────────────

router.post('/', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const parsed = employeeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const { previousJobs, ...data } = parsed.data

  // Duplicate email check
  const [existing] = await db.select().from(employees).where(eq(employees.email, data.email))
  if (existing) {
    res.status(409).json({ error: 'An employee with this email already exists.' })
    return
  }

  const employeeNumber = await generateEmployeeNumber()
  const [employee] = await db.insert(employees).values({ ...data, employeeNumber }).returning()

  if (previousJobs?.length) {
    await db.insert(employeePreviousJobs).values(
      previousJobs.map(j => ({ ...j, employeeId: employee.id })),
    )
  }

  // Auto-issue an ID card using the employee number as the card number
  await db.insert(employeeIdCards).values({
    employeeId: employee.id,
    cardNumber: employeeNumber,
    status:     'pending_review',
    issuedAt:   new Date().toISOString().slice(0, 10),
  })

  res.status(201).json(employee)
})

// ── PUT /api/employees/:id ─────────────────────────────────────────────────

router.put('/:id', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const [existing] = await db.select().from(employees).where(eq(employees.id, id))
  if (!existing) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  const parsed = employeeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const { previousJobs, ...data } = parsed.data

  // Duplicate email check (exclude self)
  if (data.email !== existing.email) {
    const [dup] = await db.select().from(employees).where(eq(employees.email, data.email))
    if (dup) {
      res.status(409).json({ error: 'An employee with this email already exists.' })
      return
    }
  }

  const [updated] = await db.update(employees).set(data).where(eq(employees.id, id)).returning()

  // Replace previous jobs if provided
  if (previousJobs !== undefined) {
    await db.delete(employeePreviousJobs).where(eq(employeePreviousJobs.employeeId, id))
    if (previousJobs.length) {
      await db.insert(employeePreviousJobs).values(
        previousJobs.map(j => ({ ...j, employeeId: id })),
      )
    }
  }

  // Check auto-promotion
  const [gp] = await db.select().from(googleProfiles).where(eq(googleProfiles.email, updated.email))
  await maybePromoteStatus(id, gp?.id ?? null)

  const [final] = await db.select().from(employees).where(eq(employees.id, id))
  res.json(final)
})

// ── PATCH /api/employees/:id/status ───────────────────────────────────────

router.patch('/:id/status', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { status } = req.body

  if (!['active', 'inactive', 'pending'].includes(status)) {
    res.status(400).json({ error: 'status must be one of: active, inactive, pending' })
    return
  }

  const [existing] = await db.select().from(employees).where(eq(employees.id, id))
  if (!existing) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  const [updated] = await db
    .update(employees)
    .set({ status })
    .where(eq(employees.id, id))
    .returning()

  res.json(updated)
})

// ── DELETE /api/employees/:id ──────────────────────────────────────────────

router.delete('/:id', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const [existing] = await db.select().from(employees).where(eq(employees.id, id))
  if (!existing) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  await db.delete(employees).where(eq(employees.id, id))
  res.status(200).json({ message: 'Employee deleted.' })
})

// ── POST /api/employees/:id/previous-jobs ─────────────────────────────────

const addJobSchema = z.object({
  position:         z.string().min(1, 'Position is required.'),
  companyName:      z.string().min(1, 'Company name is required.'),
  startDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reasonForLeaving: z.string().optional(),
})

router.post('/:id/previous-jobs', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const [emp] = await db.select().from(employees).where(eq(employees.id, id))
  if (!emp) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  const parsed = addJobSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const [job] = await db
    .insert(employeePreviousJobs)
    .values({ ...parsed.data, employeeId: id })
    .returning()

  res.status(201).json(job)
})

// ── DELETE /api/employees/:id/previous-jobs/:jobId ────────────────────────

router.delete('/:id/previous-jobs/:jobId', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id, jobId } = req.params

  const [job] = await db
    .select()
    .from(employeePreviousJobs)
    .where(and(eq(employeePreviousJobs.id, jobId), eq(employeePreviousJobs.employeeId, id)))

  if (!job) {
    res.status(404).json({ error: 'Previous job not found.' })
    return
  }

  await db.delete(employeePreviousJobs).where(eq(employeePreviousJobs.id, jobId))
  res.status(200).json({ message: 'Previous job deleted.' })
})

export default router
