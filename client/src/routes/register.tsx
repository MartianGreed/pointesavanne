import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  firstname: string
  lastname: string
  phoneNumber: string
}

function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>()
  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    setError(null)

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstname: data.firstname,
        lastname: data.lastname,
        phoneNumber: data.phoneNumber,
      })
      navigate({ to: '/bookings' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl text-luxury-900 mb-3">Create Account</h1>
          <p className="text-luxury-500">Join us for an exceptional experience</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-luxury-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="John"
                {...register('firstname', { required: 'First name is required' })}
              />
              {errors.firstname && (
                <p className="mt-1 text-sm text-red-600">{errors.firstname.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-luxury-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Doe"
                {...register('lastname', { required: 'Last name is required' })}
              />
              {errors.lastname && (
                <p className="mt-1 text-sm text-red-600">{errors.lastname.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-luxury-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="your@email.com"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-luxury-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              className="input-field"
              placeholder="+33 6 12 34 56 78"
              {...register('phoneNumber', {
                required: 'Phone number is required',
                pattern: {
                  value: /^(\+33|0)[1-9](\s?\d{2}){4}$/,
                  message: 'Please enter a valid French phone number',
                },
              })}
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-luxury-700 mb-2">
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-luxury-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-8 text-luxury-500">
          Already have an account?{' '}
          <Link to="/login" className="text-luxury-900 hover:text-gold-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
