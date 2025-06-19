'use client';

import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { ChangeEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthorManuscripts() {
  const supabase = useSupabaseClient();
  const session  = useSession();
  const router   = useRouter();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [file,        setFile]        = useState<File|undefined>();
  const [statusMsg,   setStatusMsg]   = useState('');

  if (!session) return <p>Please sign in.</p>;

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) =>
    setFile(e.target.files?.[0]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!file) return setStatusMsg('Attach a file first');

  const safeName = file.name.replace(/\s+/g,'_');          // 3
  const uid      = session!.user.id;
  const path     = `${uid}/${Date.now()}-${safeName}`;

  // ------------- upload -------------
  const { error: uploadErr } = await supabase.storage
    .from('manuscripts')                                    // 1
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type                                // 5
    });

  if (uploadErr) {
    console.error(uploadErr);
    return setStatusMsg(`❌ Upload failed: ${uploadErr.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('manuscripts')
    .getPublicUrl(path);

  // ------------- DB insert -------------
  const { error: insertErr } = await supabase
    .from('manuscripts')
    .insert({
      author_id: uid,
      title,
      description,
      file_url: publicUrl,
      status: 'need_review'
    });

  if (insertErr) {
    console.error(insertErr);
    return setStatusMsg(`DB error: ${insertErr.message}`);
  }

  setStatusMsg('✅ Submitted!');
  router.refresh();
};


  /* simple UI */
  return (
    <div style={{maxWidth:600,margin:'40px auto'}}>
      <h2>Submit new manuscript</h2>
      <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" required/>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description"/>
        <input type="file" accept=".pdf,.doc,.docx" onChange={onFileChange} required/>
        <button type="submit">Upload</button>
        <p>{statusMsg}</p>
      </form>
    </div>
  );
}
