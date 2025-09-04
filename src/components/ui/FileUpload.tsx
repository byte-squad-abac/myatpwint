'use client'

import React, { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  label?: string
  accept?: string
  maxSize?: number // in bytes
  error?: string
  helperText?: string
  onFileSelect?: (file: File) => void
  onFileRemove?: () => void
  value?: File | null
  disabled?: boolean
  className?: string
}

export default function FileUpload({
  label,
  accept = 'image/*,application/pdf',
  maxSize = 5 * 1024 * 1024, // 5MB default
  error,
  helperText,
  onFileSelect,
  onFileRemove,
  value,
  disabled,
  className
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [localError, setLocalError] = useState<string>('')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `File size must be less than ${(maxSize / (1024 * 1024)).toFixed(1)}MB`
    }
    
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase())
        }
        return file.type.match(new RegExp(type.replace('*', '.*')))
      })
      
      if (!isAccepted) {
        return 'File type not supported'
      }
    }
    
    return null
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setLocalError('')

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      const validationError = validateFile(file)
      if (validationError) {
        setLocalError(validationError)
        return
      }
      onFileSelect?.(file)
    }
  }, [disabled, onFileSelect, maxSize, accept])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError('')
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      const validationError = validateFile(file)
      if (validationError) {
        setLocalError(validationError)
        return
      }
      onFileSelect?.(file)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const displayError = error || localError

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          dragActive && !disabled 
            ? 'border-blue-400 bg-blue-50' 
            : displayError
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleFileSelect}
          accept={accept}
          disabled={disabled}
        />
        
        {value ? (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">{value.name}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{formatFileSize(value.size)}</p>
            {!disabled && (
              <button
                type="button"
                onClick={onFileRemove}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Remove file
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              {accept.includes('image') && accept.includes('pdf') ? 'Images or PDF files' : accept}
              {maxSize && ` (max ${(maxSize / (1024 * 1024)).toFixed(1)}MB)`}
            </p>
          </div>
        )}
      </div>
      
      {displayError && (
        <p className="mt-1 text-sm text-red-600">{displayError}</p>
      )}
      {helperText && !displayError && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}