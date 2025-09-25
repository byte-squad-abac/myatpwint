import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { kbzPayService } from '@/lib/services/kbzpay'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bookIds, amounts } = body

    if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
      return NextResponse.json({ error: 'Book IDs are required' }, { status: 400 })
    }

    if (!amounts || !Array.isArray(amounts) || amounts.length !== bookIds.length) {
      return NextResponse.json({ error: 'Amounts array must match book IDs' }, { status: 400 })
    }

    // Get books data for order details
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, name, price')
      .in('id', bookIds)

    if (booksError || !books) {
      console.error('Error fetching books:', booksError)
      return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 })
    }

    // Calculate total amount in MMK
    const totalAmount = amounts.reduce((sum: number, amount: number) => sum + amount, 0)

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid total amount' }, { status: 400 })
    }

    // Create unique merchant order ID
    const merchantOrderId = `ORDER_${Date.now()}_${user.id.slice(0, 8)}`

    // Create order title from book names
    const orderTitle = books.length === 1
      ? books[0].name
      : `${books[0].name} and ${books.length - 1} more`

    // Store order in database for tracking
    const { data: order, error: orderError } = await supabase
      .from('kbzpay_orders')
      .insert({
        merchant_order_id: merchantOrderId,
        user_id: user.id,
        book_ids: bookIds,
        amounts: amounts,
        total_amount: totalAmount,
        currency: 'MMK',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order record:', orderError)
      return NextResponse.json({ error: 'Failed to create order record' }, { status: 500 })
    }

    // Create KBZPay order
    const kbzPayOrder = {
      merch_order_id: merchantOrderId,
      total_amount: totalAmount,
      title: orderTitle,
      callback_info: JSON.stringify({
        orderId: order.id,
        userId: user.id,
        bookIds: bookIds
      })
    }

    try {
      const kbzPayResponse = await kbzPayService.createOrder(kbzPayOrder)

      if (kbzPayResponse.result !== 'SUCCESS') {
        console.error('KBZPay order creation failed:', kbzPayResponse)

        // Update order status to failed
        await supabase
          .from('kbzpay_orders')
          .update({
            status: 'failed',
            error_code: kbzPayResponse.code,
            error_message: kbzPayResponse.msg
          })
          .eq('id', order.id)

        return NextResponse.json({
          error: 'Failed to create payment order',
          details: kbzPayResponse.msg
        }, { status: 400 })
      }

      // Update order with KBZPay response
      await supabase
        .from('kbzpay_orders')
        .update({
          prepay_id: kbzPayResponse.prepay_id,
          kbzpay_response: kbzPayResponse
        })
        .eq('id', order.id)

      // Generate PWA payment URL
      const paymentUrl = kbzPayService.generatePWAPaymentUrl(kbzPayResponse.prepay_id!)

      return NextResponse.json({
        success: true,
        orderId: order.id,
        merchantOrderId: merchantOrderId,
        prepayId: kbzPayResponse.prepay_id,
        paymentUrl: paymentUrl,
        totalAmount: totalAmount,
        currency: 'MMK'
      })

    } catch (kbzPayError) {
      console.error('KBZPay API Error:', kbzPayError)

      // Update order status to failed
      await supabase
        .from('kbzpay_orders')
        .update({
          status: 'failed',
          error_message: kbzPayError instanceof Error ? kbzPayError.message : 'Unknown error'
        })
        .eq('id', order.id)

      return NextResponse.json({
        error: 'Payment service unavailable. Please try again later.'
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}