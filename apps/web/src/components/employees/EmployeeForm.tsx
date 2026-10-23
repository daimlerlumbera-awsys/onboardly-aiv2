import { useState, FormEvent } from 'react'
import { company_info } from '../../database/company_info'

// ── Constants ──────────────────────────────────────────────────────────────

const DEPARTMENTS = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations'] as const
const EMPLOYEE_TYPES = [
  { value: 'first_time',  label: 'First-time employee' },
  { value: 'experienced', label: 'Experienced' },
] as const

const COMPANY_NAMES = Array.from(new Set(company_info.map(c => c.name)))

const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX  = /^[0-9+\-\s()]{7,20}$/
const MIN_YEAR     = 2000

// ── Types ──────────────────────────────────────────────────────────────────

export interface EmployeeFormValues {
  firstName:               string
  lastName:                string
  email:                   string
  phone:                   string
  address:                 string
  department:              string
  position:                string
  employeeType:            string
  startDate:               string
  companyName:             string
  companyAddress:          string
  companyPhone:            string
  bloodType:               string
  emergencyContactName:    string
  emergencyContactNumber:  string
  emergencyContactAddress: string
}

interface EmployeeFormErrors {
  firstName?:    string
  lastName?:     string
  email?:        string
  phone?:        string
  department?:   string
  position?:     string
  employeeType?: string
  startDate?:    string
}

interface EmployeeFormProps {
  /** Pre-filled values when editing an existing employee */
  initialValues?: Partial<EmployeeFormValues>
  submitLabel?:   string
  submitting?:    boolean
  /** Set to surface a 409 duplicate-email error inline on the email field */
  emailConflict?: boolean
  onSubmit:       (values: EmployeeFormValues) => void
  onCancel:       () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function validateField(field: keyof EmployeeFormValues, value: string): string {
  switch (field) {
    case 'firstName':
      return value.trim().length >= 2 ? '' : 'First name must be at least 2 characters.'
    case 'lastName':
      return value.trim().length >= 2 ? '' : 'Last name must be at least 2 characters.'
    case 'email':
      if (!value.trim()) return 'Email is required.'
      return EMAIL_REGEX.test(value.trim()) ? '' : 'Enter a valid email address.'
    case 'phone':
      return !value || PHONE_REGEX.test(value.trim()) ? '' : 'Enter a valid phone number (7–20 digits).'
    case 'department':
      return value ? '' : 'Department is required.'
    case 'position':
      return value.trim().length >= 2 ? '' : 'Position is required (min 2 characters).'
    case 'employeeType':
      return value ? '' : 'Employee type is required.'
    case 'startDate': {
      if (!value) return 'Start date is required.'
      const year = new Date(value).getFullYear()
      return year >= MIN_YEAR ? '' : `Start date looks incorrect — check the year (${year}).`
    }
    default:
      return ''
  }
}

function validateAll(values: EmployeeFormValues): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {}
  const fields: Array<keyof EmployeeFormValues> = [
    'firstName', 'lastName', 'email', 'phone', 'department', 'position', 'employeeType', 'startDate',
  ]
  for (const field of fields) {
    const msg = validateField(field, values[field])
    if (msg) errors[field as keyof EmployeeFormErrors] = msg
  }
  return errors
}

// ── Shared input style helpers ─────────────────────────────────────────────

