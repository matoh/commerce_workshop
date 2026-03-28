import { FastifyPluginAsync } from 'fastify';
import productsRoutes from './products.routes.js';
import salesRoutes from './sales.routes.js';
import reservationRoutes from './reservations.routes.js';
import sseRoutes from './sse.routes.js';

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(productsRoutes, { prefix: '/api/products' });
  fastify.register(salesRoutes, { prefix: '/api/products' });
  fastify.register(reservationRoutes, { prefix: '/api' });
  fastify.register(sseRoutes, { prefix: '/api' });
};

export default routes;
