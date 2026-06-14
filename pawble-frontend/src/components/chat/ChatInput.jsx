import { useEffect, useRef, useState } from 'react';

const TYPING_TIMEOUT = 2000;

export default function ChatInput({ onSend, onTyping, disabled }) {
  const [text, setText] = useState('');
  const typingTimeout = useRef(null);
  const isTypingRef = useRef(false);

  const stopTyping = () => {
    clearTimeout(typingTimeout.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping?.(false);
    }
  };

  useEffect(() => () => clearTimeout(typingTimeout.current), []);

  const handleChange = (e) => {
    setText(e.target.value);
    if (!onTyping) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, TYPING_TIMEOUT);
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setText('');
    stopTyping();
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
        onChange={handleChange}
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
