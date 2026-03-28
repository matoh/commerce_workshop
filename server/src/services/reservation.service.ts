import { pool } from '../db.js';
import { AppError } from '../utils/errors.js';

const RESERVATION_TTL_MINUTES = 15;

export async function reserve(productId: number, channelId: number, quantity: number = 1) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check available stock (allocated - reserved)
    const inv = await client.query(
      `SELECT allocated_stock, reserved_stock FROM channel_inventory
       WHERE product_id = $1 AND channel_id = $2`,
      [productId, channelId],
    );

    if (inv.rows.length === 0) {
      throw new AppError(404, 'Product not available in this channel');
    }

    const available = inv.rows[0].allocated_stock - inv.rows[0].reserved_stock;
    if (available < quantity) {
      throw new AppError(409, 'Insufficient stock for reservation');
    }

    // Increment reserved stock
    await client.query(
      `UPDATE channel_inventory SET reserved_stock = reserved_stock + $1
       WHERE product_id = $2 AND channel_id = $3`,
      [quantity, productId, channelId],
    );

    // Create reservation with TTL
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);
    const reservation = await client.query(
      `INSERT INTO reservations (product_id, channel_id, quantity, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [productId, channelId, quantity, expiresAt],
    );

    await client.query('COMMIT');
    return reservation.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function complete(reservationId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(
      `UPDATE reservations SET status = 'completed'
       WHERE id = $1 AND status = 'held' AND expires_at > NOW()
       RETURNING *`,
      [reservationId],
    );

    if (res.rows.length === 0) {
      throw new AppError(404, 'Reservation not found or expired');
    }

    const reservation = res.rows[0];

    // Release reserved stock
    await client.query(
      `UPDATE channel_inventory SET
        reserved_stock = reserved_stock - $1,
        allocated_stock = allocated_stock - $1
       WHERE product_id = $2 AND channel_id = $3`,
      [reservation.quantity, reservation.product_id, reservation.channel_id],
    );

    // Decrement total product stock
    await client.query(
      'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
      [reservation.quantity, reservation.product_id],
    );

    // Get price and record sale
    const product = await client.query('SELECT price FROM products WHERE id = $1', [reservation.product_id]);
    const sale = await client.query(
      `INSERT INTO sales (product_id, channel_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [reservation.product_id, reservation.channel_id, reservation.quantity, product.rows[0].price],
    );

    await client.query('COMMIT');
    return sale.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function expireStale() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find and expire stale reservations
    const expired = await client.query(
      `UPDATE reservations SET status = 'expired'
       WHERE status = 'held' AND expires_at <= NOW()
       RETURNING *`,
    );

    // Release reserved stock for each expired reservation
    for (const reservation of expired.rows) {
      await client.query(
        `UPDATE channel_inventory SET reserved_stock = reserved_stock - $1
         WHERE product_id = $2 AND channel_id = $3`,
        [reservation.quantity, reservation.product_id, reservation.channel_id],
      );
    }

    await client.query('COMMIT');
    return expired.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
