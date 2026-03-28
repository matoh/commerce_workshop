import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import * as saleService from '../services/sale.service.js';
import { sellInputSchema, SellInput } from '../schemas/index.js';

const sellHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: SellInput }>,
) => {
  const productId = parseInt(request.params.id, 10);
  const { channelId, quantity } = request.body;
  return saleService.sell(productId, channelId, quantity);
};

const sellOptimisticHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: SellInput }>,
) => {
  const productId = parseInt(request.params.id, 10);
  const { channelId, quantity } = request.body;
  return saleService.sellOptimistic(productId, channelId, quantity);
};

const sellSchema = { schema: { body: sellInputSchema } };

const salesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/:id/sell', sellSchema, sellHandler);
  fastify.post('/:id/sell-optimistic', sellSchema, sellOptimisticHandler);
};

export default salesRoutes;
