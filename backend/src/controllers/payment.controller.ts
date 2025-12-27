import { Request, Response, NextFunction } from 'express';
import { KBZPayService } from '../services/kbzpay.service';
import { SupabaseService } from '../services/supabase.service';
import { createError } from '../middleware/errorHandler';

const kbzPayService = new KBZPayService();
const supabaseService = new SupabaseService();

/**
 * POST /create-payment
 * Creates a KBZPay payment order
 */
export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, bookIds, amounts } = req.body;

    // Validation
    if (!userId || typeof userId !== 'string') {
      throw createError('User ID is required', 400);
    }

    if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
      throw createError('Book IDs array is required and must not be empty', 400);
    }

    if (!amounts || !Array.isArray(amounts) || amounts.length !== bookIds.length) {
      throw createError('Amounts array must match book IDs array length', 400);
    }

    // Verify user ID format (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw createError('Invalid user ID format', 400);
    }

    // Get books data for order details
    const books = await supabaseService.getBooksByIds(bookIds);
    if (!books || books.length !== bookIds.length) {
      throw createError('Some books not found', 404);
    }

    // Calculate total amount
    const totalAmount = amounts.reduce((sum: number, amount: number) => sum + amount, 0);
    if (totalAmount <= 0) {
      throw createError('Invalid total amount', 400);
    }

    // Create unique merchant order ID
    const merchantOrderId = `ORDER_${Date.now()}_${userId.slice(0, 8)}`;

    // Create order title from book names
    const orderTitle =
      books.length === 1
        ? books[0].name
        : `${books[0].name} and ${books.length - 1} more`;

    // Store order in database
    const order = await supabaseService.createOrder({
      merchant_order_id: merchantOrderId,
      user_id: userId,
      book_ids: bookIds,
      amounts: amounts,
      total_amount: totalAmount,
      currency: 'MMK',
      status: 'pending',
    });

    // Create KBZPay order
    const kbzPayOrder = {
      merch_order_id: merchantOrderId,
      total_amount: totalAmount,
      title: orderTitle,
      callback_info: JSON.stringify({
        orderId: order.id,
        userId: userId,
        bookIds: bookIds,
      }),
    };

    try {
      const kbzPayResponse = await kbzPayService.createOrder(kbzPayOrder);

      if (kbzPayResponse.result !== 'SUCCESS') {
        // Update order status to failed
        await supabaseService.updateOrder(order.id, {
          status: 'failed',
          error_code: kbzPayResponse.code,
          error_message: kbzPayResponse.msg,
        });

        throw createError(`Failed to create payment order: ${kbzPayResponse.msg}`, 400);
      }

      // Update order with KBZPay response
      await supabaseService.updateOrder(order.id, {
        prepay_id: kbzPayResponse.prepay_id,
        kbzpay_response: kbzPayResponse,
      });

      // Generate PWA payment URL
      const paymentUrl = kbzPayService.generatePWAPaymentUrl(kbzPayResponse.prepay_id!);

      res.json({
        success: true,
        orderId: order.id,
        merchantOrderId: merchantOrderId,
        prepayId: kbzPayResponse.prepay_id,
        paymentUrl: paymentUrl,
        totalAmount: totalAmount,
        currency: 'MMK',
      });
    } catch (kbzPayError) {
      console.error('KBZPay API Error:', kbzPayError);

      // Update order status to failed
      await supabaseService.updateOrder(order.id, {
        status: 'failed',
        error_message: kbzPayError instanceof Error ? kbzPayError.message : 'Unknown error',
      });

      throw createError('Payment service unavailable. Please try again later.', 503);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * POST /verify-payment
 * Verifies payment status with KBZPay
 */
export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantOrderId } = req.body;

    if (!merchantOrderId || typeof merchantOrderId !== 'string') {
      throw createError('Merchant order ID is required', 400);
    }

    // Get order from database
    const order = await supabaseService.findOrderByMerchantOrderId(merchantOrderId);
    if (!order) {
      throw createError('Order not found', 404);
    }

    // If already completed, return success
    if (order.status === 'completed') {
      return res.json({
        success: true,
        status: 'completed',
        orderId: order.id,
        merchantOrderId: order.merchant_order_id,
        paidAt: order.paid_at,
        kbzOrderId: order.kbz_order_id,
      });
    }

    // Query KBZPay for latest status
    try {
      const kbzPayResponse = await kbzPayService.queryOrder(merchantOrderId);

      if (kbzPayResponse.result !== 'SUCCESS') {
        return res.json({
          success: false,
          status: order.status,
          error: 'Failed to check payment status',
        });
      }

      const { trade_status, total_amount, mm_order_id, pay_success_time } = kbzPayResponse;

      // Map KBZPay status to our status
      let orderStatus = order.status;
      let shouldCreatePurchases = false;
      let paidAt: string | null = order.paid_at;

      switch (trade_status) {
        case 'PAY_SUCCESS':
          orderStatus = 'completed';
          shouldCreatePurchases = true;
          paidAt = pay_success_time
            ? new Date(parseInt(pay_success_time) * 1000).toISOString()
            : new Date().toISOString();
          break;
        case 'PAY_FAILED':
          orderStatus = 'failed';
          break;
        case 'ORDER_EXPIRED':
          orderStatus = 'expired';
          break;
        case 'ORDER_CLOSED':
          orderStatus = 'cancelled';
          break;
        case 'WAIT_PAY':
        case 'PAYING':
          orderStatus = 'pending';
          break;
        default:
          console.log('Unknown trade status:', trade_status);
      }

      // Update order in database if status changed
      if (orderStatus !== order.status) {
        await supabaseService.updateOrder(order.id, {
          status: orderStatus,
          kbz_order_id: mm_order_id,
          paid_amount: total_amount ? parseFloat(total_amount) : order.total_amount,
          paid_at: paidAt || undefined,
          kbzpay_response: kbzPayResponse,
        });

        // Create purchase records if payment was successful
        if (shouldCreatePurchases && orderStatus === 'completed') {
          try {
            const purchases = order.book_ids.map((bookId: string, index: number) => ({
              user_id: order.user_id,
              book_id: bookId,
              amount: order.amounts[index],
              currency: 'MMK',
              payment_method: 'kbzpay',
              payment_id: mm_order_id || merchantOrderId,
              status: 'completed',
              purchased_at: paidAt!,
            }));

            await supabaseService.createPurchases(purchases);
            console.log(`Created purchases for completed order ${merchantOrderId}`);
          } catch (error) {
            console.error('Error creating purchases:', error);
          }
        }
      }

      res.json({
        success: true,
        status: orderStatus,
        orderId: order.id,
        merchantOrderId: order.merchant_order_id,
        paidAt: paidAt,
        kbzOrderId: mm_order_id,
        tradeStatus: trade_status,
      });
    } catch (kbzPayError) {
      console.error('KBZPay status check error:', kbzPayError);

      // Return current order status from database
      res.json({
        success: true,
        status: order.status,
        orderId: order.id,
        merchantOrderId: order.merchant_order_id,
        error: 'Unable to check payment status with KBZPay',
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * POST /kbzpay-callback
 * Receives webhook callbacks from KBZPay
 */
export async function handleKBZPayCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body;
    const { Request: kbzPayData } = body;

    if (!kbzPayData) {
      console.error('Invalid webhook payload: missing Request object');
      return res.status(400).send('Invalid payload');
    }

    console.log('KBZPay webhook received:', kbzPayData);

    // Verify signature
    const isValidSignature = kbzPayService.verifyWebhookSignature(kbzPayData);
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const { merch_order_id, trade_status, total_amount, mm_order_id } = kbzPayData;

    // Find the order in our database
    const order = await supabaseService.findOrderByMerchantOrderId(merch_order_id);
    if (!order) {
      console.error('Order not found:', merch_order_id);
      return res.status(404).send('Order not found');
    }

    // Process based on trade status
    let orderStatus = 'pending';
    let shouldCreatePurchases = false;

    switch (trade_status) {
      case 'PAY_SUCCESS':
        orderStatus = 'completed';
        shouldCreatePurchases = true;
        break;
      case 'PAY_FAILED':
        orderStatus = 'failed';
        break;
      case 'ORDER_EXPIRED':
        orderStatus = 'expired';
        break;
      case 'ORDER_CLOSED':
        orderStatus = 'cancelled';
        break;
      default:
        console.log('Unhandled trade status:', trade_status);
        orderStatus = 'pending';
    }

    // Update order status
    await supabaseService.updateOrder(order.id, {
      status: orderStatus,
      kbz_order_id: mm_order_id,
      paid_amount: total_amount ? parseFloat(total_amount) : order.total_amount,
      paid_at: trade_status === 'PAY_SUCCESS' ? new Date().toISOString() : undefined,
      webhook_data: kbzPayData,
    });

    // If payment successful, create purchase records
    if (shouldCreatePurchases && trade_status === 'PAY_SUCCESS') {
      try {
        const purchases = order.book_ids.map((bookId: string, index: number) => ({
          user_id: order.user_id,
          book_id: bookId,
          amount: order.amounts[index],
          currency: 'MMK',
          payment_method: 'kbzpay',
          payment_id: mm_order_id || merch_order_id,
          status: 'completed',
          purchased_at: new Date().toISOString(),
        }));

        const results = await supabaseService.createPurchases(purchases);
        console.log(
          `Successfully created ${results.length} purchases for order ${merch_order_id}`
        );
      } catch (error) {
        console.error('Error creating purchases:', error);

        // Update order to indicate error in processing
        await supabaseService.updateOrder(order.id, {
          status: 'completed_with_errors',
          error_message: 'Failed to create purchase records',
        });
      }
    }

    // Return success response to KBZPay (must be plain text "success")
    res.status(200).send('success');
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return success to KBZPay to prevent retries, but log the error
    res.status(200).send('success');
  }
}

