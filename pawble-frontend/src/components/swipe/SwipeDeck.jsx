import PetCard from '../pet/PetCard.jsx';

export default function SwipeDeck({ candidates, index }) {
  const top = candidates[index];
  if (!top) return null;
  return (
    <div className="relative">
      <PetCard pet={top} />
    </div>
  );
}
