/**
 * N8N Stripe Webhook Forwarder
 * Forwards Stripe webhook events to N8N Revenue Analytics workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    let event;
    
    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (error) {
      console.error('Stripe webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Filter events we want to process in N8N
    const relevantEvents = [
      'checkout.session.completed',
      'payment_intent.succeeded',
      'invoice.payment_succeeded'
    ];

    if (!relevantEvents.includes(event.type)) {
      console.log(`Ignoring Stripe event: ${event.type}`);
      return NextResponse.json({ received: true, ignored: true, event_type: event.type });
    }

    console.log(`📊 Processing Stripe event for N8N: ${event.type}`);

    // Forward to N8N Revenue Analytics Workflow
    const n8nWebhookUrl = process.env.N8N_STRIPE_WEBHOOK_URL || 'http://localhost:5678/webhook/stripe-revenue';
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'myatpwint-stripe',
        'X-Event-Type': event.type
      },
      body: JSON.stringify({
        type: event.type,
        data: event.data,
        created: event.created,
        id: event.id,
        livemode: event.livemode,
        api_version: event.api_version,
        forwarded_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error('N8N revenue webhook failed:', response.status, response.statusText);
      return NextResponse.json(
        { 
          error: 'Failed to forward to N8N analytics',
          stripe_event_id: event.id,
          n8n_status: response.status
        },
        { status: 500 }
      );
    }

    const n8nResult = await response.json();
    
    console.log(`✅ Stripe event ${event.type} forwarded to N8N successfully`);
    
    return NextResponse.json({
      received: true,
      event_type: event.type,
      event_id: event.id,
      n8n_processed: true,
      n8n_response: n8nResult
    });

  } catch (error) {
    console.error('Error processing Stripe webhook for N8N:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook info
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'N8N Stripe Webhook Forwarder',
    description: 'Forwards Stripe payment events to N8N Revenue Analytics workflow',
    supported_events: [
      'checkout.session.completed',
      'payment_intent.succeeded', 
      'invoice.payment_succeeded'
    ],
    webhook_url: 'https://your-domain.com/api/n8n/stripe-webhook',
    note: 'Configure this URL in your Stripe Dashboard webhooks'
  });
}