'use client';

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import ConversationBox from '@/components/ConversationBox';

/* ---------- types ---------- */
type Manuscript = {
  id:          string;
  title:       string;
  description: string | null;
  status:      'need_review' | 'waiting_upload' | 'published' | 'returned';
  file_url:    string;
  feedback:    string | null;
  created_at:  string;
  editor_id?:  string | null;
};

export default function AuthorManuscripts() {
  const supabase = useSupabaseClient();
  const session  = useSession();
  const router   = useRouter();

  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [title, setTitle] = useState('');
  const [authorname, setAuthorname] = useState<string>('Author');
  const [description, setDescription] = useState('');
  const [newFile, setNewFile] = useState<File>();
  const [statusMsg, setStatusMsg] = useState('');
  const [editTarget, setEditTarget] = useState<Manuscript | null>(null);
  const [editFile, setEditFile] = useState<File>();
  const [selectedChat, setSelectedChat] = useState<Manuscript | null>(null);



  // Editor ID is hardcoded for now. Don't delete this line.
  const EDITOR_ID = '512f12f6-2c19-486c-9dcf-0d46720950b0'; // editor's user.id (myatpwint.editor@gmail.com)


const fetchAuthors = async () => { // Function to fetch author name
  if (!session) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('author_name')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error("Error fetching author name:", error);
    return;
  }

  const authorName = data?.author_name || 'Author';  // Fallback to 'Author' if no name
  setAuthorname(authorName);  // Store it in state or use as needed
};

  const loadManuscripts = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('author_id', session.user.id)
      .order('created_at', { ascending: false });

    setManuscripts(data ?? []);
  };

  

  useEffect(() => {
    loadManuscripts();
    if (session) fetchAuthors();
  }, [session]);

  if (session === null) return <p style={{ padding: 40 }}>Loading session…</p>;
  if (!session) return <p style={{ padding: 40 }}>Please sign in.</p>;
  const uid = session.user.id;



  const handleNew = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFile) return setStatusMsg('Attach a file first');
    setStatusMsg('Uploading …');

    const safeName = newFile.name.replace(/\s+/g, '_');
    const safeAuthorName = (authorname ?? session?.user.email ?? 'Unnamed').replace(/\s+/g, '_');
    const safeTitle = title.replace(/\s+/g, '_');
    const path = `${safeAuthorName}/${safeTitle}/${Date.now()}-${safeName}`;


    const { error: upErr } = await supabase.storage.from('manuscripts').upload(path, newFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: newFile.type
    });
    if (upErr) return setStatusMsg(`❌ Upload failed: ${upErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from('manuscripts').getPublicUrl(path);

    const { error: dbErr } = await supabase.from('manuscripts').insert({
      author_id: uid,
      title,
      author_name: session?.user.user_metadata.full_name || session?.user.email || 'Unnamed',
      description,
      file_url: publicUrl,
      status: 'need_review'
    });
    if (dbErr) return setStatusMsg(`DB error: ${dbErr.message}`);

    setStatusMsg('✅ Submitted!');
    setTitle('');
    setDescription(''); 
    setNewFile(undefined);
    await loadManuscripts();
    router.refresh();
  };

  const handleResubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editFile) return setStatusMsg('Attach a replacement file');
    setStatusMsg('Re-uploading …');

    const safe = editFile.name.replace(/\s+/g, '_');  // File Name Sanitization
    const safeAuthorName = (authorname ?? session?.user.email ?? 'Unnamed').replace(/\s+/g, '_');
    const safeTitle = editTarget?.title.replace(/\s+/g, '_');
    const path = `${safeAuthorName}/${safeTitle}/${Date.now()}-${safe}`;


    const { error: upErr } = await supabase.storage.from('manuscripts').upload(path, editFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: editFile.type
    });
    if (upErr) return setStatusMsg(`❌ Upload failed: ${upErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from('manuscripts').getPublicUrl(path);

    const { error: upDbErr } = await supabase
      .from('manuscripts')
      .update({ file_url: publicUrl, status: 'need_review', feedback: null })
      .eq('id', editTarget.id);

    if (upDbErr) return setStatusMsg(`DB error: ${upDbErr.message}`);

    setStatusMsg('✅ Resubmitted!');
    setEditTarget(null); setEditFile(undefined);
    await loadManuscripts();
  };

  const inputStyle: React.CSSProperties = {
  padding: '10px',
  fontSize: '16px',
  border: '1px solid #ccc',
  borderRadius: '6px',
  width: '100%',
  boxSizing: 'border-box'
};

const primaryButton: React.CSSProperties = {
  padding: '10px 16px',
  backgroundColor: '#1a237e',
  color: '#fff',
  fontWeight: 600,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
};

const secondaryButton: React.CSSProperties = {
  padding: '10px 16px',
  backgroundColor: '#f5f5f5',
  color: '#333',
  fontWeight: 600,
  border: '1px solid #ccc',
  borderRadius: 6,
  marginLeft: 8,
  cursor: 'pointer'
};

  return (
    <div style={{
  maxWidth: '800px',
  margin: '40px auto',
  padding: '32px',
  backgroundColor: '#fafafa',
  borderRadius: '12px',
  boxShadow: '0 0 20px rgba(0,0,0,0.05)',
  fontFamily: 'sans-serif'
}}>
  <h2 style={{ fontSize: '24px', fontWeight: '600' }}>📚 Publish New Book</h2>
  
  <form onSubmit={handleNew} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
    <label>
      <span style={{ fontWeight: 600 }}>Title</span>
      <input value={title} onChange={e => setTitle(e.target.value)} required
        style={inputStyle} />
    </label>

    <label>
      <span style={{ fontWeight: 600 }}>Short Description</span>
      <textarea value={description} onChange={e => setDescription(e.target.value)}
        style={{ ...inputStyle, height: 100 }} />
    </label>

    <label>
      <span style={{ fontWeight: 600 }}>Upload Manuscript (PDF or DOCX)</span>
      <input type="file" accept=".pdf,.doc,.docx" onChange={e => setNewFile(e.target.files?.[0])}
        style={inputStyle} required />
    </label>

    <button type="submit" style={primaryButton}>🚀 Submit for Review</button>
    {statusMsg && <p style={{ color: '#1a237e' }}>{statusMsg}</p>}
  </form>

  

  <h2 style={{ margin: '48px 0 16px', fontSize: '22px' }}>📂 Your Manuscripts</h2>
  <ul style={{ listStyle: 'none', padding: 0 }}>
    {manuscripts.map(m => (
      <li key={m.id} style={{
        border: '1px solid #ccc',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#fff'
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{m.title}</div>
        <div style={{
          fontSize: 14,
          marginTop: 4,
          padding: '4px 8px',
          borderRadius: 6,
          display: 'inline-block',
          backgroundColor: m.status === 'returned' ? '#fff3e0' : '#e3f2fd',
          color: '#333',
          fontWeight: 500
        }}>
          Status: {m.status}
        </div>

        {m.description && <p style={{ marginTop: 12 }}>{m.description}</p>}
        <a href={m.file_url} target="_blank" style={{ color: '#1976d2', display: 'inline-block', marginTop: 4 }}>
          📄 View or Download
        </a>

        {m.status === 'returned' && (
          <>
            <p style={{ marginTop: 12, backgroundColor: '#fffde7', padding: 10, borderRadius: 6 }}>
              <strong>Editor Feedback:</strong><br />
              {m.feedback ?? '(No message)'}
            </p>

            {editTarget?.id !== m.id ? (
              <button
                style={{ marginTop: 10, ...primaryButton }}
                onClick={() => { setEditTarget(m); setEditFile(undefined); }}>
                🔁 Fix & Resubmit
              </button>
            ) : (
              <form onSubmit={handleResubmit} style={{ marginTop: 12 }}>
                <input type="file" accept=".pdf,.doc,.docx"
                  onChange={(e) => setEditFile(e.target.files?.[0])}
                  required style={inputStyle} />
                <div style={{ marginTop: 8 }}>
                  <button type="submit" style={primaryButton}>Upload New Version</button>
                  <button type="button" style={secondaryButton} onClick={() => setEditTarget(null)}>Cancel</button>
                </div>
              </form>
            )}
          </>
        )}
        <button
          style={{ ...primaryButton, marginTop: 10 }}
          onClick={() => setSelectedChat(m)}
        >
          💬 Chat
        </button>
      </li>
      
    ))}
    
    {selectedChat && (
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          border: '1px solid #ccc',
          padding: 24,
          borderRadius: 10,
          zIndex: 2000,
          width: 'min(520px,90%)',
        }}
      >
        <h3>Chat with Editor (Manuscript: {selectedChat.title})</h3>
        <ConversationBox
          room_id={selectedChat.id} // ✅ use manuscript.id as room_id
          myId={uid}
          myRole="author"
          authorId={uid}
          author_name={session?.user.user_metadata.full_name || session?.user.email || 'Unnamed'}
          editor_name="Editor"
          sender_name={session?.user.user_metadata.full_name || session?.user.email || 'Unnamed'}
          editorId={selectedChat.editor_id ?? EDITOR_ID}
        />
        <button onClick={() => setSelectedChat(null)} style={{ marginTop: 12 }}>
          Close
        </button>
      </div>
    )}
  </ul>
</div>

  );
}