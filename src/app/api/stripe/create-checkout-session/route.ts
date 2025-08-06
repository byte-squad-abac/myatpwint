/**
 * Create Stripe Checkout Session API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, stripeConfig } from '@/lib/stripe/config';
import { getStripeProductForBook, getOrCreateShippingPrice } from '@/lib/stripe/products';
import { createClient } from '@supabase/supabase-js';

interface CheckoutSessionRequest {
  items: Array<{
    bookId: string;
    quantity: number;
    deliveryType: 'physical' | 'digital';
  }>;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Stripe Config Currency:', stripeConfig.currency);
    console.log('MMK to USD Rate:', stripeConfig.mmkToUsdRate);
    
    // Create Supabase client for database operations (RLS disabled for stripe_products)
    const supabaseServiceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );
    
    const body: CheckoutSessionRequest = await request.json();
    const { items, successUrl, cancelUrl, metadata = {} } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    // Get auth token from cookies manually to avoid Next.js issue
    const cookieHeader = request.headers.get('cookie');
    let userId = null;
    
    if (cookieHeader) {
      // Extract user from session (simplified for testing)
      try {
        const authCookie = cookieHeader
          .split(';')
          .find(c => c.trim().startsWith('sb-zuzzlrxxmrrovmlopdiy-auth-token'));
        
        if (authCookie) {
          // For now, use a test user ID - in production, decode the JWT properly
          userId = 'test-user-id'; // This is temporary for testing
        }
      } catch (e) {
        console.log('Could not extract user from cookie:', e);
      }
    }

    // Create fake Stripe customer for testing
    const stripeCustomer = await stripe.customers.create({
      email: 'test@example.com',
      metadata: {
        supabase_user_id: userId || 'anonymous',
      },
    });

    // Build line items for Stripe checkout
    const lineItems = [];
    let hasPhysicalItems = false;

    for (const item of items) {
      // Get Stripe product for this book using service role client
      const stripeProduct = await getStripeProductForBook(item.bookId, supabaseServiceClient);
      
      console.log('Stripe Product Currency:', stripeProduct.currency);
      console.log('Stripe Product Amount:', stripeProduct.unit_amount);
      
      lineItems.push({
        price: stripeProduct.stripe_price_id,
        quantity: item.quantity,
      });

      if (item.deliveryType === 'physical') {
        hasPhysicalItems = true;
      }
    }

    // Add shipping if there are physical items
    if (hasPhysicalItems) {
      const shippingPriceId = await getOrCreateShippingPrice();
      lineItems.push({
        price: shippingPriceId,
        quantity: 1,
      });
    }

    console.log('Line Items:', JSON.stringify(lineItems, null, 2));
    console.log('Session Currency:', stripeConfig.currency);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl || `${stripeConfig.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${stripeConfig.appUrl}/checkout`,
      automatic_tax: {
        enabled: false,
      },
      shipping_address_collection: hasPhysicalItems ? {
        allowed_countries: ['US', 'MM'], // Allow both US and Myanmar
      } : undefined,
      metadata: {
        user_id: userId || 'anonymous',
        has_physical_items: hasPhysicalItems.toString(),
        item_count: items.length.toString(),
        ...metadata,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}