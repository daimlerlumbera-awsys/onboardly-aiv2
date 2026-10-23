import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  id:           uuid('id').defaultRandom().primaryKey(),
  email:        text('email').notNull().unique(),
  role:         text('role').notNull().default('employee'),
  passwordHash: text('password_hash'),
})

export const googleProfiles = pgTable('google_profiles', {
  id:         uuid('id').defaultRandom().primaryKey(),
  email:      text('email').notNull().unique(),
  firstName:  text('first_name').notNull(),
  lastName:   text('last_name').notNull(),
  avatarUrl:  text('avatar_url'),
  role:       text('role').notNull().default('employee'),
  authUserId: uuid('auth_user_id').references(() => profiles.id),
})

// Counter table for race-safe employee_number generation per year
export const employeeNumberSeq = pgTable('employee_number_seq', {
  year:    integer('year').notNull().primaryKey(),
  lastSeq: integer('last_seq').notNull().default(0),
})

export const employees = pgTable('employees', {
  id:             uuid('id').defaultRandom().primaryKey(),
  email:          text('email').notNull().unique(),
  firstName:      text('first_name').notNull(),
  lastName:       text('last_name').notNull(),
  phone:          text('phone'),
  address:        text('address'),
  homeAddress:    text('home_address'),
  sssNumber:      text('sss_number'),
  tinNumber:      text('tin_number'),
  bloodType:                  text('blood_type'),
  emergencyContactName:       text('emergency_contact_name'),
  emergencyContactNumber:     text('emergency_contact_number'),
  emergencyContactAddress:    text('emergency_contact_address'),
  department:     text('department').notNull(),
  position:       text('position').notNull(),
  employeeType:   text('employee_type').notNull(),
  startDate:      date('start_date').notNull(),
  status:         text('status').notNull().default('pending'),
  employeeNumber: text('employee_number').notNull().unique(),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  companyName:    text('company_name'),
  companyAddress: text('company_address'),
  companyPhone:   text('company_phone'),
})

export const employeePreviousJobs = pgTable('employee_previous_jobs', {
  id:               uuid('id').defaultRandom().primaryKey(),
  employeeId:       uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  position:         text('position').notNull(),
  companyName:      text('company_name').notNull(),
  startDate:        date('start_date').notNull(),
  endDate:          date('end_date'),
  reasonForLeaving: text('reason_for_leaving'),
})

export const requirements = pgTable('requirements', {
  id:          uuid('id').defaultRandom().primaryKey(),
  name:        text('name').notNull(),
  description: text('description'),
})

export const employeeRequirements = pgTable('employee_requirements', {
  id:            uuid('id').defaultRandom().primaryKey(),
  employeeId:    uuid('employee_id').notNull().references(() => googleProfiles.id),
  requirementId: uuid('requirement_id').notNull().references(() => requirements.id),
  status:        text('status').notNull().default('pending'),
  dueDate:       date('due_date'),
  fileUrl:       text('file_url'),
  submittedAt:   timestamp('submitted_at', { withTimezone: true }),
  reviewedAt:    timestamp('reviewed_at', { withTimezone: true }),
  notes:         text('notes'),
})

export const tasksTemplate = pgTable('tasks_template', {
  id:              uuid('id').defaultRandom().primaryKey(),
  title:           text('title').notNull(),
  description:     text('description'),
  requirementsId:  uuid('requirements_id').references(() => requirements.id),
  responsibleDept: text('responsible_dept'),
})

export const employeeTasks = pgTable('employee_tasks', {
  id:         uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => tasksTemplate.id),
  status:     text('status').notNull().default('Pending'),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const employeeOcrProfiles = pgTable('employee_ocr_profiles', {
  id:            uuid('id').defaultRandom().primaryKey(),
  employeeId:    uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  requirementId: uuid('requirement_id').references(() => employeeRequirements.id, { onDelete: 'set null' }),
  fullName:      text('full_name'),
  dateOfBirth:   text('date_of_birth'),
  idNumber:      text('id_number'),
  nationality:   text('nationality'),
  address:       text('address'),
  expiryDate:    text('expiry_date'),
  documentType:  text('document_type'),
  rawOcrText:    text('raw_ocr_text'),
  status:        text('status').notNull().default('pending_review'),
  hrNotes:       text('hr_notes'),
  extractedAt:   timestamp('extracted_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt:    timestamp('reviewed_at', { withTimezone: true }),
})

export const employeeIdCards = pgTable('employee_id_cards', {
  id:         uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  cardNumber: text('card_number').notNull(),
  status:     text('status').notNull().default('active'),
  issuedAt:   date('issued_at').notNull(),
  expiresAt:  date('expires_at'),
}, (t) => ({
  employeeIdUnique: uniqueIndex('employee_id_cards_employee_id_unique').on(t.employeeId),
}))
