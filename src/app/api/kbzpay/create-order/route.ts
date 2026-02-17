import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { kbzPayService } from '@/lib/services/kbzpay'

const BOOKS_COLLECTION = 'books'
const ORDERS_COLLECTION = 'orders'

export async function POST(request: NextRequest) {
  try {
    // Get Firebase Auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const adminAuth = getAdminAuth()
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { items } = body as { items: Array<{ bookId: string; quantity: number }> }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 })
    }

    const db = getAdminFirestore()

    // Get books data using Admin SDK (bypasses security rules)
    const books: Array<{ id: string; name: string; price: number }> = []
    for (const item of items) {
      const snap = await db.collection(BOOKS_COLLECTION).doc(item.bookId).get()
      if (!snap.exists) {
        return NextResponse.json({ error: 'Some books not found' }, { status: 404 })
      }
      const d = snap.data()!
      books.push({
        id: snap.id,
        name: d.name || '',
        price: Number(d.price) || 0,
      })
    }

    // Calculate total and build order items
    let totalAmount = 0
    const orderItems = items.map((item, i) => {
      const book = books[i]!
      const itemTotal = book.price * item.quantity
      totalAmount += itemTotal
      return {
        bookId: book.id,
        name: book.name,
        price: book.price,
        quantity: item.quantity,
      }
    })

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 })
    }

    // Create unique merchant order ID
    const merchantOrderId = `ORDER_${Date.now()}_${userId.slice(0, 8)}`

    // Create order title
    const orderTitle = books.length === 1 ? books[0]!.name : `${books[0]!.name} and ${books.length - 1} more`

    // Create order in Firestore using Admin SDK (bypasses security rules)
    const orderData = {
      userId,
      merchantOrderId,
      bookIds: items.map((i) => i.bookId),
      items: orderItems,
      totalAmount,
      currency: 'MMK',
      status: 'pending',
      paymentMethod: 'kbzpay',
      createdAt: new Date().toISOString(),
    }
    const orderRef = await db.collection(ORDERS_COLLECTION).add(orderData)
    const orderId = orderRef.id

    // Create KBZPay order
    const kbzPayOrder = {
      merch_order_id: merchantOrderId,
      total_amount: totalAmount,
      title: orderTitle,
      callback_info: JSON.stringify({
        orderId,
        userId,
        bookIds: items.map((i) => i.bookId),
      }),
    }

    try {
      const kbzPayResponse = await kbzPayService.createOrder(kbzPayOrder)

      if (kbzPayResponse.result !== 'SUCCESS') {
        console.error('KBZPay order creation failed:', kbzPayResponse)

        await db.collection(ORDERS_COLLECTION).doc(orderId).update({
          status: 'failed',
          updatedAt: new Date().toISOString(),
        })

        return NextResponse.json(
          {
            error: 'Failed to create payment order',
            details: kbzPayResponse.msg,
          },
          { status: 400 }
        )
      }

      // Update order with prepay_id
      await db.collection(ORDERS_COLLECTION).doc(orderId).update({
        prepayId: kbzPayResponse.prepay_id,
        updatedAt: new Date().toISOString(),
      })

      // Generate PWA payment URL
      const paymentUrl = kbzPayService.generatePWAPaymentUrl(kbzPayResponse.prepay_id!)

      return NextResponse.json({
        success: true,
        orderId,
        merchantOrderId,
        prepayId: kbzPayResponse.prepay_id,
        paymentUrl,
        totalAmount,
        currency: 'MMK',
      })
    } catch (kbzPayError) {
      console.error('KBZPay API Error:', kbzPayError)

      await db.collection(ORDERS_COLLECTION).doc(orderId).update({
        status: 'failed',
        updatedAt: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          error: 'Payment service unavailable. Please try again later.',
        },
        { status: 503 }
      )
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Create order error:', err.message, err.stack)
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(isDev && { details: err.message }),
      },
      { status: 500 }
    )
  }
}
