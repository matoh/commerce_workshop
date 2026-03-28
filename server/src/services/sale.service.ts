import { sql } from 'kysely';
import { db } from '../db/index.js';
import { AppError } from '../utils/errors.js';
import { broadcast } from '../utils/broadcast.js';

// Atomic decrement — uses WHERE clause to prevent overselling
export async function sell(productId: number, channelId: number, quantity: number) {
  return await db.transaction().execute(async (trx) => {
    // Atomic check-and-decrement
    const updated = await sql`
      UPDATE channel_inventory
      SET allocated_stock = allocated_stock - ${quantity}
      WHERE product_id = ${productId} AND channel_id = ${channelId}
        AND allocated_stock - reserved_stock >= ${quantity}
      RETURNING allocated_stock
    `.execute(trx);

    if (updated.rows.length === 0) {
      throw new AppError(409, 'Insufficient stock');
    }

    // Decrement total product stock
    await trx
      .updateTable('products')
      .set((eb) => ({
        stock: eb('stock', '-', quantity),
        updated_at: new Date(),
      }))
      .where('id', '=', productId)
      .execute();

    // Get current price
    const product = await trx
      .selectFrom('products')
      .select('price')
      .where('id', '=', productId)
      .executeTakeFirstOrThrow();

    // Record the sale
    const sale = await trx
      .insertInto('sales')
      .values({
        product_id: productId,
        channel_id: channelId,
        quantity,
        unit_price: product.price,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await broadcast('invalidate', { entity: 'products', productId });
    return sale;
  });
}

// Optimistic locking — uses version column to detect concurrent modifications
export async function sellOptimistic(productId: number, channelId: number, quantity: number) {
  return await db.transaction().execute(async (trx) => {
    // Read current version
    const product = await trx
      .selectFrom('products')
      .select(['version', 'price'])
      .where('id', '=', productId)
      .executeTakeFirst();

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    // Check stock availability
    const inventory = await trx
      .selectFrom('channel_inventory')
      .select(['allocated_stock', 'reserved_stock'])
      .where('product_id', '=', productId)
      .where('channel_id', '=', channelId)
      .executeTakeFirst();

    if (!inventory) {
      throw new AppError(404, 'Product not available in this channel');
    }

    if (inventory.allocated_stock - inventory.reserved_stock < quantity) {
      throw new AppError(409, 'Insufficient stock');
    }

    // Attempt update with version check
    const updateResult = await trx
      .updateTable('products')
      .set((eb) => ({
        stock: eb('stock', '-', quantity),
        version: eb('version', '+', 1),
        updated_at: new Date(),
      }))
      .where('id', '=', productId)
      .where('version', '=', product.version)
      .returning('version')
      .execute();

    if (updateResult.length === 0) {
      throw new AppError(409, 'Concurrent modification detected — please retry');
    }

    await trx
      .updateTable('channel_inventory')
      .set((eb) => ({
        allocated_stock: eb('allocated_stock', '-', quantity),
      }))
      .where('product_id', '=', productId)
      .where('channel_id', '=', channelId)
      .execute();

    const sale = await trx
      .insertInto('sales')
      .values({
        product_id: productId,
        channel_id: channelId,
        quantity,
        unit_price: product.price,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await broadcast('invalidate', { entity: 'products', productId });
    return sale;
  });
}
