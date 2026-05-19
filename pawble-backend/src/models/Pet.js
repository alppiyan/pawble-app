export const rowToPet = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.user_id,
    name: row.username,
    speciesId: row.species_id,
    breedId: row.breed_id,
    gender: row.gender,
    age: row.age,
    vaccinated: row.vaccinated === 1,
    description: row.description,
    imagePath: row.image_path,
    videoPath: row.video_path,
    goal: row.goal,
    createdAt: row.created_at,
  };
};

export const rowToCandidate = (row) => ({
  id: row.id,
  name: row.name,
  gender: row.gender,
  age: row.age,
  vaccinated: row.vaccinated === 1,
  description: row.description,
  image: row.image,
  videoPath: row.video_path,
  species: row.species_name,
  breed: row.breed_name,
  location: row.location,
  goal: row.goal,
  ownerId: row.ownerId,
  ownerName: row.ownerName,
  isShelter: row.is_shelter === 1,
});
