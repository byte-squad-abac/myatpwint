/**
 * Currency formatting utilities for Myanmar Kyat (MMK)
 */

export function formatMMK(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  // Format with Myanmar Kyat symbol and comma separators
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount) + ' MMK'
}

export function formatMMKShort(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (numAmount >= 1000000) {
    return `${(numAmount / 1000000).toFixed(1)}M MMK`
  } else if (numAmount >= 1000) {
    return `${(numAmount / 1000).toFixed(0)}K MMK`
  }

  return formatMMK(numAmount)
}

// For backward compatibility and easy migration
export const formatPrice = formatMMK