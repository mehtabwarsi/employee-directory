import { useEffect, useMemo, useState, type FormEvent } from 'react'
import axios from 'axios'
import { api, type Employee } from './api/api'

const emptyForm = { name: '', email: '', role: '' }

const avatarColors = [
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
  'bg-lime-100 text-lime-800',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function Avatar({ employee }: { employee: Employee }) {
  const color = avatarColors[Math.abs(Number(employee.id) || 0) % avatarColors.length]
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${color}`}
    >
      {initials(employee.name)}
    </span>
  )
}

/* ---------- small inline icons (no extra dependency) ---------- */
const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const PencilIcon = () => (
  <svg {...iconProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
  </svg>
)
const SearchIcon = () => (
  <svg {...iconProps}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)
const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const UsersIcon = () => (
  <svg {...iconProps} width={28} height={28}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="10" cy="7" r="4" />
    <path d="M21 21v-2a4 4 0 0 0-3-3.9" />
    <path d="M16 3.1a4 4 0 0 1 0 7.8" />
  </svg>
)

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15'

function App() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function fetchEmployees() {
    setLoading(true)
    setError('')

    try {
      const response = await api.get<Employee[]>('/employees')
      setEmployees(response.data)
    } catch {
      setError('Could not load employees. Check that your backend API is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Auto-dismiss success messages
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [message])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)

    try {
      if (editingId !== null) {
        const response = await api.put<Employee>(`/employees/${editingId}`, form)

        setEmployees((previous) =>
          previous.map((employee) =>
            employee.id === editingId ? response.data : employee
          )
        )
        setMessage('Employee updated.')
      } else {
        const response = await api.post<Employee>('/employees', form)

        setEmployees((previous) => [response.data, ...previous])
        setMessage('Employee added.')
      }

      resetForm()
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ||
              'Unable to save employee. Check your API.'
          : 'Something went wrong.'
      )
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(employee: Employee) {
    setEditingId(employee.id)
    setForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
    })
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return
    }

    setError('')
    setMessage('')

    try {
      await api.delete(`/employees/${id}`)
      setEmployees((previous) =>
        previous.filter((employee) => employee.id !== id)
      )

      if (editingId === id) resetForm()

      setMessage('Employee deleted.')
    } catch {
      setError('Unable to delete employee. Please try again.')
    }
  }

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return employees
    return employees.filter((employee) =>
      [employee.name, employee.email, employee.role].some((value) =>
        value.toLowerCase().includes(query)
      )
    )
  }, [employees, search])

  const isEditing = editingId !== null

  const rowActionBase =
    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4'

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 antialiased">
      {/* ---------- Header ---------- */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
              Employee directory
            </h1>
            <p className="mt-0.5 text-sm text-stone-500">
              Add, update and find the people on your team.
            </p>
          </div>

          <div className="flex shrink-0 items-baseline gap-2 rounded-full bg-stone-900 px-4 py-2 text-white">
            <span className="text-lg font-semibold leading-none sm:text-xl">
              {loading ? '–' : employees.length}
            </span>
            <span className="text-xs text-stone-300">
              {employees.length === 1 ? 'employee' : 'employees'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* ---------- Alerts ---------- */}
        <div className="space-y-3 empty:hidden" aria-live="polite">
          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="-m-1 rounded p-1 text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <CloseIcon />
              </button>
            </div>
          )}

          {message && (
            <div
              role="status"
              className="flex items-start justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"
            >
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setMessage('')}
                aria-label="Dismiss message"
                className="-m-1 rounded p-1 text-teal-700 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <CloseIcon />
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid items-start gap-6 first:mt-0 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-8">
          {/* ---------- Form ---------- */}
          <section
            aria-labelledby="form-title"
            className={`rounded-2xl border bg-white p-5 sm:p-6 lg:sticky lg:top-6 ${
              isEditing
                ? 'border-teal-600 ring-4 ring-teal-600/10'
                : 'border-stone-200'
            }`}
          >
            <h2 id="form-title" className="text-lg font-semibold text-stone-900">
              {isEditing ? 'Edit employee' : 'Add employee'}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {isEditing
                ? 'Change the details below, then save.'
                : 'Fill in the details to add someone to the directory.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-stone-700">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  autoComplete="name"
                  required
                  maxLength={100}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="rahul@example.com"
                  autoComplete="email"
                  required
                  maxLength={254}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-stone-700">
                  Job role
                </label>
                <input
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  placeholder="e.g. Frontend developer"
                  required
                  maxLength={100}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row lg:flex-col-reverse xl:flex-row">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm()
                      setError('')
                      setMessage('')
                    }}
                    className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/30"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? 'Saving…'
                    : isEditing
                      ? 'Save changes'
                      : 'Add employee'}
                </button>
              </div>
            </form>
          </section>

          {/* ---------- List ---------- */}
          <section
            aria-labelledby="list-title"
            className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white"
          >
            <div className="flex flex-col gap-4 border-b border-stone-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 id="list-title" className="text-lg font-semibold text-stone-900">
                  Team members
                </h2>
                <p className="mt-0.5 text-sm text-stone-500">
                  {loading
                    ? 'Loading…'
                    : search.trim()
                      ? `${filteredEmployees.length} of ${employees.length} shown`
                      : `${employees.length} in total`}
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email or role"
                  aria-label="Search employees"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <ul className="divide-y divide-stone-100" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <span className="h-10 w-10 shrink-0 rounded-full bg-stone-200 motion-safe:animate-pulse" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-3 w-1/3 rounded bg-stone-200 motion-safe:animate-pulse" />
                      <span className="block h-3 w-1/2 rounded bg-stone-100 motion-safe:animate-pulse" />
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Empty state */}
            {!loading && filteredEmployees.length === 0 && (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                  <UsersIcon />
                </span>
                <p className="mt-4 font-medium text-stone-900">
                  {employees.length === 0
                    ? 'No employees yet'
                    : 'No matches found'}
                </p>
                <p className="mt-1 max-w-xs text-sm text-stone-500">
                  {employees.length === 0
                    ? 'Use the form to add your first team member.'
                    : 'Try a different name, email or role.'}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="mt-4 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-400/30"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* Mobile: stacked list */}
            {!loading && filteredEmployees.length > 0 && (
              <ul className="divide-y divide-stone-100 md:hidden">
                {filteredEmployees.map((employee) => (
                  <li key={employee.id} className="p-4 sm:px-6">
                    <div className="flex items-start gap-3">
                      <Avatar employee={employee} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-stone-900">
                          {employee.name}
                        </p>
                        <p className="truncate text-sm text-stone-500">
                          {employee.email}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                          {employee.role}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(employee)}
                        aria-label={`Edit ${employee.name}`}
                        className={`${rowActionBase} justify-center border-stone-300 text-stone-700 hover:bg-stone-50 focus-visible:ring-stone-400/30`}
                      >
                        <PencilIcon /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(employee.id)}
                        aria-label={`Delete ${employee.name}`}
                        className={`${rowActionBase} justify-center border-rose-200 text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-400/30`}
                      >
                        <TrashIcon /> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Tablet and up: table */}
            {!loading && filteredEmployees.length > 0 && (
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-stone-500">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Employee
                      </th>
                      <th scope="col" className="hidden px-6 py-3 font-medium xl:table-cell">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 font-medium">
                        Job role
                      </th>
                      <th scope="col" className="px-6 py-3 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {filteredEmployees.map((employee) => (
                      <tr
                        key={employee.id}
                        className={`transition-colors hover:bg-stone-50 ${
                          editingId === employee.id ? 'bg-teal-50/60' : ''
                        }`}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar employee={employee} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-stone-900">
                                {employee.name}
                              </p>
                              {/* Email shown under the name until there's room for its own column */}
                              <p className="max-w-[14rem] truncate text-stone-500 xl:hidden">
                                {employee.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-6 py-3.5 text-stone-600 xl:table-cell">
                          {employee.email}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                            {employee.role}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(employee)}
                              aria-label={`Edit ${employee.name}`}
                              className={`${rowActionBase} border-stone-300 text-stone-700 hover:bg-stone-100 focus-visible:ring-stone-400/30`}
                            >
                              <PencilIcon />
                              <span className="hidden lg:inline">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(employee.id)}
                              aria-label={`Delete ${employee.name}`}
                              className={`${rowActionBase} border-rose-200 text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-400/30`}
                            >
                              <TrashIcon />
                              <span className="hidden lg:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default App