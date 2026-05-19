import { useNavigate } from 'react-router-dom';

export default function Header({ title, back = false, right = null }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="w-10">
          {back && (
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            >
              <i className="fas fa-arrow-left text-dark dark:text-white" />
            </button>
          )}
        </div>
        <h1 className="font-bold text-lg text-dark dark:text-white">{title}</h1>
        <div className="w-10 flex justify-end">{right}</div>
      </div>
    </header>
  );
}
