/**
 * Stripe Webhooks Handler API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_EVENTS } from '@/lib/stripe/config';
import { stripeConfig } from '@/config';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

// Create service role client to bypass RLS
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Disable body parsing for webhook signature verification
export const dynamic = 'force-dynamic';

async function checkAndSendLowStockAlert(bookId: string) {
  try {
    // Get book details and current stock
    const { data: book, error: bookError } = await supabaseServiceRole
      .from('books')
      .select('id, name, low_stock_threshold')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      console.error('❌ Error fetching book for low stock check:', bookError);
      return;
    }

    // Get current available stock
    const { data: availableStock, error: stockError } = await supabaseServiceRole
      .rpc('get_available_stock', { book_id_param: bookId });

    if (stockError) {
      console.error('❌ Error getting available stock:', stockError);
      return;
    }

    const threshold = book.low_stock_threshold || 10;
    
    // If stock is at or below threshold, send alert
    if (availableStock <= threshold) {
      console.log(`📧 Low stock detected for "${book.name}": ${availableStock} <= ${threshold}`);
      
      // Call our email API
      const baseUrl = process.env.NODE_ENV === 'production'
        ? (process.env.NEXT_PUBLIC_PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
        : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

      const response = await fetch(`${baseUrl}/api/send-low-stock-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          bookName: book.name,
          availableStock,
          threshold
        })
      });

      if (response.ok) {
        console.log(`✅ Low stock email sent successfully for "${book.name}"`);
      } else {
        console.error(`❌ Failed to send low stock email for "${book.name}":`, response.status);
      }
    }
  } catch (error) {
    console.error('❌ Error in checkAndSendLowStockAlert:', error);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('🚀 Processing checkout session completed:', session.id);

    const userId = session.metadata?.user_id;
    if (!userId) {
      throw new Error('No user_id in session metadata');
    }

    // Retrieve the session with line items
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items', 'line_items.data.price.product'],
    });

    const lineItems = sessionWithLineItems.line_items?.data || [];
    const purchases = [];

    for (const item of lineItems) {
      const price = item.price;
      const product = price?.product as Stripe.Product;

      // Skip shipping items
      if (product.id === 'shipping_mmk') {
        continue;
      }

      // Extract book_id from product metadata
      const bookId = product.metadata?.book_id;
      if (!bookId) {
        console.warn('No book_id found in product metadata for product:', product.id);
        continue;
      }

      // Determine delivery type from price metadata or product metadata
      const deliveryType = price?.metadata?.delivery_type || 'digital';

      // Get the original MMK price from book
      const { data: bookData } = await supabaseServiceRole
        .from('books')
        .select('price')
        .eq('id', bookId)
        .single();
      
      const originalPrice = bookData?.price || 0;
      const quantity = item.quantity || 1;

      // Create purchase record
      const purchaseData = {
        user_id: userId,
        book_id: bookId,
        delivery_type: deliveryType as 'physical' | 'digital',
        quantity: quantity,
        unit_price: originalPrice,
        total_price: originalPrice * quantity,
        purchase_price: originalPrice * quantity, // Store original MMK price
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent as string,
      };

      purchases.push(purchaseData);
    }

    if (purchases.length > 0) {
      console.log('💾 Saving purchases:', purchases);
      const { error } = await supabaseServiceRole
        .from('purchases')
        .insert(purchases);

      if (error) {
        console.error('❌ Failed to save purchases:', error);
        throw new Error(`Failed to save purchases: ${error.message}`);
      }

      console.log(`✅ Successfully processed ${purchases.length} purchases for session ${session.id}`);
      
      // Check for low stock alerts on physical purchases
      for (const purchase of purchases) {
        if (purchase.delivery_type === 'physical') {
          await checkAndSendLowStockAlert(purchase.book_id);
        }
      }
      
      // Note: No need to manually update physical_copies_count here
      // Our database function get_available_physical_copies() automatically calculates:
      // available_copies = physical_copies_count - SUM(purchases.quantity) 
      // So just saving the purchase record is enough
      console.log('📦 Physical purchases recorded - inventory will be calculated dynamically')
    } else {
      console.warn('⚠️ No valid purchases found in session:', session.id);
    }

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

async function handleCheckoutSessionAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing async payment succeeded:', session.id);

    // Update payment status for existing purchases
    const { error } = await supabaseServiceRole
      .from('purchases')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', session.payment_intent as string)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to update purchase status: ${error.message}`);
    }

    console.log(`✅ Updated payment status for session ${session.id}`);
    
    // Note: No inventory updates needed - database function calculates availability dynamically

  } catch (error) {
    console.error('Error handling async payment succeeded:', error);
    throw error;
  }
}

async function handleCheckoutSessionAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing async payment failed:', session.id);

    // Update payment status for existing purchases
    const { error } = await supabaseServiceRole
      .from('purchases')
      .update({
        status: 'cancelled',
      })
      .eq('stripe_payment_intent_id', session.payment_intent as string);

    if (error) {
      throw new Error(`Failed to update purchase status: ${error.message}`);
    }

    console.log(`✅ Updated failed payment status for session ${session.id}`);

  } catch (error) {
    console.error('Error handling async payment failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    if (!stripeConfig.webhookSecret) {
      console.error('Webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeConfig.webhookSecret
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Webhook signature verification failed:', message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('Received Stripe webhook:', event.type);

    // Handle the event
    switch (event.type) {
      case STRIPE_EVENTS.CHECKOUT_SESSION_COMPLETED:
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case STRIPE_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_SUCCEEDED:
        await handleCheckoutSessionAsyncPaymentSucceeded(event.data.object as Stripe.Checkout.Session);
        break;

      case STRIPE_EVENTS.CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED:
        await handleCheckoutSessionAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session);
        break;

      case STRIPE_EVENTS.PAYMENT_INTENT_SUCCEEDED:
        console.log('Payment intent succeeded:', event.data.object.id);
        // Additional handling for payment intent if needed
        break;

      case STRIPE_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED:
        console.log('Payment intent failed:', event.data.object.id);
        // Additional handling for payment failures if needed
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}