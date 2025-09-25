import { NextRequest } from 'next/server'

// Redirect MPU webhook endpoint to KBZPay webhook handler
// This is needed because KBZPay is configured to send webhooks to /api/mpu/webhook
// but our implementation is at /api/kbzpay/webhook

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json()

    // Forward the request to the actual KBZPay webhook handler
    const url = new URL('/api/kbzpay/webhook', request.url)

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    // Return the same response
    const responseText = await response.text()
    return new Response(responseText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'text/plain'
      }
    })
  } catch (error) {
    console.error('MPU webhook redirect error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}