'use client'

// React and Next.js
import React from 'react'
import Image from 'next/image'

// External libraries
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'

// Types
import type { CartItem } from '@/lib/store/cartStore'

// Components
import { Button } from '@/components/ui'

// Services
import { useCartStore } from '@/lib/store/cartStore'

interface CartDropdownProps {
  onClose: () => void
  onCheckout: () => void
}

export default function CartDropdown({ onClose, onCheckout }: CartDropdownProps) {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore()

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(item.book.id, item.deliveryType)
    } else {
      updateQuantity(item.book.id, item.deliveryType, newQuantity)
    }
  }

  const total = getTotal()

  if (items.length === 0) {
    return (
      <div className="absolute right-0 mt-2 w-80 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 z-[9999]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Shopping Cart</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m6 0a2 2 0 11-4 0" />
              </svg>
            </div>
            <p className="text-gray-400">Your cart is empty</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute right-0 mt-2 w-96 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-h-[500px] overflow-hidden z-[9999]">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Shopping Cart</h3>
            <p className="text-sm text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={clearCart}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
              title="Clear Cart"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Cart Items */}
        <div className="max-h-60 overflow-y-auto space-y-3">
          {items.map((item) => (
            <div key={`${item.book.id}-${item.deliveryType}`} className="flex items-center space-x-3 p-4 bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/30">
              {/* Book Cover */}
              <div className="relative w-12 h-16 flex-shrink-0">
                {item.book.image_url ? (
                  <Image
                    src={item.book.image_url}
                    alt={item.book.name}
                    fill
                    className="object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Book Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white truncate">
                  {item.book.name}
                </h4>
                <p className="text-xs text-gray-400 truncate">
                  {item.book.author}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-green-400">
                    ${item.book.price}
                  </span>
                  <span className="text-xs text-purple-400 capitalize bg-purple-500/20 px-2 py-1 rounded-full">
                    {item.deliveryType}
                  </span>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleQuantityChange(item, item.quantity - 1)}
                  className="p-1 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                  disabled={item.quantity <= 1}
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <span className="text-sm font-medium w-6 text-center text-white">
                  {item.quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(item, item.quantity + 1)}
                  className="p-1 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
                <button
                  onClick={() => removeItem(item.book.id, item.deliveryType)}
                  className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 ml-2 transition-colors"
                  title="Remove item"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Total and Checkout */}
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold text-white">Total:</span>
            <span className="text-xl font-bold text-green-400">
              ${total}
            </span>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={onCheckout}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Proceed to Checkout
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}