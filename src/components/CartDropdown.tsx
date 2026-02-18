'use client'

import React from 'react'
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { CartItem } from '@/lib/store/cartStore'
import { useCartStore } from '@/lib/store/cartStore'
import { formatMMK } from '@/lib/utils/currency'

interface CartDropdownProps {
  onClose: () => void
  onCheckout: () => void
}

export default function CartDropdown({ onClose, onCheckout }: CartDropdownProps) {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore()

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(item.book.id)
    } else {
      updateQuantity(item.book.id, newQuantity)
    }
  }

  const total = getTotal()

  const dropdownPanel = (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-white truncate">Shopping Cart</h3>
          <p className="text-xs sm:text-sm text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {items.length > 0 && (
            <button onClick={clearCart} className="text-xs sm:text-sm text-red-400 hover:text-red-300 transition-colors py-2 px-1 touch-manipulation">
              Clear All
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 -m-2 touch-manipulation" aria-label="Close cart">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 sm:py-10">
          <p className="text-gray-400 text-sm sm:text-base">Your cart is empty</p>
        </div>
      ) : (
        <>
          <div className="max-h-[40vh] sm:max-h-60 overflow-y-auto overflow-x-hidden space-y-3 -mx-1 px-1">
            {items.map((item) => (
              <div key={item.book.id} className="flex gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                <div className="relative w-10 h-14 sm:w-12 sm:h-16 flex-shrink-0">
                  {item.book.image ? (
                    <img
                      src={item.book.image}
                      alt={item.book.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white truncate">{item.book.name}</h4>
                    <p className="text-xs text-gray-400 truncate">{item.book.author_name}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1 sm:mt-2 flex-wrap">
                    <span className="text-sm font-bold text-green-400">{formatMMK(item.book.price)}</span>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <button
                        onClick={() => handleQuantityChange(item, item.quantity - 1)}
                        className="p-2 sm:p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors touch-manipulation disabled:opacity-50"
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <MinusIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                      <span className="text-sm font-medium w-7 sm:w-6 text-center text-white tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item, item.quantity + 1)}
                        className="p-2 sm:p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors touch-manipulation"
                        aria-label="Increase quantity"
                      >
                        <PlusIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                      <button
                        onClick={() => removeItem(item.book.id)}
                        className="p-2 sm:p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 ml-1 transition-colors touch-manipulation"
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <TrashIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-700/50">
            <div className="flex justify-between items-center mb-4 gap-2">
              <span className="text-base sm:text-lg font-semibold text-white">Total:</span>
              <span className="text-lg sm:text-xl font-bold text-green-400 tabular-nums">{formatMMK(total)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all text-sm sm:text-base touch-manipulation"
            >
              View Cart
            </button>
          </div>
        </>
      )}
    </div>
  )

  const wrapperClass = 'bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 z-[9999] flex flex-col'
  const emptyWrapperClass = `${wrapperClass}`
  const fullWrapperClass = `${wrapperClass} max-h-[85vh] sm:max-h-[500px] overflow-hidden`

  return (
    <>
      {/* Backdrop on narrow screens - tap to close (lower z so dropdown is on top) */}
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 top-14 sm:top-16 bg-black/50 z-[9998] sm:hidden cursor-default"
        aria-label="Close cart"
      />
      {/* Narrow: fixed so dropdown is fully in view; sm+: absolute under cart icon */}
      <div
        className={`fixed left-4 right-4 top-[3.5rem] sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:absolute sm:w-96 sm:max-w-[calc(100vw-2rem)] w-auto ${items.length === 0 ? emptyWrapperClass : fullWrapperClass}`}
        style={{ zIndex: 9999 }}
        role="dialog"
        aria-label="Shopping cart"
      >
        {dropdownPanel}
      </div>
    </>
  )
}
