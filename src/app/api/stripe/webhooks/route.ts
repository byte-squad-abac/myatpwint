/**
 * Stripe Webhooks Handler API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, stripeConfig, STRIPE_EVENTS } from '@/lib/stripe/config';
import { pyaToMmk } from '@/lib/stripe/products';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

// Create service role client to bypass RLS
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Disable body parsing for webhook signature verification
export const dynamic = 'force-dynamic';

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('🚀 Processing checkout session completed:', session.id);
    console.log('Session metadata:', session.metadata);

    const userId = session.metadata?.user_id;
    if (!userId) {
      console.error('❌ No user_id in session metadata:', session.metadata);
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

      // Get the original MMK price from book
      const { data: bookData } = await supabaseServiceRole
        .from('books')
        .select('price')
        .eq('id', bookId)
        .single();
      
      const originalPrice = bookData?.price || (price?.unit_amount || 0) / 100;

      // Create purchase record
      const purchaseData = {
        user_id: userId,
        book_id: bookId,
        purchase_price: originalPrice, // Store original MMK price
        purchase_type: 'purchase',
        payment_method: 'stripe',
        payment_status: 'succeeded',
        transaction_id: session.payment_intent as string,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_customer_id: session.customer as string,
        purchased_at: new Date().toISOString(),
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
        payment_status: 'succeeded',
        purchased_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', session.payment_intent as string)
      .eq('payment_status', 'pending');

    if (error) {
      throw new Error(`Failed to update purchase status: ${error.message}`);
    }

    console.log(`✅ Updated payment status for session ${session.id}`);

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
        payment_status: 'failed',
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
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
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