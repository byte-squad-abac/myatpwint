/**
 * Stripe Webhook Handler
 * Handles Stripe events like successful payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, stripeConfig } from '@/lib/stripe/config';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ Missing Stripe signature');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeConfig.webhookSecret
    );
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log(`🎉 Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'checkout.session.async_payment_succeeded':
        await handleAsyncPaymentSucceeded(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'checkout.session.async_payment_failed':
        await handleAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        console.log('💰 Payment succeeded:', event.data.object.id);
        break;

      case 'customer.created':
        console.log('👤 Customer created:', event.data.object.id);
        break;

      case 'price.created':
        console.log('💲 Price created:', event.data.object.id);
        break;

      default:
        console.log(`🔔 Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('🛒 Processing completed checkout session:', session.id);

  if (!session.metadata?.user_id) {
    console.error('❌ No user_id in session metadata');
    return;
  }

  // Get line items to know what was purchased
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product']
  });

  // Process each purchased item
  for (const item of lineItems.data) {
    const product = item.price?.product as Stripe.Product;
    if (!product?.metadata?.book_id) continue;

    const bookId = product.metadata.book_id;
    const quantity = item.quantity || 1;
    const deliveryType = product.metadata.delivery_type || 'digital';

    // Create purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: session.metadata.user_id,
        book_id: bookId,
        delivery_type: deliveryType as 'physical' | 'digital',
        quantity: quantity,
        unit_price: (item.amount_total || 0) / 100, // Convert from cents
        total_price: ((item.amount_total || 0) * quantity) / 100,
        purchase_price: (item.amount_total || 0) / 100, // Convert from cents
        stripe_payment_intent_id: session.payment_intent as string,
        status: 'completed'
      });

    if (purchaseError) {
      console.error('❌ Failed to create purchase record:', purchaseError);
    } else {
      console.log(`✅ Created purchase record for book ${bookId}`);
    }
  }

  // Log the successful transaction
  console.log(`💰 Payment completed: ${session.amount_total! / 100} ${session.currency?.toUpperCase()}`);
}

/**
 * Handle async payment success (for delayed payment methods)
 */
async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  console.log('⏰ Async payment succeeded for session:', session.id);
  // Same logic as checkout.session.completed
  await handleCheckoutSessionCompleted(session);
}

/**
 * Handle async payment failure
 */
async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  console.log('❌ Async payment failed for session:', session.id);
  
  // You might want to notify the user or update order status
  // For now, just log it
}

// GET endpoint for webhook info
export async function GET() {
  return NextResponse.json({
    message: 'Stripe Webhook Endpoint',
    endpoints: {
      webhook: 'POST /api/stripe/webhook',
      events: [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded', 
        'checkout.session.async_payment_failed',
        'payment_intent.succeeded'
      ]
    },
    status: 'active'
  });
}