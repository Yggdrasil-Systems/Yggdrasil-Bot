import fp from 'fastify-plugin';

import { settingsService } from '../../services/settingsService.js';
import { moderationService } from '../../services/moderationService.js';
import { automodService } from '../../services/automod/automodService.js';

export const servicesPlugin = fp(async (fastify, opts) => {
  const { client } = opts;

  fastify.decorate('services', {
    discordClient: client,
    settingsService,
    moderationService,
    automodService
  });
});
