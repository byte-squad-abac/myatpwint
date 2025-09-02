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
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Shopping Cart</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="text-center py-8">
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Shopping Cart ({items.length})</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-800"
              title="Clear Cart"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Cart Items */}
        <div className="max-h-60 overflow-y-auto space-y-3">
          {items.map((item) => (
            <div key={`${item.book.id}-${item.deliveryType}`} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {/* Book Cover */}
              <div className="relative w-12 h-16 flex-shrink-0">
                <Image
                  src={item.book.image_url}
                  alt={item.book.name}
                  fill
                  className="object-cover rounded"
                />
              </div>
              
              {/* Book Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {item.book.name}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  {item.book.author}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-semibold text-green-600">
                    {item.book.price.toLocaleString()} MMK
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {item.deliveryType}
                  </span>
                </div>
              </div>
              
              {/* Quantity Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleQuantityChange(item, item.quantity - 1)}
                  className="p-1 rounded hover:bg-gray-200"
                  disabled={item.quantity <= 1}
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <span className="text-sm font-medium w-6 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(item, item.quantity + 1)}
                  className="p-1 rounded hover:bg-gray-200"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
                <button
                  onClick={() => removeItem(item.book.id, item.deliveryType)}
                  className="p-1 rounded hover:bg-red-100 text-red-600 ml-2"
                  title="Remove item"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Total and Checkout */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-lg font-bold text-green-600">
              {total.toLocaleString()} MMK
            </span>
          </div>
          
          {/* Shipping Note */}
          {items.some(item => item.deliveryType === 'physical') && (
            <p className="text-xs text-gray-600 mb-3">
              *Includes 5,000 MMK shipping fee for physical books
            </p>
          )}
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              Continue Shopping
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onCheckout}
              className="flex-1"
            >
              Checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}