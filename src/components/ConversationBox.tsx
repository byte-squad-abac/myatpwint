'use client';

import { useState, FormEvent } from 'react';
import { useConversation, ChatMessage } from '@/lib/hooks/useConversation';

type Props = {
  authorId : string;
  editorId : string;
  myId     : string;
  myRole   : 'author' | 'editor';
  roomId: string;
};

export default function ConversationBox (props: Props) {
  const { messages, loading, error, sendMessage } = useConversation(props);
  const [text, setText] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(text);
    setText('');
  };

  if (loading) return <p style={{padding:8}}>Loading chat…</p>;
  if (error)   return <p style={{padding:8,color:'red'}}>Chat error: {error.message}</p>;

  const bubble = (m:ChatMessage) => (
    <div
      key={m.id}
      style={{
        maxWidth:'75%', padding:'6px 10px', borderRadius:10,
        margin:'4px 0',
        alignSelf: m.sender_role===props.myRole ? 'flex-end':'flex-start',
        background: m.sender_role===props.myRole ? '#e3f2fd' : '#f1f8e9',
      }}
    >
      <small style={{opacity:.6}}>{m.sender_role}</small><br/>
      {m.content}
    </div>
  );

  return (
    <div style={{border:'1px solid #ccc',padding:12,borderRadius:10}}>
      <div style={{maxHeight:220,overflowY:'auto',display:'flex',flexDirection:'column'}}>
        {messages.map(bubble)}
      </div>

      <form onSubmit={onSubmit} style={{marginTop:8,display:'flex',gap:6}}>
        <input
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="Type a message…"
          style={{flex:1,padding:6}}
        />
        <button type="submit" style={{padding:'6px 12px'}}>Send</button>
      </form>
    </div>
  );
}
