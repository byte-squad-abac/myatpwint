'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MarketingCampaign {
  id: string;
  book_id: string;
  campaign_type: string;
  status: string;
  content_generated: any;
  platforms_posted: string[];
  error_message: string | null;
  triggered_at: string;
  completed_at: string | null;
  book?: {
    name: string;
    author: string;
    category: string;
  };
}

export default function MarketingDashboard() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0
  });

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('n8n_marketing_analytics')
        .select(`
          *,
          book:books!book_id (
            name,
            author,
            category
          )
        `)
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setCampaigns(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const successful = data?.filter(c => c.status === 'success').length || 0;
      const failed = data?.filter(c => c.status === 'failed').length || 0;
      const pending = data?.filter(c => c.status === 'triggered').length || 0;
      
      setStats({ total, successful, failed, pending });
      
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'failed': return '#dc3545';
      case 'triggered': return '#ffc107';
      case 'partial': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '40px' }}>
        <h1>📊 Loading Marketing Dashboard...</h1>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>📊 N8N Marketing Automation Dashboard</h1>
      <p>Track your AI-powered marketing campaigns triggered by N8N workflows</p>

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>{stats.total}</h3>
          <p style={{ margin: 0, color: '#6c757d' }}>Total Campaigns</p>
        </div>
        
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          backgroundColor: '#d4edda', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>{stats.successful}</h3>
          <p style={{ margin: 0, color: '#155724' }}>Successful</p>
        </div>
        
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          backgroundColor: '#f8d7da', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#721c24' }}>{stats.failed}</h3>
          <p style={{ margin: 0, color: '#721c24' }}>Failed</p>
        </div>
        
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>{stats.pending}</h3>
          <p style={{ margin: 0, color: '#856404' }}>Pending</p>
        </div>
      </div>

      {/* Refresh Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={fetchCampaigns}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Campaigns
        </button>
      </div>

      {/* Campaigns List */}
      <div>
        <h2>📈 Recent Campaigns</h2>
        
        {campaigns.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px' 
          }}>
            <h3>🚀 No campaigns yet</h3>
            <p>Publish a book to trigger your first N8N marketing automation!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                      📖 {campaign.book?.name || 'Unknown Book'}
                    </h4>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      ✍️ <strong>Author:</strong> {campaign.book?.author || 'Unknown'}
                    </p>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      📂 <strong>Category:</strong> {campaign.book?.category || 'Unknown'}
                    </p>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      🕒 <strong>Triggered:</strong> {formatDate(campaign.triggered_at)}
                    </p>
                    {campaign.completed_at && (
                      <p style={{ margin: '5px 0', color: '#666' }}>
                        ✅ <strong>Completed:</strong> {formatDate(campaign.completed_at)}
                      </p>
                    )}
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: getStatusColor(campaign.status),
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      {campaign.status.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Platforms Posted */}
                {campaign.platforms_posted && campaign.platforms_posted.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <strong>🚀 Platforms Posted:</strong>
                    <div style={{ marginTop: '5px' }}>
                      {campaign.platforms_posted.map((platform, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            margin: '2px',
                            backgroundColor: '#e7f3ff',
                            color: '#0056b3',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {campaign.error_message && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '10px', 
                    backgroundColor: '#f8d7da', 
                    borderRadius: '4px',
                    border: '1px solid #f5c6cb'
                  }}>
                    <strong style={{ color: '#721c24' }}>❌ Error:</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#721c24' }}>
                      {campaign.error_message}
                    </p>
                  </div>
                )}

                {/* Generated Content Preview */}
                {campaign.content_generated && (
                  <details style={{ marginTop: '15px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#007bff' }}>
                      🤖 View AI Generated Content
                    </summary>
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '15px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}>
                      <pre style={{ 
                        whiteSpace: 'pre-wrap', 
                        fontSize: '14px',
                        margin: 0,
                        color: '#495057'
                      }}>
                        {JSON.stringify(campaign.content_generated, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo Instructions */}
      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#e7f3ff', 
        borderRadius: '8px' 
      }}>
        <h4>🎓 For Professors - What This Shows:</h4>
        <ul>
          <li><strong>Enterprise Automation:</strong> N8N workflow executions tracked in real-time</li>
          <li><strong>AI Content Generation:</strong> Google Gemini creates Myanmar + English marketing content</li>
          <li><strong>Multi-Platform Publishing:</strong> Facebook, Twitter, Email, Telegram automation</li>
          <li><strong>Error Handling:</strong> Failed campaigns logged with detailed error messages</li>
          <li><strong>Analytics:</strong> Campaign success rates and performance metrics</li>
          <li><strong>Cultural Relevance:</strong> Myanmar language support in AI-generated content</li>
        </ul>
      </div>
    </div>
  );
}