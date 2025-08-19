/**
 * N8N Book Published Webhook Trigger
 * Triggers the marketing automation workflow when a new book is published
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const bookData = await request.json();
    
    // Validate required book data
    if (!bookData.id || !bookData.name || !bookData.author) {
      return NextResponse.json(
        { error: 'Missing required book data: id, name, or author' },
        { status: 400 }
      );
    }

    // Prepare data for N8N workflow
    const n8nPayload = {
      id: bookData.id,
      name: bookData.name,
      author: bookData.author,
      description: bookData.description || '',
      category: bookData.category || 'General',
      price: bookData.price || 0,
      image_url: bookData.image_url || '',
      language: bookData.language || 'myanmar',
      published_date: bookData.published_date || new Date().toISOString(),
      edition: bookData.edition || '1st Edition',
      tags: bookData.tags || [],
      trigger_source: 'admin_publish',
      timestamp: new Date().toISOString()
    };

    // Trigger N8N Marketing Automation Workflow
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/book-published';
    
    console.log('🚀 Triggering N8N Marketing Automation for book:', bookData.name);
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'myatpwint-admin'
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!response.ok) {
      console.error('N8N webhook failed:', response.status, response.statusText);
      return NextResponse.json(
        { 
          error: 'Failed to trigger marketing automation',
          details: `N8N webhook returned ${response.status}`
        },
        { status: 500 }
      );
    }

    const n8nResult = await response.json();
    
    console.log('✅ N8N Marketing Automation triggered successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Marketing automation workflow triggered',
      book_id: bookData.id,
      workflow_triggered: true,
      n8n_response: n8nResult
    });

  } catch (error) {
    console.error('Error triggering book published workflow:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to trigger marketing automation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'N8N Book Published Webhook',
    description: 'Triggers marketing automation workflow when a book is published',
    method: 'POST',
    required_fields: ['id', 'name', 'author'],
    optional_fields: ['description', 'category', 'price', 'image_url', 'language'],
    example_payload: {
      id: 'book-uuid-here',
      name: 'Myanmar Literature Classic',
      author: 'Famous Author',
      description: 'A beautiful story...',
      category: 'Fiction',
      price: 15000,
      image_url: 'https://example.com/book-cover.jpg',
      language: 'myanmar'
    }
  });
}