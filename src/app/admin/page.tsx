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

export default function AdminPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [session]);

  const checkAdminAccess = async () => {
    if (!session) {
      router.push('/profile');
      return;
    }
    
    try {
      // Check if current user is publisher (admin)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.role !== 'publisher') {
        router.push('/profile');
        return;
      }

      setCurrentUser(profile);
      await fetchAllUsers();
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'author' | 'editor' | 'publisher') => {
    if (userId === session?.user.id && newRole !== 'publisher') {
      alert('You cannot change your own publisher role!');
      return;
    }

    // Prevent multiple publishers
    if (newRole === 'publisher' && users.some(u => u.role === 'publisher' && u.id !== userId)) {
      alert('There can only be one publisher on the platform!');
      return;
    }

    // Prevent multiple editors
    if (newRole === 'editor' && users.some(u => u.role === 'editor' && u.id !== userId)) {
      const currentEditor = users.find(u => u.role === 'editor');
      const confirmMessage = `There can only be one editor on the platform. Current editor is ${currentEditor?.name || currentEditor?.email}. Do you want to demote them and promote this user to editor?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
      
      // First demote the current editor to author
      try {
        const { error: demoteError } = await supabase
          .from('profiles')
          .update({ role: 'author' })
          .eq('id', currentEditor!.id);

        if (demoteError) {
          alert(`Failed to demote current editor: ${demoteError.message}`);
          return;
        }
      } catch (error) {
        console.error('Error demoting current editor:', error);
        alert('Failed to demote current editor.');
        return;
      }
    }

    setUpdating(userId);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        // Handle database constraint errors with better messages
        if (error.message.includes('Only one publisher is allowed')) {
          alert('Only one publisher is allowed on the platform!');
        } else if (error.message.includes('Only one editor is allowed')) {
          alert('Only one editor is allowed on the platform! The current editor must be demoted first.');
        } else {
          alert(`Failed to update role: ${error.message}`);
        }
        return;
      }
      
      await fetchAllUsers();
      alert('User role updated successfully!');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role.');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'publisher': return '#dc3545';
      case 'editor': return '#fd7e14';
      case 'author': return '#28a745';
      case 'user': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getRoleStats = () => {
    const stats = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: users.length,
      publishers: stats.publisher || 0,
      editors: stats.editor || 0,
      authors: stats.author || 0,
      users: stats.user || 0
    };
  };

  if (loading || !session) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'publisher') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Access Denied</h1>
        <p>This page is for platform administrators only.</p>
        <button onClick={() => router.push('/profile')}>Go to Profile</button>
      </div>
    );
  }

  const stats = getRoleStats();

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '30px', borderBottom: '1px solid #dee2e6', paddingBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#212529' }}>Platform Administration</h1>
        <p style={{ margin: 0, color: '#6c757d' }}>Manage user roles and platform access</p>
      </div>

      {/* Statistics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '30px' 
      }}>
        <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>Total Users</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>{stats.total}</p>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>Publishers</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>{stats.publishers}</p>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>Editors</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#fd7e14' }}>{stats.editors}</p>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>Authors</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{stats.authors}</p>
        </div>
      </div>

      {/* Role Constraints Info */}
      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#1565c0' }}>Role Constraints</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#1976d2' }}>
          <li>Only <strong>1 Publisher</strong> allowed (you are the publisher)</li>
          <li>Only <strong>1 Editor</strong> allowed {stats.editors > 0 && <span>(Currently: {users.find(u => u.role === 'editor')?.name || users.find(u => u.role === 'editor')?.email})</span>}</li>
          <li>Unlimited Authors and Users allowed</li>
          <li>Publishers and Editors cannot purchase books</li>
        </ul>
      </div>

      {/* User Management Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #dee2e6', overflow: 'hidden' }}>
        <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
          <h2 style={{ margin: 0, color: '#212529' }}>User Management</h2>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: '600' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: '600' }}>Current Role</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontWeight: '600' }}>Joined</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '500', color: '#212529' }}>
                        {user.name || 'No name set'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: getRoleColor(user.role),
                      color: 'white'
                    }}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#6c757d' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {user.id === session?.user.id ? (
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>Current User</span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                        disabled={updating === user.id}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #ced4da',
                          cursor: updating === user.id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <option value="user">Regular User</option>
                        <option value="author">Author</option>
                        <option value="editor">Editor</option>
                        <option value="publisher">Publisher</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <a
          href="/publisher"
          style={{
            color: '#007bff',
            textDecoration: 'none',
            fontSize: '14px',
            padding: '8px 16px',
            border: '1px solid #007bff',
            borderRadius: '4px',
            marginRight: '12px'
          }}
        >
          ← Back to Publisher Dashboard
        </a>
        <a
          href="/"
          style={{
            color: '#6c757d',
            textDecoration: 'none',
            fontSize: '14px',
            padding: '8px 16px',
            border: '1px solid #6c757d',
            borderRadius: '4px'
          }}
        >
          Home
        </a>
      </div>
    </div>
  );
}