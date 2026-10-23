import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { db, pool } from './index'
import {
  profiles,
  googleProfiles,
  employees,
  employeeNumberSeq,
  employeePreviousJobs,
  requirements,
  employeeRequirements,
  tasksTemplate,
  employeeTasks,
  employeeOcrProfiles,
  employeeIdCards,
} from './schema'

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 10)

  console.log('[seed] clearing existing data…')

  await db.delete(employeeOcrProfiles)
  await db.delete(employeeIdCards)
  await db.delete(employeeTasks)
  await db.delete(employeeRequirements)
  await db.delete(employeePreviousJobs)
  await db.delete(tasksTemplate)
  await db.delete(requirements)
  await db.delete(googleProfiles)
  await db.delete(employees)
  await db.delete(employeeNumberSeq)
  await db.delete(profiles)

  // ── Profiles (auth users) ─────────────────────────────────────────────────
  console.log('[seed] inserting profiles…')

  const [hrProfile] = await db.insert(profiles).values({
    email: 'hr@onboardly.dev',
    role: 'hr',
    passwordHash,
  }).returning()

  const [emp1Profile] = await db.insert(profiles).values({
    email: 'ana.reyes@onboardly.dev',
    role: 'employee',
    passwordHash,
  }).returning()

  const [emp2Profile] = await db.insert(profiles).values({
    email: 'marco.santos@onboardly.dev',
    role: 'employee',
    passwordHash,
  }).returning()

  const [emp3Profile] = await db.insert(profiles).values({
    email: 'lea.garcia@onboardly.dev',
    role: 'employee',
    passwordHash,
  }).returning()

  // ── Google Profiles ───────────────────────────────────────────────────────
  console.log('[seed] inserting google profiles…')

  const [hrGoogle] = await db.insert(googleProfiles).values({
    email: 'hr@onboardly.dev',
    firstName: 'Hannah',
    lastName: 'Rivera',
    avatarUrl: null,
    role: 'hr',
    authUserId: hrProfile.id,
  }).returning()

  const [emp1Google] = await db.insert(googleProfiles).values({
    email: 'ana.reyes@onboardly.dev',
    firstName: 'Ana',
    lastName: 'Reyes',
    avatarUrl: null,
    role: 'employee',
    authUserId: emp1Profile.id,
  }).returning()

  const [emp2Google] = await db.insert(googleProfiles).values({
    email: 'marco.santos@onboardly.dev',
    firstName: 'Marco',
    lastName: 'Santos',
    avatarUrl: null,
    role: 'employee',
    authUserId: emp2Profile.id,
  }).returning()

  const [emp3Google] = await db.insert(googleProfiles).values({
    email: 'lea.garcia@onboardly.dev',
    firstName: 'Lea',
    lastName: 'Garcia',
    avatarUrl: null,
    role: 'employee',
    authUserId: emp3Profile.id,
  }).returning()

  // suppress unused warning — hrGoogle is referenced for completeness
  void hrGoogle

  // ── Employees ─────────────────────────────────────────────────────────────
  console.log('[seed] inserting employees…')

  // Seed employee number sequence counter (year 2024 has 3 employees)
  await db.insert(employeeNumberSeq).values({ year: 2024, lastSeq: 3 })

  const [emp1] = await db.insert(employees).values({
    email: 'ana.reyes@onboardly.dev',
    firstName: 'Ana',
    lastName: 'Reyes',
    phone: '+63 912 345 6789',
    address: '123 Mabini St, Manila',
    department: 'Engineering',
    position: 'Frontend Developer',
    employeeType: 'first_time',
    startDate: '2024-03-01',
    status: 'pending',
    employeeNumber: 'ONB-2024-0001',
    companyName: 'Advanced World Solutions, Inc.',
    companyAddress: '3F Multinational Bancorporation Centre 6805 Ayala Avenue, Makati City',
    companyPhone: '+63 (2) 8889 5070',
  }).returning()

  const [emp2] = await db.insert(employees).values({
    email: 'marco.santos@onboardly.dev',
    firstName: 'Marco',
    lastName: 'Santos',
    phone: '+63 917 654 3210',
    address: '456 Rizal Ave, Quezon City',
    department: 'Sales',
    position: 'Sales Executive',
    employeeType: 'experienced',
    startDate: '2023-06-15',
    status: 'active',
    employeeNumber: 'ONB-2024-0002',
    companyName: 'Advanced World Solutions, Inc.',
    companyAddress: '5th Floor ATC BPO1 Madrigal Avenue, Alabang Town Center Ayala Alabang, Muntinlupa City',
    companyPhone: '+63 (2) 8816 7741',
  }).returning()

  const [emp3] = await db.insert(employees).values({
    email: 'lea.garcia@onboardly.dev',
    firstName: 'Lea',
    lastName: 'Garcia',
    phone: '+63 920 111 2233',
    address: '789 Bonifacio Blvd, Makati',
    department: 'HR',
    position: 'HR Coordinator',
    employeeType: 'experienced',
    startDate: '2022-01-10',
    status: 'inactive',
    employeeNumber: 'ONB-2024-0003',
    companyName: 'Advanced World Systems, Inc.',
    companyAddress: '5F PDI Condominium Archbishop Reyes Ave. cor. Panis St. Banilad, Cebu City',
    companyPhone: '+63 (32) 231 0321',
  }).returning()

  // ── Previous Jobs ─────────────────────────────────────────────────────────
  console.log('[seed] inserting previous jobs…')

  await db.insert(employeePreviousJobs).values([
    {
      employeeId: emp2.id,
      position: 'Junior Sales Rep',
      companyName: 'TechCorp PH',
      startDate: '2020-04-01',
      endDate: '2023-05-31',
      reasonForLeaving: 'Better opportunity',
    },
    {
      employeeId: emp3.id,
      position: 'HR Assistant',
      companyName: 'Global BPO Inc.',
      startDate: '2018-07-01',
      endDate: '2021-12-31',
      reasonForLeaving: 'Career growth',
    },
    {
      employeeId: emp3.id,
      position: 'HR Specialist',
      companyName: 'StartupPH',
      startDate: '2022-01-05',
      endDate: '2022-01-09',
      reasonForLeaving: 'Joined Onboardly',
    },
  ])

  // ── Requirements ──────────────────────────────────────────────────────────
  console.log('[seed] inserting requirements…')

  const [req1] = await db.insert(requirements).values({
    name: 'Government-issued ID',
    description: 'Submit a valid government-issued photo ID (passport, SSS, UMID, or PhilHealth).',
  }).returning()

  const [req2] = await db.insert(requirements).values({
    name: 'NBI Clearance',
    description: 'Submit an NBI Clearance issued within the last 6 months.',
  }).returning()

  const [req3] = await db.insert(requirements).values({
    name: 'Tax Identification Number (TIN)',
    description: 'Provide your BIR TIN or submit a TIN application form if not yet registered.',
  }).returning()

  const [req4] = await db.insert(requirements).values({
    name: 'SSS E1/ID',
    description: 'Submit your SSS E1 form (Employment Report) or SSS ID. If not yet registered, submit proof of SSS application.',
  }).returning()

  void req4

  // ── Employee Requirements ─────────────────────────────────────────────────
  console.log('[seed] inserting employee requirements…')

  // emp1 (Ana — pending employee): all requirements pending
  await db.insert(employeeRequirements).values([
    {
      employeeId: emp1Google.id,
      requirementId: req1.id,
      status: 'pending',
      dueDate: '2024-03-15',
    },
    {
      employeeId: emp1Google.id,
      requirementId: req2.id,
      status: 'pending',
      dueDate: '2024-03-15',
    },
    {
      employeeId: emp1Google.id,
      requirementId: req3.id,
      status: 'pending',
      dueDate: '2024-03-15',
    },
  ])

  // emp2 (Marco — active employee): one approved, one submitted, one pending
  await db.insert(employeeRequirements).values([
    {
      employeeId: emp2Google.id,
      requirementId: req1.id,
      status: 'approved',
      dueDate: '2023-06-30',
      submittedAt: new Date('2023-06-20T09:00:00Z'),
      reviewedAt: new Date('2023-06-22T10:30:00Z'),
      notes: 'Verified — passport copy accepted.',
    },
    {
      employeeId: emp2Google.id,
      requirementId: req2.id,
      status: 'submitted',
      dueDate: '2023-06-30',
      submittedAt: new Date('2023-06-25T14:00:00Z'),
    },
    {
      employeeId: emp2Google.id,
      requirementId: req3.id,
      status: 'rejected',
      dueDate: '2023-06-30',
      submittedAt: new Date('2023-06-18T11:00:00Z'),
      reviewedAt: new Date('2023-06-19T09:00:00Z'),
      notes: 'TIN document was illegible. Please resubmit a clearer copy.',
    },
  ])

  // emp3 (Lea — inactive employee): all approved
  await db.insert(employeeRequirements).values([
    {
      employeeId: emp3Google.id,
      requirementId: req1.id,
      status: 'approved',
      dueDate: '2022-01-20',
      submittedAt: new Date('2022-01-12T08:00:00Z'),
      reviewedAt: new Date('2022-01-14T09:00:00Z'),
    },
    {
      employeeId: emp3Google.id,
      requirementId: req2.id,
      status: 'approved',
      dueDate: '2022-01-20',
      submittedAt: new Date('2022-01-12T08:30:00Z'),
      reviewedAt: new Date('2022-01-14T09:15:00Z'),
    },
    {
      employeeId: emp3Google.id,
      requirementId: req3.id,
      status: 'approved',
      dueDate: '2022-01-20',
      submittedAt: new Date('2022-01-13T10:00:00Z'),
      reviewedAt: new Date('2022-01-14T09:30:00Z'),
    },
  ])

  // ── OCR Profiles ──────────────────────────────────────────────────────────
  console.log('[seed] inserting ocr profiles…')

  // Marco — Government ID: approved
  const [marcoReqId] = await db
    .select({ id: employeeRequirements.id })
    .from(employeeRequirements)
    .where(and(eq(employeeRequirements.employeeId, emp2Google.id), eq(employeeRequirements.requirementId, req1.id)))

  await db.insert(employeeOcrProfiles).values({
    employeeId:    emp2.id,
    requirementId: marcoReqId?.id ?? null,
    fullName:      'SANTOS, MARCO DELA CRUZ',
    dateOfBirth:   '05/14/1990',
    idNumber:      'P4812345A',
    nationality:   'Filipino',
    address:       '456 Rizal Ave, Quezon City, Metro Manila',
    expiryDate:    '05/13/2029',
    documentType:  'Passport',
    rawOcrText:    'REPUBLIC OF THE PHILIPPINES\nPASSPORT\nSurname: SANTOS\nGiven Names: MARCO DELA CRUZ\nNationality: FILIPINO\nDate of Birth: 14 MAY 1990\nPlace of Birth: QUEZON CITY\nDate of Issue: 14 MAY 2024\nDate of Expiry: 13 MAY 2029\nPassport No.: P4812345A',
    status:        'approved',
    hrNotes:       'Verified — passport copy accepted.',
    extractedAt:   new Date('2023-06-20T09:05:00Z'),
    reviewedAt:    new Date('2023-06-22T10:30:00Z'),
  })

  // Ana — Government ID: pending review
  const [anaReqId] = await db
    .select({ id: employeeRequirements.id })
    .from(employeeRequirements)
    .where(and(eq(employeeRequirements.employeeId, emp1Google.id), eq(employeeRequirements.requirementId, req1.id)))

  await db.insert(employeeOcrProfiles).values({
    employeeId:    emp1.id,
    requirementId: anaReqId?.id ?? null,
    fullName:      'REYES, ANA MARIE',
    dateOfBirth:   '08/24/1997',
    idNumber:      '04-1234567-8',
    nationality:   'Filipino',
    address:       '123 Mabini St, Ermita, Manila, Metro Manila',
    expiryDate:    '',
    documentType:  'SSS E-1',
    rawOcrText:    'SOCIAL SECURITY SYSTEM\nEMPLOYMENT REPORT (E-1)\nSS NUMBER: 04-1234567-8\nLAST NAME: REYES\nFIRST NAME: ANA MARIE\nMIDDLE NAME: SANTOS\nDATE OF BIRTH: 08/24/1997\nPLACE OF BIRTH: MANILA\nCITIZENSHIP: FILIPINO\nHOME ADDRESS: 123 MABINI ST, ERMITA, MANILA',
    status:        'pending_review',
    extractedAt:   new Date('2024-03-10T11:00:00Z'),
  })

  // Lea — NBI Clearance: approved
  const [leaReqId] = await db
    .select({ id: employeeRequirements.id })
    .from(employeeRequirements)
    .where(and(eq(employeeRequirements.employeeId, emp3Google.id), eq(employeeRequirements.requirementId, req2.id)))

  await db.insert(employeeOcrProfiles).values({
    employeeId:    emp3.id,
    requirementId: leaReqId?.id ?? null,
    fullName:      'GARCIA, LEA PATRICIA',
    dateOfBirth:   '03/15/1985',
    idNumber:      'NBI-2022-00123456',
    nationality:   'Filipino',
    address:       '789 Bonifacio Blvd, Makati City',
    expiryDate:    '01/14/2023',
    documentType:  'NBI Clearance',
    rawOcrText:    'NATIONAL BUREAU OF INVESTIGATION\nNBI CLEARANCE\nNBI ID NO: NBI-2022-00123456\nNAME: GARCIA, LEA PATRICIA\nDATE OF BIRTH: MARCH 15, 1985\nPLACE OF BIRTH: CEBU CITY\nADDRESS: 789 BONIFACIO BLVD, MAKATI CITY\nVALID UNTIL: JANUARY 14, 2023\nPURPOSE: EMPLOYMENT',
    status:        'approved',
    extractedAt:   new Date('2022-01-12T08:35:00Z'),
    reviewedAt:    new Date('2022-01-14T09:15:00Z'),
  })

  // ── Task Templates ────────────────────────────────────────────────────────
  console.log('[seed] inserting task templates…')

  const [task1] = await db.insert(tasksTemplate).values({
    title: 'Complete HR Orientation',
    description: 'Attend the HR orientation session and sign the attendance sheet.',
    requirementsId: null,
    responsibleDept: 'HR',
  }).returning()

  const [task2] = await db.insert(tasksTemplate).values({
    title: 'Submit Pre-Employment Requirements',
    description: 'Upload all required pre-employment documents through the employee portal.',
    requirementsId: req1.id,
    responsibleDept: 'HR',
  }).returning()

  // ── Employee Tasks ────────────────────────────────────────────────────────
  console.log('[seed] inserting employee tasks…')

  // Ana (pending) — both tasks pending
  await db.insert(employeeTasks).values([
    { employeeId: emp1.id, templateId: task1.id, status: 'Pending' },
    { employeeId: emp1.id, templateId: task2.id, status: 'Pending' },
  ])

  // Marco (active) — one completed, one pending
  await db.insert(employeeTasks).values([
    { employeeId: emp2.id, templateId: task1.id, status: 'Completed' },
    { employeeId: emp2.id, templateId: task2.id, status: 'Pending' },
  ])

  // Lea (inactive) — both completed
  await db.insert(employeeTasks).values([
    { employeeId: emp3.id, templateId: task1.id, status: 'Completed' },
    { employeeId: emp3.id, templateId: task2.id, status: 'Completed' },
  ])

  // ── Employee ID Cards ─────────────────────────────────────────────────────
  // Only active employees get an issued card; pending/inactive do not.
  console.log('[seed] inserting employee id cards…')

  await db.insert(employeeIdCards).values([
    {
      employeeId: emp2.id,
      cardNumber:  'ONB-2024-0002',
      status:      'active',
      issuedAt:    '2024-01-15',
      expiresAt:   '2026-01-15',
    },
  ])

  console.log('[seed] done ✓')
  console.log('  HR login  →  hr@onboardly.dev  /  password123')
  console.log('  Employees →  ana.reyes@onboardly.dev  (pending)  ONB-2024-0001')
  console.log('             marco.santos@onboardly.dev  (active)   ONB-2024-0002  [card issued]')
  console.log('             lea.garcia@onboardly.dev    (inactive) ONB-2024-0003')
}

seed()
  .catch((err) => {
    console.error('[seed] error:', err)
    process.exit(1)
  })
  .finally(() => pool.end())
