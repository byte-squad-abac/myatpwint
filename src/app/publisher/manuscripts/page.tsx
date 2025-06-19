'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

type Manuscript = {
  id: string;
  title: string;
  author_id: string|null;
  file_url: string;
  status: string;
  created_at: string;
};

export default function ReviewDashboard() {
  const supabase = useSupabaseClient();
  const session  = useSession();
  const [rows,setRows] = useState<Manuscript[]>([]);

  // only publishers should get here – you already verify that elsewhere
  const fetchRows = async () => {
    const { data } = await supabase.from('manuscripts').select('*').order('created_at',{ascending:false});
    setRows(data ?? []);
  };

  useEffect(()=>{fetchRows();},[]);

  const approve = async (id:string) => {
    await supabase.from('manuscripts').update({status:'waiting_upload', reviewed_at:new Date()}).eq('id',id);
    fetchRows();
  };

  return (
    <div style={{padding:40}}>
      <h1>Manuscripts</h1>
      <ul style={{listStyle:'none',padding:0}}>
        {rows.map(m=>(
          <li key={m.id} style={{border:'1px solid #ccc',padding:16,marginBottom:12}}>
            <strong>{m.title}</strong> — {m.status}
            <a href={m.file_url} style={{marginLeft:8}} target="_blank">view</a>
            {m.status==='need_review' && (
              <button onClick={()=>approve(m.id)} style={{marginLeft:12}}>Approve</button>
            )}
            {m.status==='waiting_upload' && (
              <span style={{marginLeft:12,color:'#ff9800'}}>waiting for book upload…</span>
            )}
            {m.status==='published' && <span style={{marginLeft:12,color:'#4caf50'}}>published ✔</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
