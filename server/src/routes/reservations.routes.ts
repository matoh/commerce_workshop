import { FastifyInstance } from 'fastify';
import * as reservationService from '../services/reservation.service.js';
import { reserveInputSchema, ReserveInput } from '../schemas/index.js';

export async function reservationRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string }; Body: ReserveInput }>(
    '/api/products/:id/reserve',
    { schema: { body: reserveInputSchema } },
    async (request) => {
      const productId = parseInt(request.params.id, 10);
      const { channelId, quantity } = request.body;
      return reservationService.reserve(productId, channelId, quantity ?? 1);
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/reservations/:id/complete',
    async (request) => {
      const reservationId = parseInt(request.params.id, 10);
      return reservationService.complete(reservationId);
    },
  );
}
