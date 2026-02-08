import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Book } from '@/types/book'

export interface CartItem {
  book: Book
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (book: Book, quantity?: number) => void
  removeItem: (bookId: string) => void
  updateQuantity: (bookId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  isInCart: (bookId: string) => boolean
  getItemQuantity: (bookId: string) => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (book: Book, quantity = 1) => {
        const { items } = get()
        const existing = items.find((item) => item.book.id === book.id)
        if (existing) {
          set({
            items: items.map((item) =>
              item.book.id === book.id ? { ...item, quantity: item.quantity + quantity } : item
            ),
          })
        } else {
          set({ items: [...items, { book, quantity }] })
        }
      },

      removeItem: (bookId: string) => {
        const { items } = get()
        set({ items: items.filter((item) => item.book.id !== bookId) })
      },

      updateQuantity: (bookId: string, quantity: number) => {
        const { items } = get()
        if (quantity <= 0) {
          set({ items: items.filter((item) => item.book.id !== bookId) })
        } else {
          set({
            items: items.map((item) =>
              item.book.id === bookId ? { ...item, quantity } : item
            ),
          })
        }
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        const { items } = get()
        return items.reduce((total, item) => total + item.book.price * item.quantity, 0)
      },

      isInCart: (bookId: string) => {
        const { items } = get()
        return items.some((item) => item.book.id === bookId)
      },

      getItemQuantity: (bookId: string) => {
        const { items } = get()
        const item = items.find((item) => item.book.id === bookId)
        return item?.quantity || 0
      },
    }),
    { name: 'myatpwint-cart-storage' }
  )
)
