import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Book, DeliveryType } from '../types';

export interface CartItem {
  book: Book;
  quantity: number;
  deliveryType: DeliveryType;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  deliveryType: DeliveryType;
  shippingInfo: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
    email: string;
  };
  paymentInfo: {
    cardNumber: string;
    cardName: string;
    expiryDate: string;
  };
  createdAt: string;
}

interface CartStore {
  items: CartItem[];
  orders: Order[];
  deliveryType: DeliveryType;
  setDeliveryType: (type: DeliveryType) => void;
  addItem: (book: Book, deliveryType: DeliveryType, quantity?: number) => void;
  removeItem: (bookId: string, deliveryType: DeliveryType) => void;
  updateQuantity: (bookId: string, deliveryType: DeliveryType, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  isInCart: (bookId: string, deliveryType: DeliveryType) => boolean;
  getItemQuantity: (bookId: string, deliveryType: DeliveryType) => number;
  placeOrder: (shippingInfo: Order['shippingInfo'], paymentInfo: Order['paymentInfo']) => Promise<Order>;
  getOrders: () => Order[];
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orders: [],
      deliveryType: 'physical',
      
      setDeliveryType: (type: DeliveryType) => set({ deliveryType: type }),
      
      addItem: (book: Book, deliveryType: DeliveryType, quantity: number = 1) => {
        const { items } = get();
        const existingItem = items.find(item => item.book.id === book.id && item.deliveryType === deliveryType);
        
        if (existingItem) {
          set({
            items: items.map(item =>
              item.book.id === book.id && item.deliveryType === deliveryType
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          });
        } else {
          set({ items: [...items, { book, quantity, deliveryType }] });
        }
      },
      
      removeItem: (bookId: string, deliveryType: DeliveryType) => {
        const { items } = get();
        set({ items: items.filter(item => !(item.book.id === bookId && item.deliveryType === deliveryType)) });
      },

      updateQuantity: (bookId: string, deliveryType: DeliveryType, quantity: number) => {
        const { items } = get();
        if (quantity <= 0) {
          set({ items: items.filter(item => !(item.book.id === bookId && item.deliveryType === deliveryType)) });
        } else {
          set({
            items: items.map(item =>
              item.book.id === bookId && item.deliveryType === deliveryType
                ? { ...item, quantity }
                : item
            )
          });
        }
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        const { items } = get();
        const subtotal = items.reduce((total, item) => total + (item.book.price * item.quantity), 0);
        // Add shipping cost if any item is physical
        const hasPhysical = items.some(item => item.deliveryType === 'physical');
        const shippingCost = hasPhysical ? 5000 : 0;
        return subtotal + shippingCost;
      },
      
      isInCart: (bookId: string, deliveryType: DeliveryType) => {
        const { items } = get();
        return items.some(item => item.book.id === bookId && item.deliveryType === deliveryType);
      },

      getItemQuantity: (bookId: string, deliveryType: DeliveryType) => {
        const { items } = get();
        const item = items.find(item => item.book.id === bookId && item.deliveryType === deliveryType);
        return item?.quantity || 0;
      },

      placeOrder: async (shippingInfo, paymentInfo) => {
        const { items, getTotal, deliveryType } = get();
        
        // Create new order
        const order: Order = {
          id: Math.random().toString(36).substr(2, 9),
          items: [...items],
          total: getTotal(),
          status: 'pending',
          deliveryType,
          shippingInfo,
          paymentInfo,
          createdAt: new Date().toISOString(),
        };

        try {
          // TODO: Implement actual API call to your backend
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update order status and store
          order.status = 'completed';
          set(state => ({
            orders: [...state.orders, order],
            items: [], // Clear cart after successful order
          }));

          return order;
        } catch (error) {
          order.status = 'failed';
          throw error;
        }
      },

      getOrders: () => {
        const { orders } = get();
        return orders;
      },
    }),
    {
      name: 'book-store-storage',
    }
  )
); 