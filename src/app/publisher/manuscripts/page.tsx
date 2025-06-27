// src/app/publisher/manuscripts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { Download } from 'lucide-react';
import './manuscripts.css';

type Manuscript = {
  id: string;
  title: string;
  author_id: string|null;
  file_url: string;
  status: string;
  description: string;
  created_at: string;
};

export default function ReviewDashboard() {
  const supabase = useSupabaseClient();
  const session  = useSession();
  const [rows,setRows] = useState<Manuscript[]>([]);

  // only publishers should get here (just to safe-guard)
  const fetchRows = async () => {
    const { data } = await supabase
    .from('manuscripts')
    .select('*')
    .order('created_at',{ascending:false});
    setRows(data ?? []);
  };

  useEffect(()=>{
    fetchRows();
  },[]);

  const approve = async (id:string) => {
    await supabase
    .from('manuscripts')
    .update({status:'waiting_upload', reviewed_at:new Date()})
    .eq('id',id);
    fetchRows();
  };

  return (
    <div className="container">
      <h1>Manuscripts</h1>
      <p>Manage and track your manuscript submissions</p>
      <ul className="manuscript-list">
        {rows.map((m) => (
          <li key={m.id} className="manuscript-item">
            {m.status === 'need_review' && (
              <div className="status-pill status-need-review">⚠ Needs Review</div>
            )}
            {m.status === 'waiting_upload' && (
              <div className="status-pill status-waiting-upload">⏳ Waiting Upload</div>
            )}
            {m.status === 'published' && (
              <div className="status-pill status-published">✅ Published</div>
            )}

            <div className="manuscript-title">Name: {m.title}</div>
            <div className="manuscript-status">Status: {m.status}</div>
            <div className="manuscript-description">Description: {m.description}</div>

            <a
              href={m.file_url}
              className="download-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={16} /> Download & View
            </a>

            {m.status === 'need_review' && (
              <button onClick={() => approve(m.id)} className="approve-button">
                ✅ Approve
              </button>
            )}

            {m.status === 'waiting_upload' && (
              <div className="message message-waiting">
                ⏱ Waiting for book upload
              </div>
            )}

            {m.status === 'published' && (
              <div className="message message-published">
                ✨ Published 🎉 Congratulations!
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
