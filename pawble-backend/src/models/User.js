export const rowToUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    surname: row.surname,
    email: row.email,
    location: row.location,
    isShelter: row.is_shelter === 1,
    isAdmin: row.is_admin === 1,
    createdAt: row.created_at,
  };
};

export const rowToUserWithHash = (row) => {
  if (!row) return null;
  return { ...rowToUser(row), passwordHash: row.password };
};
