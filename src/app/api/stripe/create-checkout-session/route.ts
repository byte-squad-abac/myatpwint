/**
 * Create Stripe Checkout Session API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { stripeConfig } from '@/config';
import { getStripeProductForBook, getOrCreateShippingPrice } from '@/lib/stripe/products';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
    // Create Supabase client for database operations using service role (bypasses RLS)
    const supabaseServiceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // Get user from cookies - debug version
    const cookieStore = await cookies();
    let userId = null;
    let userEmail = 'test@example.com';

    // Debug: log all cookies
    const allCookies = cookieStore.getAll();
    console.log('All cookies found:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));

    // Try to find Supabase auth token
    const authCookie = allCookies.find(cookie => 
      cookie.name.includes('sb-') && cookie.name.includes('auth-token')
    );

    console.log('Auth cookie found:', authCookie ? 'Yes' : 'No');

    if (authCookie) {
      try {
        console.log('Parsing auth cookie:', authCookie.name);
        let cookieValue = decodeURIComponent(authCookie.value);
        
        // Handle base64 encoded values
        if (cookieValue.startsWith('base64-')) {
          console.log('Decoding base64 auth token');
          const base64Data = cookieValue.replace('base64-', '');
          cookieValue = atob(base64Data);
        }
        
        const authToken = JSON.parse(cookieValue);
        console.log('Auth token structure:', Array.isArray(authToken) ? 'array' : 'object');
        
        let jwt = null;
        if (Array.isArray(authToken) && authToken[0]) {
          jwt = authToken[0];
          console.log('Using JWT from array format');
        } else if (authToken.access_token) {
          jwt = authToken.access_token;
          console.log('Using JWT from object format');
        }

        if (jwt) {
          const supabaseAuthClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          
          const { data: { user }, error } = await supabaseAuthClient.auth.getUser(jwt);
          
          if (!error && user) {
            userId = user.id;
            userEmail = user.email || 'user@example.com';
            console.log('✅ User authenticated successfully:', { userId, userEmail });
          } else {
            console.error('❌ Auth validation failed:', error);
          }
        } else {
          console.log('❌ No JWT found in auth token');
        }
      } catch (e) {
        console.error('❌ Error parsing auth token:', e);
      }
    }

    if (!userId) {
      console.log('❌ No user found - returning 401');
      return NextResponse.json(
        { error: 'Authentication required - please log in first' },
        { status: 401 }
      );
    }

    // Check user role to prevent publishers and editors from purchasing
    const { data: profile, error: profileError } = await supabaseServiceClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      );
    }

    if (profile?.role === 'publisher' || profile?.role === 'editor') {
      return NextResponse.json(
        { 
          error: `${profile.role === 'publisher' ? 'Publishers' : 'Editors'} cannot purchase books`,
          roleRestriction: true
        },
        { status: 403 }
      );
    }

    // Create Stripe customer 
    const stripeCustomer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        supabase_user_id: userId,
      },
    });

    // Build line items for Stripe checkout
    const lineItems = [];
    let hasPhysicalItems = false;

    for (const item of items) {
      // Get Stripe product for this book
      const stripeProduct = await getStripeProductForBook(item.bookId);
      
      // Choose the correct price ID based on delivery type
      const priceId = item.deliveryType === 'physical' 
        ? (stripeProduct.physical_price_id || stripeProduct.digital_price_id)
        : stripeProduct.digital_price_id;

      if (!priceId) {
        throw new Error(`No price found for book ${item.bookId} with delivery type ${item.deliveryType}`);
      }
      
      lineItems.push({
        price: priceId,
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
        user_id: userId,
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