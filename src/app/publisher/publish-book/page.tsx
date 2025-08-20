'use client';

import { useState } from 'react';
import { BooksService } from '@/lib/services/books.service';
import { N8NService } from '@/lib/services/n8n.service';

export default function PublishBookPage() {
  const [formData, setFormData] = useState({
    name: 'မြန်မာ့ ရှေးဟောင်း သမိုင်း',
    author: 'မင်းလွင်',
    description: 'မြန်မာနိုင်ငံ၏ ရှေးဟောင်းသမိုင်းကို အသေးစိတ် လေ့လာနိုင်သော စာအုပ်ကောင်း',
    category: 'History',
    tags: ['မြန်မာ', 'သမိုင်း', 'ရှေးဟောင်း', 'history'],
    price: 18000,
    edition: 'First Edition',
    image_url: '/images/myanmar-history-book.jpg'
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any>(null);
  const [n8nStatus, setN8nStatus] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tags' ? value.split(',').map(tag => tag.trim()) : 
              name === 'price' ? parseInt(value) || 0 : value
    }));
  };

  const testN8NConnection = async () => {
    try {
      setN8nStatus('Testing...');
      const response = await fetch('/api/books/publish');
      const result = await response.json();
      setN8nStatus(result);
    } catch (error) {
      setN8nStatus({ error: 'Connection failed' });
    }
  };

  const publishBook = async () => {
    setIsPublishing(true);
    setPublishResult(null);

    try {
      console.log('📚 Publishing book with N8N automation...');
      const result = await BooksService.publishBook(formData);
      
      setPublishResult({
        success: true,
        book: result,
        message: 'Book published successfully! Marketing automation triggered.'
      });

      console.log('✅ Book published:', result);
      
    } catch (error) {
      console.error('❌ Publishing failed:', error);
      setPublishResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>📚 Publish Book with N8N Marketing Automation</h1>
      
      {/* N8N Status Test */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>🔗 N8N Connection Status</h3>
        <button onClick={testN8NConnection} style={{ marginRight: '10px' }}>
          Test N8N Connection
        </button>
        {n8nStatus && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <pre>{JSON.stringify(n8nStatus, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Book Publishing Form */}
      <div style={{ marginBottom: '20px' }}>
        <h3>📖 Book Details</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Title (Myanmar/English):
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Author:
          </label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Description:
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Category:
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="History">History</option>
              <option value="Literature">Literature</option>
              <option value="Fiction">Fiction</option>
              <option value="Children">Children</option>
              <option value="Education">Education</option>
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Price (MMK):
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Tags (comma-separated):
          </label>
          <input
            type="text"
            name="tags"
            value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            placeholder="မြန်မာ, သမိုင်း, history"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Edition:
          </label>
          <input
            type="text"
            name="edition"
            value={formData.edition}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Publish Button */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={publishBook}
          disabled={isPublishing}
          style={{
            backgroundColor: isPublishing ? '#ccc' : '#007bff',
            color: 'white',
            padding: '12px 30px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: isPublishing ? 'not-allowed' : 'pointer'
          }}
        >
          {isPublishing ? '🚀 Publishing & Triggering N8N...' : '📚 Publish Book + N8N Automation'}
        </button>
      </div>

      {/* Result Display */}
      {publishResult && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: publishResult.success ? '#d4edda' : '#f8d7da'
        }}>
          <h3>{publishResult.success ? '✅ Success!' : '❌ Error'}</h3>
          
          {publishResult.success ? (
            <div>
              <p><strong>📖 Book ID:</strong> {publishResult.book.id}</p>
              <p><strong>📚 Title:</strong> {publishResult.book.name}</p>
              <p><strong>✍️ Author:</strong> {publishResult.book.author}</p>
              <p><strong>🚀 Marketing Automation:</strong> Triggered via N8N</p>
              <p><strong>📱 Platforms:</strong> Facebook, Twitter, Email, Telegram</p>
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <strong>🎯 What happens next:</strong>
                <ul>
                  <li>✅ Book saved to database</li>
                  <li>🤖 AI generates Myanmar + English content</li>
                  <li>📘 Facebook post created</li>
                  <li>🐦 Twitter post published</li>
                  <li>📧 Email campaign sent</li>
                  <li>💬 Telegram notification sent</li>
                </ul>
              </div>
            </div>
          ) : (
            <p><strong>Error:</strong> {publishResult.error}</p>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
        <h4>🎓 Demo Instructions for Professors:</h4>
        <ol>
          <li>First click "Test N8N Connection" to verify N8N is running</li>
          <li>Edit the book details above (try different Myanmar books)</li>
          <li>Click "Publish Book + N8N Automation"</li>
          <li>Watch as the book gets published and N8N workflow triggers</li>
          <li>Check your N8N interface to see the workflow execution</li>
          <li>Verify marketing content generated on all platforms</li>
        </ol>
      </div>
    </div>
  );
}