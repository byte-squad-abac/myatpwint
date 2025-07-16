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
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

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
        <p>You are currently a user. Click below to apply for Author role.</p>
        {!showForm ? (
          <button onClick={handleApply}>Apply as Author</button>
        ) : (
          <form onSubmit={submitApplication} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <label>
              Legal Full Name:
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
              Author Name:
              <input type="text" value={authorName} onChange={e => setAuthorName(e.target.value)} required />
              Contact Number:
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
              Email:
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit">Submit Application</button>
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

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>✍️ Author Portal</h1>
      <p>You have Author role. Your email is {session?.user.email}</p>
      <p>Authors can submit manuscripts, track sales, and message publishers.</p>
      <a href="/author/manuscripts">Click to upload manuscript</a>

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