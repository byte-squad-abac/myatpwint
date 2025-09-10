/**
 * N8N Marketing Automation Integration Service
 * Triggers marketing workflows when books are published
 */

import { Book, N8NWebhookPayload, N8NResponse } from '@/types';

export class N8NService {
  private static readonly WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/6960fcf1-92c8-4a9c-b54a-7ba6eb296d10';
  
  /**
   * Trigger N8N marketing workflow when book is published
   */
  static async triggerBookPublishedWorkflow(bookData: Book): Promise<N8NResponse> {
    try {
      // Prepare payload for N8N workflow
      const payload: N8NWebhookPayload = {
        id: bookData.id,
        name: bookData.name,
        author: bookData.author,
        description: bookData.description,
        category: bookData.category,
        tags: bookData.tags || [],
        price: bookData.price,
        image_url: bookData.image_url,
        published_date: bookData.published_date,
        edition: bookData.edition,
        timestamp: new Date().toISOString(),
        event: 'book_published'
      };

      console.log('🚀 Triggering N8N marketing automation for book:', bookData.name);
      
      // Send webhook to N8N
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MyatPwint-BookPublishing/2.0'
        },
        body: JSON.stringify(payload),
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
      }

      // Handle N8N response - it might not return JSON
      let result = null;
      try {
        const responseText = await response.text();
        if (responseText.trim()) {
          result = JSON.parse(responseText);
        }
      } catch {
        // N8N webhook executed successfully but didn't return JSON
        console.log('✅ N8N webhook triggered (no JSON response)');
        result = { message: 'Webhook executed successfully' };
      }
      
      console.log('✅ N8N marketing automation triggered successfully');
      console.log('📊 Generated content for platforms: Facebook, Instagram, Email, Telegram');
      
      // Log analytics to database (async, don't await)
      this.logMarketingCampaign(bookData.id, 'success', null, ['facebook', 'instagram', 'email', 'telegram'], result).catch(console.error);
      
      return {
        success: true,
        message: 'Marketing automation triggered successfully'
      };
      
    } catch (error) {
      console.error('❌ N8N webhook error:', error);
      
      // Log failed campaign (async, don't await)
      this.logMarketingCampaign(bookData.id, 'failed', error instanceof Error ? error.message : 'Unknown error', [], null).catch(console.error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log marketing campaign to analytics table
   */
  private static async logMarketingCampaign(
    bookId: string,
    status: 'triggered' | 'success' | 'failed',
    errorMessage: string | null,
    platformsPosted: string[] = [],
    contentGenerated: Record<string, unknown> | null = null
  ): Promise<void> {
    try {
      // Import supabase dynamically to avoid circular dependencies
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const insertData: Record<string, unknown> = {
        book_id: bookId,
        campaign_type: 'automated_marketing',
        status: status,
        error_message: errorMessage,
        platforms_posted: platformsPosted,
        content_generated: contentGenerated,
        triggered_at: new Date().toISOString()
      };

      if (status === 'success' || status === 'failed') {
        insertData.completed_at = new Date().toISOString();
      }

      await supabase.from('n8n_marketing_analytics').insert(insertData);
      
    } catch (error) {
      console.error('Failed to log marketing campaign:', error);
    }
  }

  /**
   * Test N8N webhook connection
   */
  static async testConnection(): Promise<N8NResponse> {
    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'N8N connection test from MyatPwint v2 app'
      };

      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.status}`);
      }

      return {
        success: true,
        message: 'N8N connection successful'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Get webhook URL for debugging
   */
  static getWebhookUrl(): string {
    return this.WEBHOOK_URL;
  }
}