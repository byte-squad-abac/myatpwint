import { NextResponse } from 'next/server'
import { N8NService } from '@/lib/services/n8n.service'

export async function GET() {
  try {
    const testResult = await N8NService.testConnection()
    
    return NextResponse.json({
      n8n_status: testResult.success ? 'connected' : 'failed',
      webhook_url: N8NService.getWebhookUrl(),
      message: testResult.message || testResult.error,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      n8n_status: 'error',
      webhook_url: N8NService.getWebhookUrl(),
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}