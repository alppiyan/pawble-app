export default function Spinner({ size = 'md' }) {
  const sz = { sm: 'w-5 h-5', md: 'w-10 h-10', lg: 'w-16 h-16' }[size] || 'w-10 h-10';
  return (
    <div className={`${sz} border-4 border-pink-100 border-t-primary rounded-full animate-spin`} />
  );
}
