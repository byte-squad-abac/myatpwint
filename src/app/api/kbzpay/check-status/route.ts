import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { kbzPayService } from '@/lib/services/kbzpay'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const merchantOrderId = searchParams.get('merchantOrderId')

    if (!merchantOrderId) {
      return NextResponse.json({ error: 'Merchant order ID is required' }, { status: 400 })
    }

    // Get order from database
    const { data: order, error: orderError } = await supabase
      .from('kbzpay_orders')
      .select('*')
      .eq('merchant_order_id', merchantOrderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If already completed, return success
    if (order.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'paid',
        paidAt: order.paid_at,
        orderId: order.id
      })
    }

    // Query KBZPay for latest status
    try {
      const kbzPayResponse = await kbzPayService.queryOrder(merchantOrderId)

      if (kbzPayResponse.result === 'SUCCESS' && kbzPayResponse.trade_status === 'PAY_SUCCESS') {
        // Update order status in database
        const paidAt = kbzPayResponse.pay_success_time
          ? new Date(parseInt(kbzPayResponse.pay_success_time) * 1000).toISOString()
          : new Date().toISOString()

        const { error: updateError } = await supabase
          .from('kbzpay_orders')
          .update({
            status: 'completed',
            kbz_order_id: kbzPayResponse.mm_order_id,
            paid_amount: parseFloat(kbzPayResponse.total_amount || '0'),
            paid_at: paidAt,
            kbzpay_response: kbzPayResponse,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('Error updating order status:', updateError)
        }

        // Create purchase records if payment was successful
        try {
          const purchasePromises = order.book_ids.map(async (bookId: string, index: number) => {
            return supabase.from('purchases').insert({
              user_id: order.user_id,
              book_id: bookId,
              amount: order.amounts[index],
              currency: 'MMK',
              payment_method: 'kbzpay',
              payment_id: kbzPayResponse.mm_order_id,
              status: 'completed',
              purchased_at: paidAt
            })
          })

          await Promise.all(purchasePromises)
        } catch (error) {
          console.error('Error creating purchases:', error)
        }

        return NextResponse.json({
          success: true,
          status: 'paid',
          paidAt: paidAt,
          orderId: order.id,
          kbzOrderId: kbzPayResponse.mm_order_id
        })
      }

      // Payment not completed yet
      return NextResponse.json({
        success: true,
        status: 'pending',
        orderId: order.id
      })

    } catch (kbzPayError) {
      console.error('KBZPay status check error:', kbzPayError)

      // Return the current database status if KBZPay query fails
      return NextResponse.json({
        success: true,
        status: order.status,
        orderId: order.id
      })
    }

  } catch (error) {
    console.error('Check status error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { merchantOrderId, orderId } = body

    if (!merchantOrderId && !orderId) {
      return NextResponse.json({
        error: 'Either merchantOrderId or orderId is required'
      }, { status: 400 })
    }

    // Get order from database
    let query = supabase.from('kbzpay_orders').select('*')

    if (orderId) {
      query = query.eq('id', orderId)
    } else {
      query = query.eq('merchant_order_id', merchantOrderId)
    }

    const { data: order, error: orderError } = await query
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({
        error: 'Order not found'
      }, { status: 404 })
    }

    // If order is already completed or failed, return current status
    if (order.status === 'completed' || order.status === 'failed' || order.status === 'expired' || order.status === 'cancelled') {
      return NextResponse.json({
        orderId: order.id,
        merchantOrderId: order.merchant_order_id,
        status: order.status,
        totalAmount: order.total_amount,
        paidAmount: order.paid_amount,
        paidAt: order.paid_at,
        kbzOrderId: order.kbz_order_id
      })
    }

    try {
      // Query KBZPay for current status
      const kbzPayResponse = await kbzPayService.queryOrder(order.merchant_order_id)

      if (kbzPayResponse.result !== 'SUCCESS') {
        console.error('KBZPay status query failed:', kbzPayResponse)
        return NextResponse.json({
          orderId: order.id,
          merchantOrderId: order.merchant_order_id,
          status: order.status,
          error: 'Failed to check payment status'
        })
      }

      const { trade_status, total_amount, mm_order_id, pay_success_time } = kbzPayResponse

      // Map KBZPay status to our status
      let orderStatus = order.status
      let shouldUpdatePurchases = false
      let paidAt = order.paid_at

      switch (trade_status) {
        case 'PAY_SUCCESS':
          orderStatus = 'completed'
          shouldUpdatePurchases = true
          paidAt = pay_success_time ? new Date(parseInt(pay_success_time) * 1000).toISOString() : new Date().toISOString()
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

      // Update order in database if status changed
      if (orderStatus !== order.status) {
        const { error: updateError } = await supabase
          .from('kbzpay_orders')
          .update({
            status: orderStatus,
            kbz_order_id: mm_order_id,
            paid_amount: total_amount ? parseFloat(total_amount) : order.total_amount,
            paid_at: paidAt,
            kbzpay_response: kbzPayResponse,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        if (updateError) {
          console.error('Failed to update order status:', updateError)
        }

        // Create purchase records if payment was successful and not already created
        if (shouldUpdatePurchases && orderStatus === 'completed' && order.status !== 'completed') {
          try {
            const purchasePromises = order.book_ids.map(async (bookId: string, index: number) => {
              return supabase.from('purchases').insert({
                user_id: order.user_id,
                book_id: bookId,
                amount: order.amounts[index],
                currency: 'MMK',
                payment_method: 'kbzpay',
                payment_id: mm_order_id,
                status: 'completed',
                purchased_at: paidAt
              })
            })

            await Promise.all(purchasePromises)
            console.log(`Created purchases for completed order ${order.merchant_order_id}`)
          } catch (error) {
            console.error('Error creating purchases during status check:', error)
          }
        }
      }

      return NextResponse.json({
        orderId: order.id,
        merchantOrderId: order.merchant_order_id,
        status: orderStatus,
        totalAmount: order.total_amount,
        paidAmount: total_amount ? parseFloat(total_amount) : order.paid_amount,
        paidAt: paidAt,
        kbzOrderId: mm_order_id,
        tradeStatus: trade_status
      })

    } catch (kbzPayError) {
      console.error('KBZPay status check error:', kbzPayError)

      // Return current order status from database
      return NextResponse.json({
        orderId: order.id,
        merchantOrderId: order.merchant_order_id,
        status: order.status,
        totalAmount: order.total_amount,
        paidAmount: order.paid_amount,
        paidAt: order.paid_at,
        kbzOrderId: order.kbz_order_id,
        error: 'Unable to check payment status with KBZPay'
      })
    }

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}