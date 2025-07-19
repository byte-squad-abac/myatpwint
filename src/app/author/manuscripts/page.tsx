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
  const [authorname, setAuthorname] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [newFile, setNewFile] = useState<File>();
  const [statusMsg, setStatusMsg] = useState('');
  const [editTarget, setEditTarget] = useState<Manuscript | null>(null);
  const [editFile, setEditFile] = useState<File>();


  // Editor ID is hardcoded for now. Don't delete this line.
  const EDITOR_ID = '512f12f6-2c19-486c-9dcf-0d46720950b0'; // editor's user.id (myatpwint.editor@gmail.com)

  //   useEffect(() => {
  //   const fetchAuthors = async () => {
  //     const { data, error } = await supabase
  //       .from('profiles')
  //       .select('*')
  //       // .eq('role', 'pending_author');

  //     // if (data) setAuthorname(data);
  //   };
  //   fetchAuthors();
  // }, [supabase]);


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
  }, [session]);

  if (session === null) return <p style={{ padding: 40 }}>Loading session…</p>;
  if (!session) return <p style={{ padding: 40 }}>Please sign in.</p>;
  const uid = session.user.id;



  const handleNew = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFile) return setStatusMsg('Attach a file first');
    setStatusMsg('Uploading …');

    const safeName = newFile.name.replace(/\s+/g, '_');
    const path = `${uid}/${Date.now()}-${safeName}`;

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

    const safe = editFile.name.replace(/\s+/g, '_');
    const path = `${uid}/${Date.now()}-${safe}`;

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

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', paddingBottom: 80 }}>
      <h2 style={{ marginBottom: 12 }}>Submit new manuscript</h2>
      <form onSubmit={handleNew} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" required />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
        <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setNewFile(e.target.files?.[0])} required />
        <button type="submit" >Upload</button>
      </form>
      <p style={{ marginTop: 6, color: '#1a237e' }}>{statusMsg}</p>

      
        <div style={{ marginTop: 24 }}>
          <h2>Message with Editor</h2>
          
            
          {manuscripts.length === 0 && (
            <p style={{ color: '#666' }}>No manuscripts submitted yet. To start talking with Editor, please upload a manuscript first.</p>
            
          )}

          {manuscripts.length > 0 && (
            <ConversationBox
            myId={uid}
            myRole="author"
            authorId={uid}
            author_name={session?.user.user_metadata.full_name || session?.user.email || 'Unnamed'}
            editor_name="Editor" // Hardcoded for now / Author don't need to know editor's name
            sender_name={session?.user.user_metadata.full_name || session?.user.email || 'Unnamed'} // Author's name as sender
            editorId={EDITOR_ID}
          />
          )}
          
          
        </div>

      <h2 style={{ margin: '32px 0 12px' }}>Your manuscripts</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {manuscripts.map(m => (
          <li key={m.id} style={{ border: '1px solid #ccc', padding: 16, marginBottom: 12 }}>
            <strong>{m.title}</strong><br />
            <small>status: <em>{m.status}</em></small>
            {m.description && <p style={{ marginTop: 6 }}>{m.description}</p>}
            <a href={m.file_url} target="_blank" style={{ color: '#1976d2' }}>download / view</a>

            {m.status === 'returned' && (
              <>
                <p style={{ marginTop: 12, background: '#fff9c4', padding: 8, borderRadius: 6 }}>
                  <strong>Editor feedback:</strong><br />{m.feedback ?? '(no message)'}
                </p>
                {editTarget?.id !== m.id ? (
                  <button style={{ marginTop: 6 }} onClick={() => { setEditTarget(m); setEditFile(undefined); }}>
                    Fix &amp; resubmit
                  </button>
                ) : (
                  <form onSubmit={handleResubmit} style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setEditFile(e.target.files?.[0])} required />
                    <div>
                      <button type="submit">Upload new version</button>
                      <button type="button" style={{ marginLeft: 8 }} onClick={() => setEditTarget(null)}>cancel</button>
                    </div>
                  </form>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}