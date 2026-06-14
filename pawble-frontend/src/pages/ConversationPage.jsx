import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import MessageBubble from '../components/chat/MessageBubble.jsx';
import ChatInput from '../components/chat/ChatInput.jsx';
import { useMessages } from '../hooks/useChat.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ConversationPage() {
  const { otherId } = useParams();
  const { user } = useAuth();
  const { messages, loading, send, peerTyping, notifyTyping } = useMessages(otherId);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, peerTyping]);

  return (
    <div className="flex flex-col h-screen">
      <Header title="Sohbet" back />
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Henüz mesaj yok. Selam ver!</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} isMine={m.senderId === user.id} />)
        )}
        {peerTyping && (
          <div className="flex justify-start mb-2">
            <div className="max-w-[75%] px-4 py-2 rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm italic">
              yazıyor...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <ChatInput onSend={send} onTyping={notifyTyping} />
    </div>
  );
}
