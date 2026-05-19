import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import SwipeDeck from '../components/swipe/SwipeDeck.jsx';
import SwipeActions from '../components/swipe/SwipeActions.jsx';
import { useMyPets } from '../hooks/useMyPets.js';
import { useCandidates } from '../hooks/useCandidates.js';
import { matchApi } from '../api/matchApi.js';

export default function HomePage() {
  const { pets, loading: petsLoading } = useMyPets();
  const myPet = pets[0];
  const { candidates, loading: candLoading, refetch } = useCandidates({
    mode: 'mating',
    myPetId: myPet?.id,
  });
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState(null);

  const current = useMemo(() => candidates[index], [candidates, index]);

  const swipe = async (action) => {
    if (!myPet || !current || busy) return;
    setBusy(true);
    try {
      const res = await matchApi.swipe({
        likerPetId: myPet.id,
        likedPetId: current.id,
        action,
      });
      if (res.match) setMatch({ pet: current, isSuper: res.isSuper });
      setIndex((i) => i + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (petsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!myPet) {
    return (
      <>
        <Header title="Eşleşme" />
        <div className="p-6">
          <div className="card p-8 text-center">
            <i className="fas fa-paw text-5xl text-primary mb-4" />
            <h2 className="font-bold text-xl mb-2">Önce bir dost ekle</h2>
            <p className="text-gray-500 mb-4">Eşleşme moduna girmek için kayıtlı bir evcil hayvanın olması gerek.</p>
            <Link to="/pet/new" className="btn-primary inline-block">
              Hayvan ekle
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Eşleşme"
        right={
          <button
            onClick={() => {
              setIndex(0);
              refetch();
            }}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            title="Yenile"
          >
            <i className="fas fa-rotate" />
          </button>
        }
      />
      <div className="p-4">
        {candLoading ? (
          <div className="h-80 flex items-center justify-center">
            <Spinner />
          </div>
        ) : current ? (
          <>
            <SwipeDeck candidates={candidates} index={index} />
            <SwipeActions
              disabled={busy}
              onLeft={() => swipe('left')}
              onSuper={() => swipe('super')}
              onRight={() => swipe('right')}
            />
          </>
        ) : (
          <div className="card p-8 text-center mt-6">
            <i className="fas fa-paw text-5xl text-gray-300 mb-4" />
            <h2 className="font-bold text-xl">Şimdilik bu kadar</h2>
            <p className="text-gray-500">Bütün adayları gördün. Sonra tekrar dene.</p>
          </div>
        )}
      </div>

      <Modal open={!!match} onClose={() => setMatch(null)} title={match?.isSuper ? 'Süper Eşleşme!' : 'Eşleştiniz!'}>
        <p className="text-center text-gray-600 dark:text-gray-300">
          {match?.pet.name} ile eşleştin. Şimdi sohbet edebilirsin.
        </p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setMatch(null)} className="btn-ghost flex-1">
            Kaydırmaya devam et
          </button>
          <Link to="/matches" className="btn-primary flex-1 text-center">
            Sohbetlere git
          </Link>
        </div>
      </Modal>
    </>
  );
}
