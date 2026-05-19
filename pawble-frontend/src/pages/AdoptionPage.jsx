import { Link } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import PetCard from '../components/pet/PetCard.jsx';
import { useMyPets } from '../hooks/useMyPets.js';
import { useCandidates } from '../hooks/useCandidates.js';
import { chatApi } from '../api/chatApi.js';
import { useNavigate } from 'react-router-dom';

export default function AdoptionPage() {
  const { pets } = useMyPets();
  const myPet = pets[0];
  const { candidates, loading } = useCandidates({
    mode: 'adoption',
    myPetId: myPet?.id || 1,
  });
  const navigate = useNavigate();

  const contactOwner = async (ownerId) => {
    try {
      await chatApi.send({ receiverId: ownerId, content: 'Merhaba, ilanınız hakkında konuşmak istiyorum.' });
      navigate(`/conversation/${ownerId}`);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <Header title="Sahiplen" />
      <div className="p-4">
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <Spinner />
          </div>
        ) : candidates.length === 0 ? (
          <div className="card p-8 text-center mt-4">
            <i className="fas fa-house-heart text-5xl text-gray-300 mb-4" />
            <p className="text-gray-500">Şu an sahiplendirme ilanı yok.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {candidates.map((pet) => (
              <li key={pet.id}>
                <PetCard
                  pet={pet}
                  footer={
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => contactOwner(pet.ownerId)} className="btn-primary flex-1">
                        <i className="fas fa-comment mr-2" />
                        Sahibine yaz
                      </button>
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
