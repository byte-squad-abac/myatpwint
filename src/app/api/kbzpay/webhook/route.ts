import { NextRequest } from 'next/server'
import { kbzPayService } from '@/lib/services/kbzpay'
import { createClient } from '@/lib/supabase/server'

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

    const {
      merch_order_id,
      trade_status,
      total_amount,
      mm_order_id,
      callback_info
    } = kbzPayData

    // Initialize Supabase client
    const supabase = await createClient()

    // Find the order in our database
    const { data: order, error: orderError } = await supabase
      .from('kbzpay_orders')
      .select('*')
      .eq('merchant_order_id', merch_order_id)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', merch_order_id, orderError)
      return new Response('Order not found', { status: 404 })
    }

    // Process based on trade status
    let orderStatus = 'pending'
    let shouldCreatePurchase = false

    switch (trade_status) {
      case 'PAY_SUCCESS':
        orderStatus = 'completed'
        shouldCreatePurchase = true
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
    const { error: updateError } = await supabase
      .from('kbzpay_orders')
      .update({
        status: orderStatus,
        kbz_order_id: mm_order_id,
        paid_amount: total_amount ? parseFloat(total_amount) : order.total_amount,
        paid_at: trade_status === 'PAY_SUCCESS' ? new Date().toISOString() : null,
        webhook_data: kbzPayData,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      return new Response('Failed to update order', { status: 500 })
    }

    // If payment successful, create purchase records
    if (shouldCreatePurchase && trade_status === 'PAY_SUCCESS') {
      try {
        // Parse callback info if exists (for potential future use)
        if (callback_info) {
          try {
            JSON.parse(decodeURIComponent(callback_info))
          } catch (e) {
            console.warn('Failed to parse callback_info:', e)
          }
        }

        // Create purchase records for each book
        const purchasePromises = order.book_ids.map(async (bookId: string, index: number) => {
          return supabase.from('purchases').insert({
            user_id: order.user_id,
            book_id: bookId,
            amount: order.amounts[index],
            currency: 'MMK',
            payment_method: 'kbzpay',
            payment_id: mm_order_id,
            status: 'completed',
            purchased_at: new Date().toISOString()
          })
        })

        const results = await Promise.allSettled(purchasePromises)

        // Check if any purchases failed
        const failedPurchases = results.filter(result => result.status === 'rejected')
        if (failedPurchases.length > 0) {
          console.error('Some purchases failed to create:', failedPurchases)

          // Update order to indicate partial failure
          await supabase
            .from('kbzpay_orders')
            .update({
              status: 'completed_with_errors',
              error_message: 'Some book purchases failed to create'
            })
            .eq('id', order.id)
        }

        console.log(`Successfully created ${results.length - failedPurchases.length} purchases for order ${merch_order_id}`)

      } catch (error) {
        console.error('Error creating purchases:', error)

        // Update order to indicate error in processing
        await supabase
          .from('kbzpay_orders')
          .update({
            status: 'completed_with_errors',
            error_message: 'Failed to create purchase records'
          })
          .eq('id', order.id)
      }
    }

    // Return success response to KBZPay
    return new Response('success', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}