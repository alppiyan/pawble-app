import Joi from 'joi';

const boolish = Joi.alternatives().try(
  Joi.boolean(),
  Joi.string().valid('true', 'false', 'on', 'off', '1', '0'),
).custom((v) => v === true || v === 'true' || v === 'on' || v === '1' || v === 1);

const petBodyShape = {
  name: Joi.string().min(1).max(50).required(),
  speciesId: Joi.number().integer().positive().required(),
  breedId: Joi.number().integer().positive().required(),
  gender: Joi.string().valid('erkek', 'disi').required(),
  age: Joi.number().integer().min(0).max(40).required(),
  vaccinated: boolish.default(false),
  description: Joi.string().max(1000).allow('').default(''),
  goal: Joi.string().valid('mating', 'adoption').required(),
};

export const addPet = {
  body: Joi.object(petBodyShape),
};

export const updatePet = {
  body: Joi.object(petBodyShape),
  params: Joi.object({ petId: Joi.number().integer().positive().required() }),
};

export const petIdParam = {
  params: Joi.object({ petId: Joi.number().integer().positive().required() }),
};

export const adoptPet = {
  body: Joi.object({
    petId: Joi.number().integer().positive().required(),
    newOwnerId: Joi.number().integer().positive().required(),
  }),
};
