import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { employees, tasksTemplate, employeeTasks } from '../db/schema'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'

const router = Router({ mergeParams: true })

// ── GET /api/tasks/templates  (HR only) ───────────────────────────────────

router.get('/templates', authenticate, requireRole('hr'), async (_req: Request, res: Response): Promise<void> => {
  const templates = await db.select().from(tasksTemplate)
  res.json(templates)
})

// ── POST /api/employees/:id/tasks  (HR only) ──────────────────────────────
// Assign a task template to an employee.

const assignTaskSchema = z.object({
  templateId: z.string().uuid('templateId must be a valid UUID.'),
})

router.post('/', authenticate, requireRole('hr'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params // employees.id

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, id))

  if (!employee) {
    res.status(404).json({ error: 'Employee not found.' })
    return
  }

  const parsed = assignTaskSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const { templateId } = parsed.data

  const [template] = await db
    .select()
    .from(tasksTemplate)
    .where(eq(tasksTemplate.id, templateId))

  if (!template) {
    res.status(404).json({ error: 'Task template not found.' })
    return
  }

  const [task] = await db
    .insert(employeeTasks)
    .values({ employeeId: id, templateId, status: 'Pending' })
    .returning()

  res.status(201).json(task)
})

// ── GET /api/employees/:id/tasks ──────────────────────────────────────────
// HR can view any employee's tasks; an employee can only view their own.

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

  if (user.role !== 'hr' && user.email !== employee.email) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const tasks = await db
    .select({
      id:         employeeTasks.id,
      employeeId: employeeTasks.employeeId,
      templateId: employeeTasks.templateId,
      status:     employeeTasks.status,
      createdAt:  employeeTasks.createdAt,
      template: {
        title:           tasksTemplate.title,
        description:     tasksTemplate.description,
        responsibleDept: tasksTemplate.responsibleDept,
      },
    })
    .from(employeeTasks)
    .innerJoin(tasksTemplate, eq(employeeTasks.templateId, tasksTemplate.id))
    .where(eq(employeeTasks.employeeId, id))

  res.json(tasks)
})

// ── PATCH /api/employees/:id/tasks/:taskId/status ─────────────────────────
// Employee marks their own task as Completed; HR can update any task.

const taskStatusSchema = z.object({
  status: z.enum(['Pending', 'Completed']),
})

router.patch('/:taskId/status', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { id, taskId } = req.params
  const user = req.user!

  const [existing] = await db
    .select()
    .from(employeeTasks)
    .where(eq(employeeTasks.id, taskId))

  if (!existing || existing.employeeId !== id) {
    res.status(404).json({ error: 'Task not found.' })
    return
  }

  // Employees can only update their own tasks
  if (user.role !== 'hr') {
    const [employee] = await db
      .select({ email: employees.email })
      .from(employees)
      .where(eq(employees.id, id))

    if (!employee || employee.email !== user.email) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
  }

  const parsed = taskStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors })
    return
  }

  const [updated] = await db
    .update(employeeTasks)
    .set({ status: parsed.data.status })
    .where(eq(employeeTasks.id, taskId))
    .returning()

  res.json(updated)
})

export default router
