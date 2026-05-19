import Joi from 'joi';

export const candidatesQuery = {
  query: Joi.object({
    mode: Joi.string().valid('mating', 'adoption').default('mating'),
    myPetId: Joi.number().integer().positive().allow(null, ''),
    species: Joi.string().allow('', null),
    gender: Joi.string().valid('erkek', 'disi').allow('', null),
    ageMin: Joi.number().integer().min(0).max(40).allow('', null),
    ageMax: Joi.number().integer().min(0).max(40).allow('', null),
    shelterOnly: Joi.boolean().truthy('true').falsy('false').default(false),
  }),
};

export const recordSwipe = {
  body: Joi.object({
    likerPetId: Joi.number().integer().positive().required(),
    likedPetId: Joi.number().integer().positive().required(),
    action: Joi.string().valid('left', 'right', 'super').required(),
  }),
};

export const historyQuery = {
  query: Joi.object({
    myPetId: Joi.number().integer().positive().required(),
    type: Joi.string().valid('super', 'matches').default('matches'),
  }),
};
