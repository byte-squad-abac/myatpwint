'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/lib/store/cartStore'

/**
 * Component to sync cart state with authentication changes
 * This component should be included in the root layout to ensure
 * the cart is cleared when users sign in/out
 */
export function CartAuthSync() {
  const initializeAuthListener = useCartStore(state => state.initializeAuthListener)

  useEffect(() => {
    // Initialize the auth listener when the component mounts
    initializeAuthListener()
  }, [initializeAuthListener])

  // This component doesn't render anything visible
  return null
}