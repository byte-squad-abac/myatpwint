import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  type DocumentData,
} from 'firebase/firestore'
import { firestore } from './config'

export const ORDERS_COLLECTION = 'orders'

export interface Order {
  id: string
  userId: string
  merchantOrderId: string
  bookIds: string[]
  items: Array<{ bookId: string; name: string; price: number; quantity: number }>
  totalAmount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'cancelled'
  paymentMethod: 'kbzpay' | 'demo'
  prepayId?: string
  kbzOrderId?: string
  paidAmount?: number
  paidAt?: string
  createdAt: string
  updatedAt?: string
}

export interface OrderInput {
  userId: string
  merchantOrderId: string
  bookIds: string[]
  items: Array<{ bookId: string; name: string; price: number; quantity: number }>
  totalAmount: number
  currency: string
  paymentMethod: 'kbzpay' | 'demo'
  prepayId?: string
}

function docToOrder(id: string, data: DocumentData): Order {
  return {
    id,
    userId: data.userId || '',
    merchantOrderId: data.merchantOrderId || '',
    bookIds: Array.isArray(data.bookIds) ? data.bookIds : [],
    items: Array.isArray(data.items) ? data.items : [],
    totalAmount: Number(data.totalAmount) || 0,
    currency: data.currency || 'MMK',
    status: data.status || 'pending',
    paymentMethod: data.paymentMethod || 'kbzpay',
    prepayId: data.prepayId,
    kbzOrderId: data.kbzOrderId,
    paidAmount: data.paidAmount,
    paidAt: data.paidAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function createOrder(input: OrderInput): Promise<string> {
  const data = {
    ...input,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  const ref = await addDoc(collection(firestore, ORDERS_COLLECTION), data)
  return ref.id
}

export async function getOrderById(id: string): Promise<Order | null> {
  const ref = doc(firestore, ORDERS_COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return docToOrder(snap.id, snap.data())
}

export async function getOrderByMerchantId(merchantOrderId: string): Promise<Order | null> {
  const q = query(
    collection(firestore, ORDERS_COLLECTION),
    where('merchantOrderId', '==', merchantOrderId)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const firstDoc = snapshot.docs[0]
  return docToOrder(firstDoc.id, firstDoc.data())
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const q = query(
    collection(firestore, ORDERS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => docToOrder(d.id, d.data()))
}

export async function updateOrder(
  id: string,
  updates: Partial<Omit<Order, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(firestore, ORDERS_COLLECTION, id)
  await updateDoc(ref, { ...updates, updatedAt: new Date().toISOString() })
}
