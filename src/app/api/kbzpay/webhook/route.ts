import { NextRequest } from 'next/server'
import { kbzPayService } from '@/lib/services/kbzpay'
import { getAdminFirestore } from '@/lib/firebase/admin'

const ORDERS_COLLECTION = 'orders'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { Request: kbzPayData } = body

    if (!kbzPayData) {
      console.error('Invalid webhook payload: missing Request object')
      return new Response('Invalid payload', { status: 400 })
    }

    console.log('KBZPay webhook received:', kbzPayData)

    // Verify signature
    const isValidSignature = kbzPayService.verifyWebhookSignature(kbzPayData)
    if (!isValidSignature) {
      console.error('Invalid webhook signature')
      return new Response('Invalid signature', { status: 401 })
    }

    const { merch_order_id, trade_status, total_amount, mm_order_id } = kbzPayData

    const db = getAdminFirestore()

    // Find the order in Firestore (Admin SDK bypasses rules)
    const snap = await db.collection(ORDERS_COLLECTION).where('merchantOrderId', '==', merch_order_id).limit(1).get()
    if (snap.empty) {
      console.error('Order not found:', merch_order_id)
      return new Response('Order not found', { status: 404 })
    }
    const orderDoc = snap.docs[0]
    const orderId = orderDoc.id
    const orderData = orderDoc.data()
    const orderTotalAmount = Number(orderData.totalAmount) || 0

    // Process based on trade status
    let orderStatus: 'pending' | 'completed' | 'failed' | 'expired' | 'cancelled' = 'pending'

    switch (trade_status) {
      case 'PAY_SUCCESS':
        orderStatus = 'completed'
        break
      case 'PAY_FAILED':
        orderStatus = 'failed'
        break
      case 'ORDER_EXPIRED':
        orderStatus = 'expired'
        break
      case 'ORDER_CLOSED':
        orderStatus = 'cancelled'
        break
      default:
        console.log('Unhandled trade status:', trade_status)
        orderStatus = 'pending'
    }

    // Update order status
    await db.collection(ORDERS_COLLECTION).doc(orderId).update({
      status: orderStatus,
      kbzOrderId: mm_order_id,
      paidAmount: total_amount ? parseFloat(total_amount) : orderTotalAmount,
      paidAt: trade_status === 'PAY_SUCCESS' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })

    console.log(`Order ${merch_order_id} updated to ${orderStatus}`)

    // Return success response to KBZPay
    return new Response('success', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
