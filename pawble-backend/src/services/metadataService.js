import { metadataRepository } from '../repositories/metadataRepository.js';

export const metadataService = {
  async getAll() {
    const [species, breeds] = await Promise.all([
      metadataRepository.listSpecies(),
      metadataRepository.listBreeds(),
    ]);
    return { species, breeds };
  },
};