function inputClass(error?: string) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
    error
      ? 'border-red-400 focus:ring-red-300 bg-red-50'
      : 'border-neutral-300 focus:ring-brand-400 bg-white'
  }`
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-600">{msg}</p>
}

function Label({ htmlFor, required, children }: { htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-700 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EmployeeForm({
  initialValues = {},
  submitLabel   = 'Save',
  submitting    = false,
  emailConflict = false,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const [values, setValues] = useState<EmployeeFormValues>({
    firstName:               initialValues.firstName               ?? '',
    lastName:                initialValues.lastName                ?? '',
    email:                   initialValues.email                   ?? '',
    phone:                   initialValues.phone                   ?? '',
    address:                 initialValues.address                 ?? '',
    department:              initialValues.department              ?? '',
    position:                initialValues.position                ?? '',
    employeeType:            initialValues.employeeType            ?? '',
    startDate:               initialValues.startDate               ?? '',
    companyName:             initialValues.companyName             ?? '',
    companyAddress:          initialValues.companyAddress          ?? '',
    companyPhone:            initialValues.companyPhone            ?? '',
    bloodType:               initialValues.bloodType               ?? '',
    emergencyContactName:    initialValues.emergencyContactName    ?? '',
    emergencyContactNumber:  initialValues.emergencyContactNumber  ?? '',
    emergencyContactAddress: initialValues.emergencyContactAddress ?? '',
  })

  // Derived: city options for selected company name
  const cityOptions = company_info.filter(c => c.name === values.companyName)

  const [errors, setErrors] = useState<EmployeeFormErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())

  function handleChange(field: keyof EmployeeFormValues, value: string) {
    setValues(v => ({ ...v, [field]: value }))
    if (touched.has(field)) {
      setErrors(e => ({ ...e, [field]: validateField(field, value) }))
    }
  }

  function handleBlur(field: keyof EmployeeFormValues) {
    setTouched(t => new Set(t).add(field))
    setErrors(e => ({ ...e, [field]: validateField(field, values[field]) }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validateAll(values)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setTouched(new Set(Object.keys(values)))
      return
    }
    onSubmit(values)
  }

  // Merge in the 409 email conflict error from parent
  const emailError = emailConflict ? 'An employee with this email already exists.' : errors.email

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Row 1: First / Last name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" required>First Name</Label>
          <input id="firstName" type="text" className={inputClass(errors.firstName)}
            value={values.firstName}
            onChange={e => handleChange('firstName', e.target.value)}
            onBlur={() => handleBlur('firstName')}
          />
          <FieldError msg={errors.firstName} />
        </div>
        <div>
          <Label htmlFor="lastName" required>Last Name</Label>
          <input id="lastName" type="text" className={inputClass(errors.lastName)}
            value={values.lastName}
            onChange={e => handleChange('lastName', e.target.value)}
            onBlur={() => handleBlur('lastName')}
          />
          <FieldError msg={errors.lastName} />
        </div>
      </div>

      {/* Row 2: Email / Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email" required>Email</Label>
          <input id="email" type="email" className={inputClass(emailError)}
            value={values.email}
            onChange={e => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
          />
          <FieldError msg={emailError} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <input id="phone" type="tel" className={inputClass(errors.phone)}
            value={values.phone}
            onChange={e => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
          />
          <FieldError msg={errors.phone} />
        </div>
      </div>

      {/* Row 3: Address (full width) */}
      <div>
        <Label htmlFor="address">Address</Label>
        <input id="address" type="text" className={inputClass()}
          value={values.address}
          onChange={e => handleChange('address', e.target.value)}
        />
      </div>

      {/* Row 3b: Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyName">Company</Label>
          <select id="companyName" className={inputClass()}
            value={values.companyName}
            onChange={e => {
              const name = e.target.value
              // reset city when company changes
              const first = company_info.find(c => c.name === name)
              setValues(v => ({
                ...v,
                companyName:    name,
                companyAddress: first?.address ?? '',
                companyPhone:   first?.tel_no  ?? '',
              }))
            }}
          >
            <option value="">— Select company —</option>
            {COMPANY_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="companyCity">City</Label>
          <select id="companyCity" className={inputClass()}
            value={values.companyAddress}
            disabled={!values.companyName}
            onChange={e => {
              const addr = e.target.value
              const match = company_info.find(c => c.name === values.companyName && c.address === addr)
              setValues(v => ({
                ...v,
                companyAddress: addr,
                companyPhone:   match?.tel_no ?? v.companyPhone,
              }))
            }}
          >
            <option value="">— Select city —</option>
            {cityOptions.map(c => (
              <option key={c.city} value={c.address}>{c.city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 4: Department / Position */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department" required>Department</Label>
          <select id="department" className={inputClass(errors.department)}
            value={values.department}
            onChange={e => handleChange('department', e.target.value)}
            onBlur={() => handleBlur('department')}
          >
            <option value="" disabled>Select department</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <FieldError msg={errors.department} />
        </div>
        <div>
          <Label htmlFor="position" required>Position</Label>
          <input id="position" type="text" className={inputClass(errors.position)}
            value={values.position}
            onChange={e => handleChange('position', e.target.value)}
            onBlur={() => handleBlur('position')}
          />
          <FieldError msg={errors.position} />
        </div>
      </div>

      {/* Row 5: Employee Type / Start Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="employeeType" required>Employee Type</Label>
          <select id="employeeType" className={inputClass(errors.employeeType)}
            value={values.employeeType}
            onChange={e => handleChange('employeeType', e.target.value)}
            onBlur={() => handleBlur('employeeType')}
          >
            <option value="" disabled>Select type</option>
            {EMPLOYEE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <FieldError msg={errors.employeeType} />
        </div>
        <div>
          <Label htmlFor="startDate" required>Start Date</Label>
          <input id="startDate" type="date" className={inputClass(errors.startDate)}
            value={values.startDate}
            onChange={e => handleChange('startDate', e.target.value)}
            onBlur={() => handleBlur('startDate')}
          />
          <FieldError msg={errors.startDate} />
        </div>
      </div>

      {/* Row 6: Blood Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bloodType">Blood Type</Label>
          <input id="bloodType" type="text" className={inputClass()}
            placeholder="e.g. O+"
            value={values.bloodType}
            onChange={e => handleChange('bloodType', e.target.value)}
          />
        </div>
      </div>

      {/* Row 7: Emergency Contact */}
      <div>
        <p className="text-sm font-medium text-neutral-700 mb-2">Emergency Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergencyContactName">Name</Label>
            <input id="emergencyContactName" type="text" className={inputClass()}
              value={values.emergencyContactName}
              onChange={e => handleChange('emergencyContactName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactNumber">Contact Number</Label>
            <input id="emergencyContactNumber" type="tel" className={inputClass()}
              value={values.emergencyContactNumber}
              onChange={e => handleChange('emergencyContactNumber', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="emergencyContactAddress">Address</Label>
          <input id="emergencyContactAddress" type="text" className={inputClass()}
            value={values.emergencyContactAddress}
            onChange={e => handleChange('emergencyContactAddress', e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
        >
          {submitting && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
