// useConversation.ts
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { PostgrestError } from '@supabase/supabase-js';

export type ChatMessage = {
  id: string;
  room_id: string;
  author_id: string;
  author_name?: string;
  editor_name?: string;
  sender_name: string;
  editor_id: string;
  sender_role: 'author' | 'editor';
  content: string;
  created_at: string;
};

type Options = {
  authorId: string;
  editorId: string;
  author_name: string; 
  editor_name: string; 
  sender_name: string; 
  myId:     string;
  myRole:  'author' | 'editor';
};

export function useConversation ({
  authorId,
  editorId,
  author_name,
  sender_name,
  editor_name,
  myId,
  myRole,
}: Options) {
  const supabase = createClientComponentClient();
  const roomId   = [authorId, editorId].sort().join('-'); // Shared room ID

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<PostgrestError|null>(null);

  /* ───── initial fetch ───── */
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) setError(error);
      setMessages(data ?? []);
      setLoading(false);
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, editorId]);

  /* ───── realtime subscription ───── */
  useEffect(() => {
    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /* ───── send helper ───── */
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const { error } = await supabase.from('messages').insert({
      room_id     : roomId,
      author_id   : authorId,
      sender_name : sender_name,
      author_name : author_name,
      editor_name : editor_name,
      editor_id   : editorId,
      sender_role : myRole,
      content,
    });

    if (error) {
      setError(error);
      console.error('[sendMessage error]', error);
    }
  };

  return { messages, loading, error, sendMessage, roomId };
}