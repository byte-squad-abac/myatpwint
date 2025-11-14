'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // First check if email already exists in profiles table
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('email, id')
        .eq('email', formData.email)
        .limit(1)

      if (existingProfiles && existingProfiles.length > 0) {
        throw new Error('This email address is already registered. Please use the login page instead.')
      }

      const base =
        process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ||
        (typeof window !== 'undefined' ? window.location.origin : undefined);

      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: base ? `${base}/login` : undefined,
          data: { name: formData.name }
        }
      });


      if (authError) throw authError

      if (data.user) {
        setSuccess(true)
      } else {
        throw new Error('Registration failed. Please try again.')
      }
    } catch (error: unknown) {
      let errorMessage = 'An error occurred during registration'
      
      if (error instanceof Error) {
        // Handle specific Supabase auth errors with user-friendly messages
        if (error.message.includes('User already registered') || 
            error.message.includes('already registered') ||
            error.message.includes('email address is already registered')) {
          errorMessage = 'This email address is already registered. Please use the login page instead.'
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.'
        } else if (error.message.includes('weak password') || error.message.includes('password')) {
          errorMessage = 'Password is too weak. Please choose a stronger password with at least 6 characters.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Join MyatPwint
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account and start reading amazing books
          </p>
        </div>
        
        {success ? (
          <div className="mt-8 text-center">
            <div className="bg-green-50 border border-green-200 rounded-md p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-green-800 mb-2">
                Check Your Email!
              </h3>
              <p className="text-green-700 mb-4">
                We&apos;ve sent a verification link to <strong>{formData.email}</strong>
              </p>
              <p className="text-sm text-green-600 mb-6">
                Click the verification link in your email to activate your account and complete the registration process.
              </p>
              <div className="space-y-3">
                <Link 
                  href="/login"
                  className="inline-block bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 font-medium"
                >
                  Go to Login
                </Link>
                <p className="text-xs text-green-600">
                  Didn&apos;t receive the email? Check your spam folder or try registering again.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleRegister}>
            <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your password (min 6 characters)"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Want to be an author?</strong> After creating your account, you can apply to become an author through our author application process in your profile.
              </p>
            </div>

          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p>{error}</p>
              {error.includes('already registered') && (
                <div className="mt-2">
                  <Link 
                    href="/login" 
                    className="text-red-800 hover:text-red-900 font-medium underline"
                  >
                    Go to Login Page →
                  </Link>
                </div>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <Link 
              href="/login" 
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              Already have an account? Sign in
            </Link>
          </div>
          </form>
        )}
      </div>
    </div>
  )
}