import { useCallback, useEffect, useState } from 'react';
import { chatApi } from '../api/chatApi.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

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

  useEffect(() => {
    const onMessage = () => refetch();
    socket.on('message:new', onMessage);
    return () => socket.off('message:new', onMessage);
  }, [socket, refetch]);

  return { conversations, loading, refetch };
}

export function useMessages(otherId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [peerTyping, setPeerTyping] = useState(false);
  const { socket } = useSocket();
  const { user } = useAuth();
  const otherIdNum = Number(otherId);

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
    setLoading(true);
    fetchOnce();
  }, [otherId, fetchOnce]);

  // Re-sync history after a reconnect, in case messages were missed while offline.
  useEffect(() => {
    if (!otherId) return;
    socket.on('connect', fetchOnce);
    return () => socket.off('connect', fetchOnce);
  }, [socket, otherId, fetchOnce]);

  useEffect(() => {
    if (!otherId) return;

    const onMessage = (message) => {
      const isThisConversation =
        (message.senderId === otherIdNum && message.receiverId === user.id) ||
        (message.senderId === user.id && message.receiverId === otherIdNum);
      if (!isThisConversation) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    };

    const onTyping = ({ userId, isTyping }) => {
      if (userId === otherIdNum) setPeerTyping(isTyping);
    };

    socket.on('message:new', onMessage);
    socket.on('typing:peer', onTyping);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('typing:peer', onTyping);
    };
  }, [socket, otherId, otherIdNum, user.id]);

  // Reset the typing indicator when switching conversations.
  useEffect(() => {
    setPeerTyping(false);
  }, [otherId]);

  const send = useCallback(
    async (content) => {
      if (socket.connected) {
        const ack = await new Promise((resolve) => {
          socket.emit('message:send', { receiverId: otherIdNum, content }, resolve);
        });
        if (!ack?.ok) throw new Error(ack?.error?.message || 'Failed to send message');
        return;
      }
      // Socket unavailable — fall back to the REST endpoint.
      await chatApi.send({ receiverId: otherIdNum, content });
      await fetchOnce();
    },
    [socket, otherIdNum, fetchOnce],
  );

  const notifyTyping = useCallback(
    (isTyping) => {
      if (socket.connected) socket.emit(isTyping ? 'typing:start' : 'typing:stop', { otherUserId: otherIdNum });
    },
    [socket, otherIdNum],
  );

  return { messages, loading, send, peerTyping, notifyTyping };
}
