export default function SwipeActions({ onLeft, onSuper, onRight, disabled }) {
  const buttons = [
    { onClick: onLeft, icon: 'fa-times', cls: 'bg-white text-red-500 border-red-100', size: 'w-14 h-14 text-2xl' },
    { onClick: onSuper, icon: 'fa-star', cls: 'bg-blue-500 text-white border-blue-300', size: 'w-12 h-12 text-xl' },
    { onClick: onRight, icon: 'fa-heart', cls: 'bg-white text-primary border-pink-100', size: 'w-14 h-14 text-2xl' },
  ];
  return (
    <div className="flex items-center justify-center gap-6 py-4">
      {buttons.map((b, i) => (
        <button
          key={i}
          onClick={b.onClick}
          disabled={disabled}
          className={`${b.size} rounded-full border-2 shadow-lg flex items-center justify-center ${b.cls} disabled:opacity-50 hover:scale-105 transition`}
        >
          <i className={`fas ${b.icon}`} />
        </button>
      ))}
    </div>
  );
}
