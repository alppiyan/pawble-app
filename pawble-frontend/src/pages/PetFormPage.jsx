import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { useMetadata } from '../hooks/useMetadata.js';
import { useMyPets } from '../hooks/useMyPets.js';
import { petApi } from '../api/petApi.js';
import { mediaUrl, placeholderImage } from '../utils/mediaUrl.js';

const empty = {
  name: '',
  speciesId: '',
  breedId: '',
  gender: 'erkek',
  age: 1,
  vaccinated: false,
  description: '',
  goal: 'mating',
};

export default function PetFormPage() {
  const { petId } = useParams();
  const isEdit = !!petId;
  const navigate = useNavigate();
  const { species, breeds, loading: metaLoading } = useMetadata();
  const { pets, loading: petsLoading, refetch } = useMyPets();
  const [form, setForm] = useState(empty);
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    const p = pets.find((x) => String(x.id) === String(petId));
    if (!p) return;
    setForm({
      name: p.name || '',
      speciesId: p.speciesId || '',
      breedId: p.breedId || '',
      gender: p.gender || 'erkek',
      age: p.age ?? 1,
      vaccinated: !!p.vaccinated,
      description: p.description || '',
      goal: p.goal || 'mating',
    });
    setPreview(mediaUrl(p.imagePath));
  }, [isEdit, petId, pets]);

  const filteredBreeds = breeds.filter((b) => String(b.speciesId) === String(form.speciesId));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        ...form,
        speciesId: Number(form.speciesId),
        breedId: Number(form.breedId),
        age: Number(form.age),
        vaccinated: form.vaccinated ? 'true' : 'false',
      };
      if (isEdit) {
        await petApi.update(petId, payload, { image, video });
      } else {
        await petApi.create(payload, { image, video });
      }
      await refetch();
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (metaLoading || (isEdit && petsLoading)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <Header title={isEdit ? 'Dostunu Düzenle' : 'Yeni Dost'} back />
      <form onSubmit={submit} className="p-4 space-y-4">
        <label className="card p-4 cursor-pointer block">
          {preview || image ? (
            <img
              src={image ? URL.createObjectURL(image) : preview || placeholderImage(400)}
              alt="preview"
              className="w-full aspect-square object-cover rounded-2xl"
            />
          ) : (
            <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center text-gray-400">
              <i className="fas fa-camera text-4xl mb-2" />
              <span>Fotoğraf yükle</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setImage(f);
            }}
          />
        </label>

        <Input
          placeholder="İsim"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <select
          className="input"
          value={form.speciesId}
          onChange={(e) => setForm({ ...form, speciesId: e.target.value, breedId: '' })}
          required
        >
          <option value="">Tür seç</option>
          {species.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={form.breedId}
          onChange={(e) => setForm({ ...form, breedId: e.target.value })}
          required
          disabled={!form.speciesId}
        >
          <option value="">Irk seç</option>
          {filteredBreeds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <select
            className="input"
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
          >
            <option value="erkek">Erkek</option>
            <option value="disi">Dişi</option>
          </select>
          <Input
            type="number"
            min={0}
            max={40}
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            placeholder="Yaş"
          />
        </div>

        <label className="card p-3 flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.vaccinated}
            onChange={(e) => setForm({ ...form, vaccinated: e.target.checked })}
            className="w-5 h-5"
          />
          <span>Aşıları tam</span>
        </label>

        <textarea
          className="input min-h-[100px]"
          placeholder="Açıklama"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <label
            className={`card p-4 text-center cursor-pointer ${form.goal === 'mating' ? 'ring-2 ring-primary' : ''}`}
          >
            <input
              type="radio"
              name="goal"
              value="mating"
              checked={form.goal === 'mating'}
              onChange={() => setForm({ ...form, goal: 'mating' })}
              className="hidden"
            />
            <i className="fas fa-heart text-primary text-2xl block mb-1" />
            <span className="font-medium">Eşleşme</span>
          </label>
          <label
            className={`card p-4 text-center cursor-pointer ${form.goal === 'adoption' ? 'ring-2 ring-secondary' : ''}`}
          >
            <input
              type="radio"
              name="goal"
              value="adoption"
              checked={form.goal === 'adoption'}
              onChange={() => setForm({ ...form, goal: 'adoption' })}
              className="hidden"
            />
            <i className="fas fa-house-heart text-secondary text-2xl block mb-1" />
            <span className="font-medium">Sahiplendir</span>
          </label>
        </div>

        <label className="card p-3 flex items-center gap-3 cursor-pointer">
          <i className="fas fa-video text-gray-400" />
          <span className="flex-1 text-sm">{video ? video.name : 'Video ekle (opsiyonel)'}</span>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setVideo(e.target.files?.[0] || null)}
          />
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
        </Button>
      </form>
    </>
  );
}
