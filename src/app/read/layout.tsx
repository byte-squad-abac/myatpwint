import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reading - MyatPwint',
  description: 'Read your purchased books',
}

export default function ReadingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Full-screen layout for reading experience
  // No navbar or other distractions
  return (
    <div className="w-screen h-screen overflow-hidden">
      {children}
    </div>
  )
}