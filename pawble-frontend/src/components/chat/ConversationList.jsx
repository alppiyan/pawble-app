import { Link } from 'react-router-dom';
import { mediaUrl, placeholderImage } from '../../utils/mediaUrl.js';

export default function ConversationList({ conversations }) {
  if (!conversations.length) {
    return <p className="text-center text-gray-500 py-8">Henüz bir sohbet yok.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {conversations.map((c) => (
        <li key={c.otherUserId}>
          <Link to={`/conversation/${c.otherUserId}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
            <img
              src={mediaUrl(c.image) || placeholderImage(80)}
              alt={c.petName}
              className="w-12 h-12 rounded-full object-cover bg-gray-100"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold truncate">{c.userName}</span>
                <span className="text-xs text-gray-500">{c.time}</span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{c.lastMessage}</div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${c.goal === 'adoption' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
              {c.goal === 'adoption' ? 'Sahiplen' : 'Eşleşme'}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
