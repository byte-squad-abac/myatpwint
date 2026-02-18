import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin'
import { kbzPayService } from '@/lib/services/kbzpay'

const ORDERS_COLLECTION = 'orders'

function docToOrder(
  id: string,
  data: { userId?: string; merchantOrderId?: string; status?: string; totalAmount?: number; paidAmount?: number; paidAt?: string; kbzOrderId?: string }
) {
  return {
    id,
    userId: data.userId || '',
    merchantOrderId: data.merchantOrderId || '',
    status: data.status || 'pending',
    totalAmount: Number(data.totalAmount) || 0,
    paidAmount: data.paidAmount,
    paidAt: data.paidAt,
    kbzOrderId: data.kbzOrderId,
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const merchantOrderId = searchParams.get('merchantOrderId')

    if (!merchantOrderId) {
      return NextResponse.json({ error: 'Merchant order ID is required' }, { status: 400 })
    }

    const db = getAdminFirestore()
    const orderSnap = await db.collection(ORDERS_COLLECTION).where('merchantOrderId', '==', merchantOrderId).limit(1).get()
    if (orderSnap.empty) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const orderDoc = orderSnap.docs[0]
    const order = docToOrder(orderDoc.id, orderDoc.data())

    if (order.userId !== userId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If already completed, return success
    if (order.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'paid',
        paidAt: order.paidAt,
        orderId: order.id,
      })
    }

    // Query KBZPay for latest status
    try {
      const kbzPayResponse = await kbzPayService.queryOrder(merchantOrderId)

      if (kbzPayResponse.result === 'SUCCESS' && kbzPayResponse.trade_status === 'PAY_SUCCESS') {
        // Update order status in Firestore (Admin SDK)
        const paidAt = kbzPayResponse.pay_success_time
          ? new Date(parseInt(kbzPayResponse.pay_success_time) * 1000).toISOString()
          : new Date().toISOString()

        await db.collection(ORDERS_COLLECTION).doc(order.id).update({
          status: 'completed',
          kbzOrderId: kbzPayResponse.mm_order_id,
          paidAmount: parseFloat(kbzPayResponse.total_amount || '0'),
          paidAt: paidAt,
          updatedAt: new Date().toISOString(),
        })

        return NextResponse.json({
          success: true,
          status: 'paid',
          paidAt: paidAt,
          orderId: order.id,
          kbzOrderId: kbzPayResponse.mm_order_id,
        })
      }

      // Payment not completed yet
      return NextResponse.json({
        success: true,
        status: 'pending',
        orderId: order.id,
      })
    } catch (kbzPayError) {
      console.error('KBZPay status check error:', kbzPayError)

      // Return the current database status if KBZPay query fails
      return NextResponse.json({
        success: true,
        status: order.status,
        orderId: order.id,
      })
    }
  } catch (error) {
    console.error('Check status error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

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
    const { merchantOrderId, orderId } = body

    if (!merchantOrderId && !orderId) {
      return NextResponse.json(
        {
          error: 'Either merchantOrderId or orderId is required',
        },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()
    let order: ReturnType<typeof docToOrder> | null = null
    if (orderId) {
      const snap = await db.collection(ORDERS_COLLECTION).doc(orderId).get()
      if (snap.exists) order = docToOrder(snap.id, snap.data()!)
    } else {
      const snap = await db.collection(ORDERS_COLLECTION).where('merchantOrderId', '==', merchantOrderId).limit(1).get()
      if (!snap.empty) {
        const d = snap.docs[0]
        order = docToOrder(d.id, d.data())
      }
    }

    if (!order || order.userId !== userId) {
      return NextResponse.json(
        {
          error: 'Order not found',
        },
        { status: 404 }
      )
    }

    // If order is already terminal, return current status
    if (
      order.status === 'completed' ||
      order.status === 'failed' ||
      order.status === 'expired' ||
      order.status === 'cancelled'
    ) {
      return NextResponse.json({
        orderId: order.id,
        merchantOrderId: order.merchantOrderId,
        status: order.status,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        paidAt: order.paidAt,
        kbzOrderId: order.kbzOrderId,
      })
    }

    try {
      // Query KBZPay for current status
      const kbzPayResponse = await kbzPayService.queryOrder(order.merchantOrderId)

      if (kbzPayResponse.result !== 'SUCCESS') {
        console.error('KBZPay status query failed:', kbzPayResponse)
        return NextResponse.json({
          orderId: order.id,
          merchantOrderId: order.merchantOrderId,
          status: order.status,
          error: 'Failed to check payment status',
        })
      }

      const { trade_status, total_amount, mm_order_id, pay_success_time } = kbzPayResponse

      // Map KBZPay status to our status
      type OrderStatus = 'pending' | 'completed' | 'failed' | 'expired' | 'cancelled'
      let orderStatus: OrderStatus = order.status
      let paidAt = order.paidAt

      switch (trade_status) {
        case 'PAY_SUCCESS':
          orderStatus = 'completed'
          paidAt = pay_success_time
            ? new Date(parseInt(pay_success_time) * 1000).toISOString()
            : new Date().toISOString()
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
        case 'WAIT_PAY':
        case 'PAYING':
          orderStatus = 'pending'
          break
        default:
          console.log('Unknown trade status:', trade_status)
      }

      // Update order in Firestore if status changed (Admin SDK)
      if (orderStatus !== order.status) {
        await db.collection(ORDERS_COLLECTION).doc(order.id).update({
          status: orderStatus,
          kbzOrderId: mm_order_id,
          paidAmount: total_amount ? parseFloat(total_amount) : order.totalAmount,
          paidAt: paidAt,
          updatedAt: new Date().toISOString(),
        })
      }

      return NextResponse.json({
        orderId: order.id,
        merchantOrderId: order.merchantOrderId,
        status: orderStatus,
        totalAmount: order.totalAmount,
        paidAmount: total_amount ? parseFloat(total_amount) : order.paidAmount,
        paidAt: paidAt,
        kbzOrderId: mm_order_id,
        tradeStatus: trade_status,
      })
    } catch (kbzPayError) {
      console.error('KBZPay status check error:', kbzPayError)

      // Return current order status from Firestore
      return NextResponse.json({
        orderId: order.id,
        merchantOrderId: order.merchantOrderId,
        status: order.status,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        paidAt: order.paidAt,
        kbzOrderId: order.kbzOrderId,
        error: 'Unable to check payment status with KBZPay',
      })
    }
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
