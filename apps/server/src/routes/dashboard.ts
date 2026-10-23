import { Router, Request, Response } from 'express'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '../db/index'
import {
  employees,
  googleProfiles,
  employeeRequirements,
  employeeTasks,
  requirements,
} from '../db/schema'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'

const router = Router()

// ── GET /api/dashboard/hr  (HR only) ─────────────────────────────────────

router.get('/hr', authenticate, requireRole('hr'), async (_req: Request, res: Response): Promise<void> => {
  // ── Stats ───────────────────────────────────────────────────────────────

  const allEmployees = await db.select({ id: employees.id, status: employees.status }).from(employees)

  const totalEmployees      = allEmployees.length
  const pendingEmployees    = allEmployees.filter(e => e.status === 'pending').length
  const activeEmployees     = allEmployees.filter(e => e.status === 'active').length

  const allTasks = await db.select({ status: employeeTasks.status }).from(employeeTasks)
  const pendingTasks   = allTasks.filter(t => t.status === 'Pending').length
  const completedTasks = allTasks.filter(t => t.status === 'Completed').length

  const [{ count: submittedRequirements }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(employeeRequirements)
    .where(eq(employeeRequirements.status, 'submitted'))

  // ── Recent employees (last 5 by created_at) ─────────────────────────────

  const recentEmployees = await db
    .select()
    .from(employees)
    .orderBy(sql`${employees.createdAt} desc`)
    .limit(5)

  // ── Employees with ≥1 pending task ──────────────────────────────────────

  const pendingTaskRows = await db
    .select({ employeeId: employeeTasks.employeeId })
    .from(employeeTasks)
    .where(eq(employeeTasks.status, 'Pending'))

  const pendingTaskEmployeeIds = [...new Set(pendingTaskRows.map(r => r.employeeId))]

  let pendingTaskEmployees: object[] = []
  if (pendingTaskEmployeeIds.length > 0) {
    const empRows = await db
      .select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName, email: employees.email, department: employees.department })
      .from(employees)
      .where(inArray(employees.id, pendingTaskEmployeeIds))

    const countMap = new Map<string, number>()
    for (const r of pendingTaskRows) {
      countMap.set(r.employeeId, (countMap.get(r.employeeId) ?? 0) + 1)
    }

    pendingTaskEmployees = empRows.map(e => ({
      employeeId:   e.id,
      fullName:     `${e.firstName} ${e.lastName}`.trim(),
      email:        e.email,
      department:   e.department,
      pendingCount: countMap.get(e.id) ?? 0,
    }))
  }

  // ── Employees with ≥1 submitted requirement ──────────────────────────────

  const pendingReqRows = await db
    .select({ employeeId: employeeRequirements.employeeId })
    .from(employeeRequirements)
    .where(inArray(employeeRequirements.status, ['pending', 'submitted']))

  const pendingReqGpIds = [...new Set(pendingReqRows.map(r => r.employeeId))]

  let pendingRequirementEmployees: object[] = []
  if (pendingReqGpIds.length > 0) {
    const gpRows = await db
      .select({ id: googleProfiles.id, firstName: googleProfiles.firstName, lastName: googleProfiles.lastName, email: googleProfiles.email })
      .from(googleProfiles)
      .where(inArray(googleProfiles.id, pendingReqGpIds))

    const empRows = await db
      .select({ email: employees.email, department: employees.department })
      .from(employees)

    const empByEmail = new Map(empRows.map(e => [e.email, e]))

    const countMap = new Map<string, number>()
    for (const r of pendingReqRows) {
      countMap.set(r.employeeId, (countMap.get(r.employeeId) ?? 0) + 1)
    }

    pendingRequirementEmployees = gpRows.map(gp => ({
      employeeId:   gp.id,
      fullName:     `${gp.firstName} ${gp.lastName}`.trim(),
      email:        gp.email,
      department:   empByEmail.get(gp.email)?.department ?? '-',
      pendingCount: countMap.get(gp.id) ?? 0,
    }))
  }

  // ── Requirement review queue (all submitted, joined with requirement name + employee email) ──

  const submittedRows = await db
    .select({
      id:            employeeRequirements.id,
      status:        employeeRequirements.status,
      submittedAt:   employeeRequirements.submittedAt,
      reviewedAt:    employeeRequirements.reviewedAt,
      dueDate:       employeeRequirements.dueDate,
      fileUrl:       employeeRequirements.fileUrl,
      notes:         employeeRequirements.notes,
      employeeId:    employeeRequirements.employeeId,
      requirementId: employeeRequirements.requirementId,
      requirementName: requirements.name,
    })
    .from(employeeRequirements)
    .innerJoin(requirements, eq(employeeRequirements.requirementId, requirements.id))
    .where(eq(employeeRequirements.status, 'submitted'))
    .orderBy(sql`${employeeRequirements.submittedAt} desc`)

  const gpIds = [...new Set(submittedRows.map(r => r.employeeId))]
  const gpEmailMap = new Map<string, string>()
  if (gpIds.length > 0) {
    const gpRows = await db
      .select({ id: googleProfiles.id, email: googleProfiles.email })
      .from(googleProfiles)
      .where(inArray(googleProfiles.id, gpIds))
    for (const gp of gpRows) gpEmailMap.set(gp.id, gp.email)
  }

  const requirementReviewQueue = submittedRows.map(r => ({
    ...r,
    employeeEmail: gpEmailMap.get(r.employeeId) ?? '-',
  }))

  res.json({
    stats: { totalEmployees, pendingEmployees, activeEmployees, pendingTasks, completedTasks, submittedRequirements },
    recentEmployees,
    pendingTaskEmployees,
    pendingRequirementEmployees,
    requirementReviewQueue,
  })
})

// ── GET /api/dashboard/employee  (employee only) ─────────────────────────

router.get('/employee', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!

  if (user.role === 'hr') {
    res.status(403).json({ error: 'This endpoint is for employees only.' })
    return
  }

  // Resolve employee record by email
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.email, user.email))

  if (!employee) {
    res.status(404).json({ error: 'No employee record found for this account.' })
    return
  }

  // Tasks
  const taskRows = await db
    .select({ status: employeeTasks.status })
    .from(employeeTasks)
    .where(eq(employeeTasks.employeeId, employee.id))

  const pendingTasks   = taskRows.filter(t => t.status === 'Pending').length
  const completedTasks = taskRows.filter(t => t.status === 'Completed').length

  // Requirements via google_profile
  const [gpRow] = await db
    .select({ id: googleProfiles.id })
    .from(googleProfiles)
    .where(eq(googleProfiles.email, user.email))

  let pendingRequirements = 0
  if (gpRow) {
    const reqRows = await db
      .select({ status: employeeRequirements.status })
      .from(employeeRequirements)
      .where(eq(employeeRequirements.employeeId, gpRow.id))

    pendingRequirements = reqRows.filter(r => r.status !== 'approved' && r.status !== 'submitted').length
  }

  res.json({
    status:              employee.status,
    pendingTasks,
    completedTasks,
    pendingRequirements,
  })
})

export default router
