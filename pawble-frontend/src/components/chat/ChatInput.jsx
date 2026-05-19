import { useState } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setText('');
    try {
      await onSend(v);
    } catch (err) {
      console.error(err);
      setText(v);
    }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Mesaj yaz..."
        disabled={disabled}
        className="flex-1 input"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50"
      >
        <i className="fas fa-paper-plane" />
      </button>
    </form>
  );
}
