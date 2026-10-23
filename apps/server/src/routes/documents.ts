import { Router, Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { employees, googleProfiles, employeeOcrProfiles, employeeRequirements, requirements } from '../db/schema'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'

const router = Router()

// ── GET /api/documents  ────────────────────────────────────────────────────
// HR:       all OCR profiles, joined with employee name + document requirement name
// Employee: their own submitted requirement files (fileUrl present)

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!

  if (user.role === 'hr') {
    // All OCR profiles with employee name context
    const rows = await db
      .select({
        id:            employeeOcrProfiles.id,
        employeeId:    employeeOcrProfiles.employeeId,
        requirementId: employeeOcrProfiles.requirementId,
        fullName:      employeeOcrProfiles.fullName,
        dateOfBirth:   employeeOcrProfiles.dateOfBirth,
        idNumber:      employeeOcrProfiles.idNumber,
        nationality:   employeeOcrProfiles.nationality,
        address:       employeeOcrProfiles.address,
        expiryDate:    employeeOcrProfiles.expiryDate,
        documentType:  employeeOcrProfiles.documentType,
        rawOcrText:    employeeOcrProfiles.rawOcrText,
        status:        employeeOcrProfiles.status,
        hrNotes:       employeeOcrProfiles.hrNotes,
        extractedAt:   employeeOcrProfiles.extractedAt,
        reviewedAt:    employeeOcrProfiles.reviewedAt,
        employee: {
          firstName: employees.firstName,
          lastName:  employees.lastName,
          email:     employees.email,
        },
      })
      .from(employeeOcrProfiles)
      .innerJoin(employees, eq(employeeOcrProfiles.employeeId, employees.id))
      .orderBy(employeeOcrProfiles.extractedAt)

    res.json(rows)
    return
  }

  // Employee: look up their google profile → employee record → submitted files
  const [gp] = await db
    .select({ id: googleProfiles.id, email: googleProfiles.email })
    .from(googleProfiles)
    .where(eq(googleProfiles.email, user.email))

  if (!gp) {
    res.json([])
    return
  }

  const rows = await db
    .select({
      id:            employeeRequirements.id,
      requirementId: employeeRequirements.requirementId,
      status:        employeeRequirements.status,
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
    .where(eq(employeeRequirements.employeeId, gp.id))
    .orderBy(employeeRequirements.submittedAt)

  // Return all requirements so employees can upload directly from Documents page
  res.json(rows)
})

export default router
