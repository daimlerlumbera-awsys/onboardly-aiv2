import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import EmployeeForm, { type EmployeeFormValues } from '../components/employees/EmployeeForm'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

async function createEmployee(values: EmployeeFormValues) {
  const { data } = await axios.post(`${API_BASE}/api/employees`, values)
  return data
}

export default function EmployeeAddPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const [emailConflict, setEmailConflict] = useState(false)
  const [serverError,   setServerError]   = useState('')

  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate('/employees')
    },
    onError: (err: AxiosError<{ error?: string }>) => {
      if (err.response?.status === 409) {
        // Duplicate email — surface inline on the email field
        setEmailConflict(true)
        setServerError('')
      } else {
        setEmailConflict(false)
        setServerError(
          err.response?.data?.error ?? 'Something went wrong. Please try again.'
        )
      }
    },
  })

  function handleSubmit(values: EmployeeFormValues) {
    setEmailConflict(false)
    setServerError('')
    mutation.mutate(values)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Add Employee</h1>
        <p className="text-sm text-neutral-500 mt-1">Fill in the details below to onboard a new employee.</p>
      </div>

      {/* Generic server error */}
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {serverError}
        </div>
      )}

      {/* Form card */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
        <EmployeeForm
          submitLabel="Add Employee"
          submitting={mutation.isPending}
          emailConflict={emailConflict}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/employees')}
        />
      </div>
    </div>
  )
}
