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

    // Create authenticated Supabase client to get current user
    const supabaseAuthClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get user from request (simplified approach)
    let userId = null;
    let userEmail = 'test@example.com';

    // For testing, let's use the authorization header or cookie
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');
    
    console.log('🍪 Cookie header:', cookieHeader);
    console.log('🔑 Auth header:', authHeader);
    
    // Extract real user from auth token
    if (cookieHeader?.includes('sb-zuzzlrxxmrrovmlopdiy-auth-token')) {
      try {
        // Parse the auth token cookie
        const authTokenMatch = cookieHeader.match(/sb-zuzzlrxxmrrovmlopdiy-auth-token=([^;]*)/);
        if (authTokenMatch) {
          const authTokenString = decodeURIComponent(authTokenMatch[1]);
          const authToken = JSON.parse(authTokenString);
          
          // Handle array format: [jwt_token, refresh_token, null, null, null]
          if (Array.isArray(authToken) && authToken[0]) {
            const jwt = authToken[0];
            const { data: { user }, error } = await supabaseAuthClient.auth.getUser(jwt);
            
            if (!error && user) {
              userId = user.id;
              userEmail = user.email || 'user@example.com';
              console.log('✅ Authenticated user for checkout (array format):', { userId, userEmail });
            } else {
              console.error('❌ Auth verification failed:', error);
            }
          }
          // Handle object format
          else if (authToken.access_token) {
            // Verify the token with Supabase and get real user
            const { data: { user }, error } = await supabaseAuthClient.auth.getUser(authToken.access_token);
            
            if (!error && user) {
              userId = user.id;
              userEmail = user.email || 'user@example.com';
              console.log('✅ Authenticated user for checkout (object format):', { userId, userEmail });
            } else {
              console.error('❌ Auth verification failed:', error);
            }
          }
        }
      } catch (e) {
        console.error('❌ Error parsing auth token:', e);
      }
    }

    // Fallback: try different cookie patterns
    if (!userId && cookieHeader) {
      console.log('🔍 Trying alternative cookie patterns...');
      
      // Try to find any Supabase-related auth cookies
      const supabaseCookiePatterns = [
        /sb-[^-]+-auth-token[^=]*=([^;]+)/,
        /supabase[^=]*=([^;]+)/,
        /_supabase_session=([^;]+)/
      ];
      
      for (const pattern of supabaseCookiePatterns) {
        const match = cookieHeader.match(pattern);
        if (match) {
          console.log('📍 Found potential auth cookie:', pattern.source);
          try {
            const tokenData = JSON.parse(decodeURIComponent(match[1]));
            console.log('📍 Token data keys:', Object.keys(tokenData));
            console.log('📍 Token data type:', Array.isArray(tokenData) ? 'array' : 'object');
            
            // Handle Supabase array format: [jwt_token, refresh_token, null, null, null]
            if (Array.isArray(tokenData) && tokenData[0]) {
              const jwt = tokenData[0];
              console.log('📍 Found JWT in array format');
              
              try {
                const { data: { user: authUser }, error } = await supabaseAuthClient.auth.getUser(jwt);
                if (!error && authUser) {
                  userId = authUser.id;
                  userEmail = authUser.email || 'user@example.com';
                  console.log('✅ Got user from JWT array format:', { userId, userEmail });
                  break;
                }
              } catch (jwtError) {
                console.log('❌ JWT verification failed:', jwtError.message);
              }
            }
            // Handle object format: { access_token: "...", user: {...} }
            else if (tokenData.access_token || tokenData.user) {
              const token = tokenData.access_token;
              const user = tokenData.user;
              
              if (token) {
                const { data: { user: authUser }, error } = await supabaseAuthClient.auth.getUser(token);
                if (!error && authUser) {
                  userId = authUser.id;
                  userEmail = authUser.email || 'user@example.com';
                  console.log('✅ Got user from object access_token:', { userId, userEmail });
                  break;
                }
              } else if (user?.id) {
                // Direct user object
                userId = user.id;
                userEmail = user.email || 'user@example.com';
                console.log('✅ Got user from direct user object:', { userId, userEmail });
                break;
              }
            }
          } catch (e) {
            console.log('❌ Failed to parse alternative cookie:', e.message);
          }
        }
      }
    }

    if (!userId) {
      console.log('❌ Could not authenticate user - no valid session found');
      return NextResponse.json(
        { 
          error: 'Authentication required - please log in first',
          debug: {
            hasCookie: !!cookieHeader,
            hasAuthHeader: !!authHeader,
            cookieContainsSupabase: cookieHeader?.includes('supabase') || false
          }
        },
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
      console.error('❌ Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      );
    }

    if (profile?.role === 'publisher' || profile?.role === 'editor') {
      console.log('❌ Purchase attempt by restricted role:', profile.role);
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