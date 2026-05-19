import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi } from '../api/chatApi.js';

const POLL_MS = 4000;

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setConversations(await chatApi.listConversations());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { conversations, loading, refetch };
}

export function useMessages(otherId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  const fetchOnce = useCallback(async () => {
    try {
      setMessages(await chatApi.listMessages(otherId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [otherId]);

  useEffect(() => {
    if (!otherId) return;
    fetchOnce();
    timer.current = setInterval(fetchOnce, POLL_MS);
    return () => clearInterval(timer.current);
  }, [otherId, fetchOnce]);

  const send = useCallback(
    async (content) => {
      await chatApi.send({ receiverId: Number(otherId), content });
      fetchOnce();
    },
    [otherId, fetchOnce],
  );

  return { messages, loading, send };
}
