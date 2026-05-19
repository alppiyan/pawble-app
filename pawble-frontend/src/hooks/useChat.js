import { useCallback, useEffect, useState } from 'react';
import { chatApi } from '../api/chatApi.js';
import { connectSocket, sendChatMessage } from '../api/socket.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
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
    const socket = connectSocket();
    const onNew = () => refetch();
    socket.on('message:new', onNew);
    return () => socket.off('message:new', onNew);
  }, [refetch]);

  return { conversations, loading, refetch };
}

export function useMessages(otherId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!otherId) return;
    let cancelled = false;
    setLoading(true);
    chatApi
      .listMessages(otherId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [otherId]);

  useEffect(() => {
    if (!otherId || !user) return;
    const socket = connectSocket();
    const partnerId = Number(otherId);
    const onNew = (msg) => {
      const involvesPair =
        (msg.senderId === user.id && msg.receiverId === partnerId) ||
        (msg.senderId === partnerId && msg.receiverId === user.id);
      if (!involvesPair) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    socket.on('message:new', onNew);
    return () => socket.off('message:new', onNew);
  }, [otherId, user]);

  const send = useCallback(
    (content) => sendChatMessage({ receiverId: otherId, content }),
    [otherId],
  );

  return { messages, loading, send };
}
