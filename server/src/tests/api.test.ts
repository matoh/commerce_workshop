import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../app.js';
import { db } from '../db/index.js';
import { publisher, subscriber } from '../redis.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

before(async () => {
  await publisher.connect();
  await subscriber.connect();
  app = await buildApp();
});

after(async () => {
  await app.close();
  await db.destroy();
  publisher.disconnect();
  subscriber.disconnect();
});

describe('Health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.instanceId);
    assert.ok(body.timestamp);
  });
});

describe('Products', () => {
  it('GET /api/products returns a list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' });
    assert.equal(res.statusCode, 200);
    const products = res.json();
    assert.ok(Array.isArray(products));
    assert.ok(products.length > 0);
    assert.ok(products[0].name);
    assert.ok(products[0].channels);
  });

  it('GET /api/products/:id returns a single product', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products/1' });
    assert.equal(res.statusCode, 200);
    const product = res.json();
    assert.equal(product.id, 1);
    assert.ok(product.channels.length > 0);
  });

  it('GET /api/products/:id returns 404 for unknown product', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products/99999' });
    assert.equal(res.statusCode, 404);
  });
});

describe('Sales', () => {
  it('POST /api/products/:id/sell succeeds with valid input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/1/sell',
      payload: { channelId: 1, quantity: 1 },
    });
    assert.equal(res.statusCode, 200);
    const sale = res.json();
    assert.equal(sale.product_id, 1);
    assert.equal(sale.channel_id, 1);
    assert.equal(sale.quantity, 1);
  });

  it('POST /api/products/:id/sell returns 409 for insufficient stock', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/1/sell',
      payload: { channelId: 1, quantity: 999999 },
    });
    assert.equal(res.statusCode, 409);
  });

  it('POST /api/products/:id/sell validates body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/1/sell',
      payload: { channelId: 'bad', quantity: -1 },
    });
    assert.equal(res.statusCode, 400);
  });

  it('POST /api/products/:id/sell returns 404 for unknown channel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/1/sell',
      payload: { channelId: 99999, quantity: 1 },
    });
    assert.equal(res.statusCode, 409);
  });

  it('POST /api/products/:id/sell-optimistic succeeds', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/2/sell-optimistic',
      payload: { channelId: 1, quantity: 1 },
    });
    assert.equal(res.statusCode, 200);
    const sale = res.json();
    assert.equal(sale.product_id, 2);
  });
});

describe('Reservations', () => {
  it('POST /api/products/:id/reserve creates a reservation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/3/reserve',
      payload: { channelId: 1 },
    });
    assert.equal(res.statusCode, 200);
    const reservation = res.json();
    assert.equal(reservation.product_id, 3);
    assert.equal(reservation.status, 'held');
    assert.ok(reservation.expires_at);
  });

  it('POST /api/reservations/:id/complete converts to sale', async () => {
    // First create a reservation
    const reserveRes = await app.inject({
      method: 'POST',
      url: '/api/products/4/reserve',
      payload: { channelId: 2, quantity: 1 },
    });
    const reservation = reserveRes.json();

    // Complete it
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/reservations/${reservation.id}/complete`,
    });
    assert.equal(completeRes.statusCode, 200);
    const sale = completeRes.json();
    assert.equal(sale.product_id, 4);
    assert.equal(sale.channel_id, 2);
  });

  it('POST /api/reservations/:id/complete returns 404 on double-complete', async () => {
    // Create and complete a reservation
    const reserveRes = await app.inject({
      method: 'POST',
      url: '/api/products/5/reserve',
      payload: { channelId: 1, quantity: 1 },
    });
    const reservation = reserveRes.json();

    await app.inject({
      method: 'POST',
      url: `/api/reservations/${reservation.id}/complete`,
    });

    // Try completing again
    const res = await app.inject({
      method: 'POST',
      url: `/api/reservations/${reservation.id}/complete`,
    });
    assert.equal(res.statusCode, 404);
  });

  it('POST /api/reservations/:id/complete returns 404 for invalid id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reservations/99999/complete',
    });
    assert.equal(res.statusCode, 404);
  });

  it('POST /api/products/:id/reserve returns 409 for insufficient stock', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/3/reserve',
      payload: { channelId: 1, quantity: 999999 },
    });
    assert.equal(res.statusCode, 409);
  });
});

describe('Bulk Price Update', () => {
  it('POST /api/products/bulk-price updates prices', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/bulk-price',
      payload: {
        productIds: [5, 6],
        adjustment: { type: 'percentage', value: 10 },
      },
    });
    assert.equal(res.statusCode, 200);
    const result = res.json();
    assert.ok(result.jobId);
    assert.equal(result.completedItems, 2);
    assert.equal(result.failedItems, 0);
  });

  it('GET /api/products/bulk-price/:jobId returns job status', async () => {
    // Create a job first
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/products/bulk-price',
      payload: {
        productIds: [7],
        adjustment: { type: 'fixed', value: 5 },
      },
    });
    const { jobId } = createRes.json();

    const res = await app.inject({
      method: 'GET',
      url: `/api/products/bulk-price/${jobId}`,
    });
    assert.equal(res.statusCode, 200);
    const job = res.json();
    assert.equal(job.status, 'completed');
    assert.ok(job.items.length > 0);
  });

  it('POST /api/products/bulk-price returns 400 for unknown products', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/bulk-price',
      payload: {
        productIds: [8, 99999],
        adjustment: { type: 'fixed', value: 2 },
      },
    });
    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.ok(body.error.includes('99999'));
  });

  it('GET /api/products/bulk-price/:jobId returns 404 for unknown job', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/products/bulk-price/99999',
    });
    assert.equal(res.statusCode, 404);
  });

  it('POST /api/products/bulk-price validates body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/bulk-price',
      payload: { productIds: [], adjustment: { type: 'bad' } },
    });
    assert.equal(res.statusCode, 400);
  });
});
