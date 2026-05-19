import { useEffect, useState } from 'react';
import Header from '../components/layout/Header.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import PetCard from '../components/pet/PetCard.jsx';
import { useMyPets } from '../hooks/useMyPets.js';
import { matchApi } from '../api/matchApi.js';

export default function FavoritesPage() {
  const { pets } = useMyPets();
  const myPet = pets[0];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myPet) return;
    setLoading(true);
    matchApi
      .history({ myPetId: myPet.id, type: 'super' })
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [myPet?.id]);

  return (
    <>
      <Header title="Favoriler" />
      <div className="p-4">
        {!myPet ? (
          <div className="card p-6 text-center text-gray-500">Önce bir dost ekle.</div>
        ) : loading ? (
          <div className="py-8 flex justify-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <div className="card p-6 text-center text-gray-500">
            <i className="fas fa-star text-3xl text-gray-300 block mb-2" />
            Henüz süper beğeni yok.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((p) => (
              <li key={p.id}>
                <PetCard pet={{ ...p, image: p.image, breed: p.breed_name }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
