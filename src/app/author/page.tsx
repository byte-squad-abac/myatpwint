'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import ConversationBox from '@/components/ConversationBox';

const publisherId = 'cf41c978-02bc-4bb6-a2f3-1fb5133f3f1a';

export default function AuthorPage() {
  const supabase = useSupabaseClient();
  const session  = useSession();
  const router   = useRouter();

  const [role, setRole]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorID, setAuthorID] = useState('');
  const [age, setAge] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontWeight: 600,
  fontSize: '0.95rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: 6,
  border: '1.5px solid #ccc',
  fontSize: '1rem',
  background: '#fff',
};

const addButton: React.CSSProperties = {
  background: '#e3f2fd',
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  cursor: 'pointer',
  fontWeight: 500,
  color: '#1a237e',
};

const clearButton: React.CSSProperties = {
  background: '#f44336',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
};

const cancelButton: React.CSSProperties = {
  background: '#eee',
  border: '1px solid #ccc',
  borderRadius: 6,
  padding: '8px 16px',
  fontWeight: 500,
  cursor: 'pointer',
};

const submitButton: React.CSSProperties = {
  background: '#1a237e',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  fontWeight: 600,
  cursor: 'pointer',
};


  useEffect(() => {
    const fetchRole = async () => {
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (data?.role) setRole(data.role);
      setLoading(false);
    };
    fetchRole();
  }, [session, supabase]);

  const handleApply = () => {
    setShowForm(true);
    setFullName(session?.user.user_metadata.full_name || '');
    setAuthorName(session?.user.user_metadata.author_name || '');
    setAuthorID(session?.user.user_metadata.author_id || '');
    setAge(session?.user.user_metadata.age || '');
    const rawLinks = session?.user.user_metadata.links;
    setLinks(Array.isArray(rawLinks) ? rawLinks : []);
    setPhone(session?.user.user_metadata.phone || '');
    setEmail(session?.user.email || '');
  };

  const submitApplication = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('profiles')
      .update({
        role: 'pending_author',
        name: fullName || 'Unnamed',
        author_name: authorName || 'Unnamed',
        author_id: authorID || 'Unknown',
        age: age || null,
        links: links.filter(link => !!link.trim()), // This is array of strings. Note by Lut Lat
        phone: phone || '',
        email: email || session?.user.email
      })
      .eq('id', session?.user.id);

    if (!error) {
      setRole('pending_author');
      router.refresh();
    }
  };

  if (loading || !session) return (
    <div style={{ marginTop: '40px' }}>
      You are not logged in. Please log in or sign up to access the Author Portal.<br />
      <button onClick={() => router.push('/login')}>Login</button>
    </div>
  );

  if (role === 'user') {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <h1>✍️ Become an Author</h1>
        <p>You are currently a user. You can apply to become an Author. Please be reminded that all fields marked with * are mandatory. Your information will not be shared publicly and will be only used for the purpose of your application. Publisher can and will disregard any application that does not meet the requirements. The application process takes usually 2 days and you will be notified via phone / email once your application has been reviewed.</p>
        {!showForm ? (
          <button onClick={handleApply}>Apply as Author</button>
        ) : (
          <form onSubmit={submitApplication} style={{ 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '20px', 
  marginTop: 20, 
  background: '#f9f9f9',
  padding: '24px',
  borderRadius: '12px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.06)' 
}}>
  {/* Full Name */}
  <div>
    <label style={labelStyle}>Legal Full Name *</label>
    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required style={inputStyle} placeholder='Enter Legal Name' />
  </div>

  {/* Author Name */}
  <div>
    <label style={labelStyle}>Author Name / Pen Name *</label>
    <input type="text" value={authorName} onChange={e => setAuthorName(e.target.value)} required style={inputStyle} placeholder='Enter Pen Name' />
  </div>

  {/* Author ID */}
  <div>
    <label style={labelStyle}>Author ID *</label>
    <input type="text" value={authorID} onChange={e => setAuthorID(e.target.value)} required style={inputStyle} placeholder='Enter registered Author ID issued by Author Association' />
  </div>

  {/* Age */}
  <div>
    <label style={labelStyle}>Age *</label>
    <input type="number" value={age} onChange={e => setAge(e.target.value)} required style={inputStyle} placeholder='Enter Age' />
  </div>

  {/* Links */}
  <div>
    <label style={labelStyle}>Links:</label>
    {links.map((link, index) => (
      <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          type="url"
          value={link}
          onChange={e => {
            const updatedLinks = [...links];
            updatedLinks[index] = e.target.value;
            setLinks(updatedLinks);
          }}
          required
          style={{ ...inputStyle, flex: 1 }}
          placeholder={`Link ${index + 1}`}
        />
        <button
          type="button"
          onClick={() => {
            const updated = links.filter((_, i) => i !== index);
            setLinks(updated);
          }}
          style={clearButton}
        >
          clear
        </button>
      </div>
    ))}
    <button type="button" onClick={() => setLinks([...links, ''])} style={addButton}>➕ Add link</button>
  </div>

  {/* Phone */}
  <div>
    <label style={labelStyle}>Contact Number *</label>
    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required style={inputStyle} placeholder='Enter Contact Number' />
  </div>

  {/* Email */}
  <div>
    <label style={labelStyle}>Email *</label>
    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder='Enter Email' />
  </div>

  {/* Actions */}
  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
    <button type="button" onClick={() => setShowForm(false)} style={cancelButton}>Cancel</button>
    <button type="submit" style={submitButton}>Submit Application</button>
  </div>
</form>

        )}
      </main>
    );
  }

  if (role === 'pending_author') {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <h1>✍️ Author Application Pending</h1>
        <p>Your application is being reviewed. Admin will contact you shortly.</p>
      </main>
    );
  }

  if (role === 'publisher' || role === 'editor') {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <h1>🚫 Access Denied</h1>
        <p>You are logged in as a {role}. This page is for Authors only.</p>
        <button onClick={() => router.push('/profile')}>Go to Profile</button>
      </main>
    );
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>✍️ Author Portal</h1>
      <p>You have <strong>Author</strong> role. Your contact email is {session?.user.email}</p>
      <p>Authors can submit manuscripts, track sales, and message publishers.</p>
      <a href="/author/manuscripts">
      <button>Manuscript Management</button>
      </a>

      <div style={{ marginTop: 32 }}>
        <h2>📨 Message the Publisher</h2>

        <ConversationBox
          myId={session.user.id}
          myRole="author"
          authorId={session.user.id}
          editorId={publisherId}
          author_name={session.user.user_metadata.author_name || session.user.user_metadata.full_name || 'Author'}
          editor_name="Publisher"
          sender_name={session.user.user_metadata.author_name || session.user.user_metadata.full_name || 'Author'}
        />
      </div>
    </main>
  );
}