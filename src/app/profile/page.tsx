'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';

type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'author' | 'editor' | 'publisher';
  phone: string | null;
  created_at: string;
};

export default function ProfilePage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    role: 'user' as 'user' | 'author' | 'editor' | 'publisher',
    phone: ''
  });

  useEffect(() => {
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    if (!session) return;
    
    try {
      // First, check if user exists in auth.users table
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser.user) {
        console.error('Auth user not found:', authError);
        
        // If JWT is invalid, clear the session and redirect
        if (authError?.message?.includes('does not exist')) {
          console.log('Clearing invalid session...');
          await supabase.auth.signOut();
          router.push('/?auth=1');
          return;
        }
        return;
      }

      console.log('Auth user ID:', authUser.user.id);
      console.log('Session user ID:', session.user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        return;
      }

      if (data) {
        setProfile(data);
        setFormData({
          name: data.name || '',
          role: data.role,
          phone: data.phone || ''
        });
      } else {
        // Profile will be created automatically by database trigger
        // Wait a moment and retry
        setTimeout(() => {
          if (!profile) {
            fetchProfile();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !profile) return;

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name || null,
          role: formData.role,
          phone: formData.phone || null
        })
        .eq('id', session.user.id);

      if (error) throw error;

      // Refresh profile data
      await fetchProfile();
      alert('Profile updated successfully!');

    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') localStorage.clear();
    router.replace('/?auth=1');
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'user': return 'Regular user - can browse and purchase books';
      case 'author': return 'Author - can submit manuscripts for review and publication';
      case 'editor': return 'Editor - can review and approve/reject manuscripts';
      case 'publisher': return 'Publisher - can publish books and manage the platform (admin level)';
      default: return '';
    }
  };

  const getRoleDashboardLink = (role: string) => {
    switch (role) {
      case 'author': return '/author';
      case 'editor': return '/editor';
      case 'publisher': return '/publisher';
      default: return '/';
    }
  };

  if (loading || !session) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto', padding: 32, background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 700, fontSize: '2rem', marginBottom: 24 }}>Profile</h2>
        <div style={{ color: '#888', fontSize: '1.1rem' }}>
          You are not signed in.
          <br />
          <button
            onClick={() => router.replace('/?auth=1')}
            style={{ padding: '8px 24px', borderRadius: 8, border: '1.5px solid #1a237e', background: '#fff', color: '#1a237e', fontWeight: 700, marginTop: 12, fontSize: '1.05rem', cursor: 'pointer' }}
          >
            Go to log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '30px', borderBottom: '1px solid #dee2e6', paddingBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#212529' }}>Your Profile</h1>
        <p style={{ margin: 0, color: '#6c757d' }}>Manage your account settings and role</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Email (readonly) */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Email Address
            </label>
            <input
              type="email"
              value={session.user.email || ''}
              readOnly
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f8f9fa',
                color: '#6c757d'
              }}
            />
            <small style={{ color: '#6c757d' }}>Email cannot be changed</small>
          </div>

          {/* Name */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Role Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              Account Type
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="user">Regular User</option>
              <option value="author">Author</option>
              {/* Editor and Publisher roles can only be assigned by admin */}
              {(profile?.role === 'editor' || profile?.role === 'publisher') && (
                <>
                  <option value="editor">Editor</option>
                  <option value="publisher">Publisher (Admin)</option>
                </>
              )}
            </select>
            <div style={{ 
              marginTop: '8px', 
              padding: '8px 12px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '4px',
              fontSize: '14px',
              color: '#0d47a1'
            }}>
              {getRoleDescription(formData.role)}
            </div>
            
            {/* Role Restriction Notice */}
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: '#fff3cd',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#856404',
              border: '1px solid #ffeaa7'
            }}>
              <strong>Note:</strong> Editor and Publisher roles are restricted and can only be assigned by the platform administrator.
            </div>
          </div>

          {/* Current Role Dashboard Link */}
          {profile && profile.role !== 'user' && (
            <div style={{
              padding: '12px',
              backgroundColor: '#d4edda',
              borderRadius: '4px',
              border: '1px solid #c3e6cb'
            }}>
              <strong style={{ color: '#155724' }}>Current Role: {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</strong>
              <br />
              <a
                href={getRoleDashboardLink(profile.role)}
                style={{
                  color: '#155724',
                  textDecoration: 'underline',
                  marginTop: '4px',
                  display: 'inline-block'
                }}
              >
                Go to {profile.role} dashboard →
              </a>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={updating}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: updating ? 'not-allowed' : 'pointer',
              opacity: updating ? 0.6 : 1
            }}
          >
            {updating ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>

      {/* Account Info */}
      {profile && (
        <div style={{ 
          marginTop: '30px', 
          padding: '16px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Account Information</h3>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#6c757d' }}>
            <strong>Account Created:</strong> {new Date(profile.created_at).toLocaleDateString()}
          </p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#6c757d' }}>
            <strong>Current Role:</strong> {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
          </p>
        </div>
      )}

      {/* Logout and Navigation */}
      <div style={{ marginTop: '30px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <a
          href="/"
          style={{
            color: '#007bff',
            textDecoration: 'none',
            fontSize: '14px',
            padding: '8px 16px',
            border: '1px solid #007bff',
            borderRadius: '4px'
          }}
        >
          ← Back to Home
        </a>
        <button 
          onClick={handleLogout} 
          style={{ 
            padding: '8px 16px', 
            borderRadius: '4px', 
            border: '1px solid #dc3545', 
            background: '#fff', 
            color: '#dc3545', 
            fontWeight: '500', 
            fontSize: '14px', 
            cursor: 'pointer' 
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
