import type {
  Department,
  EmployeeStatus,
  EmployeeType,
  IdCardStatus,
  RequirementStatus,
  TaskStatus,
  UserRole,
} from './enums'

export interface Profile {
  id: string
  email: string
  role: UserRole
  passwordHash?: string
}

export interface GoogleProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: UserRole
  authUserId: string
}

export interface Employee {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  address?: string
  homeAddress?: string
  sssNumber?: string
  tinNumber?: string
  bloodType?: string
  emergencyContactName?: string
  emergencyContactNumber?: string
  emergencyContactAddress?: string
  department: Department
  position: string
  employeeType: EmployeeType
  startDate: string        // ISO date string YYYY-MM-DD
  status: EmployeeStatus
  employeeNumber: string   // e.g. ONB-2026-0001
  createdAt: string        // ISO timestamptz string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  // Enrichment fields (joined, optional)
  googleProfile?: Pick<GoogleProfile, 'firstName' | 'lastName' | 'avatarUrl' | 'email'>
  requirementsSummary?: RequirementsSummary
}

export interface RequirementsSummary {
  total: number
  submitted: number
  approved: number
  overdue: number
}

export interface EmployeePreviousJob {
  id: string
  employeeId: string
  position: string
  companyName: string
  startDate: string        // ISO date string
  endDate?: string         // ISO date string
  reasonForLeaving?: string
}

export interface Requirement {
  id: string
  name: string
  description?: string
}

export interface EmployeeRequirement {
  id: string
  employeeId: string       // references google_profiles.id
  requirementId: string
  status: RequirementStatus
  dueDate?: string         // ISO date string
  fileUrl?: string
  submittedAt?: string     // ISO timestamptz
  reviewedAt?: string      // ISO timestamptz
  notes?: string
  // Joined field
  requirement?: Pick<Requirement, 'name' | 'description'>
}

export interface TaskTemplate {
  id: string
  title: string
  description?: string
  requirementsId?: string
  responsibleDept?: string
}

export interface EmployeeTask {
  id: string
  employeeId: string
  templateId: string
  status: TaskStatus
  createdAt: string        // ISO timestamptz
  // Joined field
  template?: Pick<TaskTemplate, 'title' | 'description'>
}

// Auth token payload shape (decoded from JWT)
export interface JwtPayload {
  id: string
  email: string
  role: UserRole
}

// HR Dashboard aggregate response
export interface HRDashboardResponse {
  stats: {
    totalEmployees: number
    pendingEmployees: number
    activeEmployees: number
    pendingTasks: number
    completedTasks: number
    submittedRequirements: number
  }
  recentEmployees: Employee[]
  pendingTaskEmployees: Employee[]
  pendingRequirementEmployees: Employee[]
  requirementReviewQueue: EmployeeRequirement[]
}

// Employee Dashboard aggregate response
export interface EmployeeDashboardResponse {
  status: EmployeeStatus
  pendingTasks: number
  completedTasks: number
  pendingRequirements: number
}

export interface EmployeeOcrProfile {
  id: string
  employeeId: string
  requirementId?: string
  fullName?: string
  dateOfBirth?: string
  idNumber?: string
  nationality?: string
  address?: string
  expiryDate?: string
  documentType?: string
  rawOcrText?: string
  status: 'pending_review' | 'approved' | 'rejected'
  hrNotes?: string
  extractedAt: string
  reviewedAt?: string
}

// Module 2 stub shape
export interface EmployeeDocument {
  id: string
  employeeId: string
  fileName: string
  fileUrl: string
  uploadedAt: string
}

export interface EmployeeIdCard {
  id: string
  employeeId: string       // references employees.id
  cardNumber: string       // equals employee.employeeNumber, e.g. ONB-2026-0001
  status: IdCardStatus
  issuedAt: string         // ISO date string YYYY-MM-DD
  expiresAt?: string       // ISO date string YYYY-MM-DD
  // Joined enrichment (optional)
  employee?: Pick<Employee, 'firstName' | 'lastName' | 'department' | 'position' | 'employeeNumber' | 'companyName' | 'companyAddress' | 'companyPhone' | 'homeAddress' | 'sssNumber' | 'tinNumber' | 'startDate' | 'bloodType' | 'emergencyContactName' | 'emergencyContactNumber' | 'emergencyContactAddress'> & {
    avatarUrl?: string
  }
}
