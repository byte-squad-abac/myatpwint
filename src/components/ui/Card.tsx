// React
import React from 'react'

// Types
import type { CardProps } from '@/types'

// Utilities
import { cn } from '@/lib/utils'

export default function Card({ children, className, ...props }: CardProps) {
  return (
    <div 
      className={cn('bg-white rounded-lg shadow-sm border border-slate-200 p-6', className)} 
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div 
      className={cn('pb-4 mb-4 border-b border-slate-200', className)} 
      {...props}
    >
      {children}
    </div>
  )
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div 
      className={cn('pt-4 mt-4 border-t border-slate-200', className)} 
      {...props}
    >
      {children}
    </div>
  )
}