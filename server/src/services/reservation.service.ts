import { db } from '../db/index.js';
import { AppError } from '../utils/errors.js';
import { broadcast } from '../utils/broadcast.js';

const RESERVATION_TTL_MINUTES = 15;

export async function listActive() {
  return db
    .selectFrom('reservations')
    .selectAll()
    .where('status', '=', 'held')
    .where('expires_at', '>', new Date())
    .execute();
}

export async function reserve(productId: number, channelId: number, quantity: number = 1) {
  return await db.transaction().execute(async (trx) => {
    // Check available stock
    const inv = await trx
      .selectFrom('channel_inventory')
      .select(['allocated_stock', 'reserved_stock'])
      .where('product_id', '=', productId)
      .where('channel_id', '=', channelId)
      .executeTakeFirst();

    if (!inv) {
      throw new AppError(404, 'Product not available in this channel');
    }

    if (inv.allocated_stock - inv.reserved_stock < quantity) {
      throw new AppError(409, 'Insufficient stock for reservation');
    }

    // Increment reserved stock
    await trx
      .updateTable('channel_inventory')
      .set((eb) => ({
        reserved_stock: eb('reserved_stock', '+', quantity),
      }))
      .where('product_id', '=', productId)
      .where('channel_id', '=', channelId)
      .execute();

    // Create reservation with TTL
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

    const reservation = await trx
      .insertInto('reservations')
      .values({
        product_id: productId,
        channel_id: channelId,
        quantity,
        expires_at: expiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await broadcast('invalidate', { entity: 'products', productId });
    return reservation;
  });
}

export async function cancel(reservationId: number) {
  return await db.transaction().execute(async (trx) => {
    const reservation = await trx
      .updateTable('reservations')
      .set({ status: 'expired' })
      .where('id', '=', reservationId)
      .where('status', '=', 'held')
      .returningAll()
      .executeTakeFirst();

    if (!reservation) {
      throw new AppError(404, 'Reservation not found or already cancelled');
    }

    // Release reserved stock back
    await trx
      .updateTable('channel_inventory')
      .set((eb) => ({
        reserved_stock: eb('reserved_stock', '-', reservation.quantity),
      }))
      .where('product_id', '=', reservation.product_id)
      .where('channel_id', '=', reservation.channel_id)
      .execute();

    await broadcast('invalidate', { entity: 'products', productId: reservation.product_id });
    return reservation;
  });
}

export async function complete(reservationId: number) {
  return await db.transaction().execute(async (trx) => {
    // Mark reservation as completed
    const reservation = await trx
      .updateTable('reservations')
      .set({ status: 'completed' })
      .where('id', '=', reservationId)
      .where('status', '=', 'held')
      .where('expires_at', '>', new Date())
      .returningAll()
      .executeTakeFirst();

    if (!reservation) {
      throw new AppError(404, 'Reservation not found or expired');
    }

    // Release reserved stock and decrement allocated stock
    await trx
      .updateTable('channel_inventory')
      .set((eb) => ({
        reserved_stock: eb('reserved_stock', '-', reservation.quantity),
        allocated_stock: eb('allocated_stock', '-', reservation.quantity),
      }))
      .where('product_id', '=', reservation.product_id)
      .where('channel_id', '=', reservation.channel_id)
      .execute();

    // Decrement total product stock
    await trx
      .updateTable('products')
      .set((eb) => ({
        stock: eb('stock', '-', reservation.quantity),
        updated_at: new Date(),
      }))
      .where('id', '=', reservation.product_id)
      .execute();

    // Get price and record sale
    const product = await trx
      .selectFrom('products')
      .select('price')
      .where('id', '=', reservation.product_id)
      .executeTakeFirstOrThrow();

    const sale = await trx
      .insertInto('sales')
      .values({
        product_id: reservation.product_id,
        channel_id: reservation.channel_id,
        quantity: reservation.quantity,
        unit_price: product.price,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await broadcast('invalidate', { entity: 'products', productId: reservation.product_id });
    return sale;
  });
}

export async function expireStale() {
  return await db.transaction().execute(async (trx) => {
    // Find and expire stale reservations
    const expired = await trx
      .updateTable('reservations')
      .set({ status: 'expired' })
      .where('status', '=', 'held')
      .where('expires_at', '<=', new Date())
      .returningAll()
      .execute();

    // Release reserved stock for each expired reservation
    for (const reservation of expired) {
      await trx
        .updateTable('channel_inventory')
        .set((eb) => ({
          reserved_stock: eb('reserved_stock', '-', reservation.quantity),
        }))
        .where('product_id', '=', reservation.product_id)
        .where('channel_id', '=', reservation.channel_id)
        .execute();
    }

    if (expired.length > 0) {
      await broadcast('invalidate', { entity: 'products' });
    }

    return expired;
  });
}
