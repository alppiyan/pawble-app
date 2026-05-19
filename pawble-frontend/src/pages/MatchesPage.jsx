import { useState } from 'react';
import Header from '../components/layout/Header.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ConversationList from '../components/chat/ConversationList.jsx';
import { useConversations } from '../hooks/useChat.js';

export default function MatchesPage() {
  const { conversations, loading } = useConversations();
  const [tab, setTab] = useState('mating');

  const filtered = conversations.filter((c) => (tab === 'mating' ? c.goal !== 'adoption' : c.goal === 'adoption'));

  return (
    <>
      <Header title="Sohbetler" />
      <div className="px-4 pt-3">
        <div className="card p-1 grid grid-cols-2 mb-3">
          <button
            onClick={() => setTab('mating')}
            className={`py-2 rounded-xl text-sm font-medium ${tab === 'mating' ? 'bg-primary text-white' : 'text-gray-500'}`}
          >
            Eşleşme
          </button>
          <button
            onClick={() => setTab('adoption')}
            className={`py-2 rounded-xl text-sm font-medium ${tab === 'adoption' ? 'bg-secondary text-white' : 'text-gray-500'}`}
          >
            Sahiplenme
          </button>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <ConversationList conversations={filtered} />
          </div>
        )}
      </div>
    </>
  );
}
