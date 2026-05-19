import { mediaUrl, placeholderImage } from '../../utils/mediaUrl.js';

export default function PetCard({ pet, footer = null }) {
  return (
    <article className="card overflow-hidden flex flex-col">
      <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
        <img
          src={mediaUrl(pet.image) || placeholderImage(400)}
          alt={pet.name}
          className="w-full h-full object-cover"
        />
        {pet.isShelter && (
          <span className="absolute top-3 left-3 bg-secondary text-white text-xs px-3 py-1 rounded-full font-semibold">
            <i className="fas fa-house-medical mr-1" />
            Barınak
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{pet.name}</h3>
          <span className="text-gray-500 text-sm">{pet.age} yaş</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {pet.breed} · {pet.gender === 'erkek' ? 'Erkek' : 'Dişi'}
          {pet.location ? ` · ${pet.location}` : ''}
        </div>
        {pet.description && <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{pet.description}</p>}
        {pet.vaccinated && (
          <span className="text-xs text-green-600">
            <i className="fas fa-shield-virus mr-1" />
            Aşılı
          </span>
        )}
        {footer}
      </div>
    </article>
  );
}
