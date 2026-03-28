import { FastifyInstance } from 'fastify';
import * as saleService from '../services/sale.service.js';
import { sellInputSchema, SellInput } from '../schemas/index.js';

export async function salesRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string }; Body: SellInput }>(
    '/api/products/:id/sell',
    { schema: { body: sellInputSchema } },
    async (request) => {
      const productId = parseInt(request.params.id, 10);
      const { channelId, quantity } = request.body;
      return saleService.sell(productId, channelId, quantity);
    },
  );

  app.post<{ Params: { id: string }; Body: SellInput }>(
    '/api/products/:id/sell-optimistic',
    { schema: { body: sellInputSchema } },
    async (request) => {
      const productId = parseInt(request.params.id, 10);
      const { channelId, quantity } = request.body;
      return saleService.sellOptimistic(productId, channelId, quantity);
    },
  );
}
