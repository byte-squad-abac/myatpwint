'use client';

import { useEffect, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import ConversationBox from '@/components/ConversationBox';

/* ---------- Types ---------- */
type Manuscript = {
  id: string;
  title: string;
  author_name: string;
  author_id: string | null;
  file_url: string;
  status: 'need_review' | 'waiting_upload' | 'published' | 'returned';
  description: string;
  created_at: string;
  feedback?: string | null;
};

export default function EditorPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const myId = session?.user.id ?? ''; // editor's user ID

  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [selected, setSelected] = useState<Manuscript | null>(null);
  const [selectedChat, setSelectedChat] = useState<Manuscript | null>(null);
  const [feedback, setFeedback] = useState('');

  /* ---------- Fetch all manuscripts ---------- */
  const load = async () => {
    const { data, error } = await supabase
      .from('manuscripts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('[Editor] fetch manuscripts', error);
    setManuscripts(data ?? []);
  };
  useEffect(() => { if (session) load(); }, [session]);

  /* ---------- Approve or Return Manuscript ---------- */
  const updateStatus = async (status: 'waiting_upload' | 'returned') => {
    if (!selected || !session) return;

    const { error } = await supabase
      .from('manuscripts')
      .update({
        status,
        feedback,
        editor_id: myId,
      })
      .eq('id', selected.id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert(
        status === 'waiting_upload'
          ? 'Manuscript approved!'
          : 'Manuscript returned for revision!'
      );
      setFeedback('');
      setSelected(null);
      load();
    }
  };

  if (!session) return null;

  return (
    <div style={{ padding: 40 }}>
      <h1>Editor Dashboard</h1>

      {/* ---------- Manuscript List ---------- */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {manuscripts.map((m) => (
          <li
            key={m.id}
            style={{
              border: '1px solid #ccc',
              padding: 16,
              marginBottom: 12
            }}
          >
            
            <strong>{m.title}</strong>
            <div>Status : {m.status}</div>
            <div>Description : {m.description}</div>
            <a href={m.file_url} target="_blank" style={{ marginRight: 12 }}>
              📄 View/Download
            </a>
            <button
                onClick={() => {
                  setSelectedChat(m);
                  // setFeedback(m.feedback ?? '');
                }}
              >
                Chat
              </button>
            {m.status === 'need_review' && (
              <button
                onClick={() => {
                  setSelected(m);
                  setFeedback(m.feedback ?? '');
                }}
              >
                Review
              </button>
            )}

            {m.status === 'returned' && (
              <button
                onClick={() => {
                  setSelected(m);
                  setFeedback(m.feedback ?? '');
                }}
              >
                Review
              </button>
            )}

            {m.status === 'waiting_upload' && (
              <div>
                <span style={{ marginLeft: 12, color: '#ff9800' }}>
                  waiting for book upload / do it in upload form
                </span>
              </div>
            )}
            {m.status === 'published' && (
              <span style={{ marginLeft: 12, color: '#4caf50' }}>
                The book is published ✔ Congratulation
              </span>
            )}
          </li>
          
        ))}
      </ul>
      

      {/* ---------- Review Modal ---------- */}
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
          <h3>Chat with Author: {selectedChat.author_name}</h3>

          {/* 💬 Shared Chat with Author */}
          {selectedChat.author_id && (
            <div style={{ marginBottom: 16 }}>
              <ConversationBox
                myId={myId}
                myRole="editor"
                authorId={selectedChat.author_id}
                editorId={myId}
              />
            </div>
          )}
          <button onClick={() => setSelectedChat(null)}>Close</button>
        </div>
      )}

      {selected && (
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
          <h2>Review: {selected.title}</h2>

          {/* 💬 Shared Chat with Author */}
          {/* {selected.author_id && (
            <div style={{ marginBottom: 16 }}>
              <ConversationBox
                myId={myId}
                myRole="editor"
                authorId={selected.author_id}
                editorId={myId}
              />
            </div>
          )} */}

          {selected.status === 'waiting_upload' && (
            <div>
              <span style={{ marginLeft: 12, color: '#ff9800' }}>
                waiting for book upload / do it in upload form
              </span>
            </div>
            )}

          {selected.status === 'published' && (
            <div>
              <span style={{ marginLeft: 12, color: '#4caf50' }}>
                The book is published ✔ Congratulation
              </span>
            </div>
          )}

          {selected.status === 'returned' && (
          <div>  
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Leave feedback for the author"
            style={{ width: '100%', minHeight: 120, marginBottom: 16 }}
          />

          <button
            onClick={() => updateStatus('waiting_upload')}
            style={{ marginRight: 12 }}
          >
            ✅ Approve
          </button>
          <button
            onClick={() => updateStatus('returned')}
            style={{ marginRight: 12 }}
          >
            ❌ Return Again
          </button>
          
          </div>
          )}

          {selected.status === 'need_review' && (
          <div>  
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Leave feedback for the author"
            style={{ width: '100%', minHeight: 120, marginBottom: 16 }}
          />

          <button
            onClick={() => updateStatus('waiting_upload')}
            style={{ marginRight: 12 }}
          >
            ✅ Approve
          </button>
          <button
            onClick={() => updateStatus('returned')}
            style={{ marginRight: 12 }}
          >
            ❌ Return
          </button>
          
          </div>
          )}
          <button onClick={() => { setSelected(null); setFeedback(''); }}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
