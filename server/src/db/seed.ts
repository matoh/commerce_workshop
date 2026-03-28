import { db } from './index.js';

async function seed() {
  // Clear existing data (in reverse FK order)
  await db.deleteFrom('price_update_items').execute();
  await db.deleteFrom('price_update_jobs').execute();
  await db.deleteFrom('reservations').execute();
  await db.deleteFrom('sales').execute();
  await db.deleteFrom('channel_inventory').execute();
  await db.deleteFrom('channels').execute();
  await db.deleteFrom('products').execute();

  // Channels
  await db
    .insertInto('channels')
    .values([
      { name: 'web', type: 'online' },
      { name: 'store_stockholm', type: 'store' },
      { name: 'amazon', type: 'marketplace' },
    ])
    .execute();

  // Products
  await db
    .insertInto('products')
    .values([
      { name: 'Classic White T-Shirt', description: 'Essential cotton crew neck tee', price: 29.99, stock: 150 },
      { name: 'Slim Fit Jeans', description: 'Dark wash stretch denim', price: 79.99, stock: 80 },
      { name: 'Wool Blend Overcoat', description: 'Mid-length winter coat in charcoal', price: 249.99, stock: 25 },
      { name: 'Leather Belt', description: 'Full-grain leather with brass buckle', price: 49.99, stock: 60 },
      { name: 'Canvas Sneakers', description: 'Low-top lace-up in off-white', price: 59.99, stock: 100 },
      { name: 'Merino Wool Scarf', description: 'Lightweight knit scarf in navy', price: 39.99, stock: 45 },
      { name: 'Linen Button-Down', description: 'Relaxed fit summer shirt', price: 69.99, stock: 55 },
      { name: 'Chino Shorts', description: 'Tailored fit in khaki', price: 44.99, stock: 70 },
      { name: 'Aviator Sunglasses', description: 'Gold frame with green lenses', price: 129.99, stock: 35 },
      { name: 'Weekender Bag', description: 'Waxed canvas with leather handles', price: 159.99, stock: 20 },
    ])
    .execute();

  // Channel inventory (distribute stock across channels)
  const inventory = [
    [1, 60, 50, 40],
    [2, 30, 30, 20],
    [3, 10, 10, 5],
    [4, 25, 20, 15],
    [5, 40, 35, 25],
    [6, 20, 15, 10],
    [7, 20, 20, 15],
    [8, 30, 25, 15],
    [9, 15, 10, 10],
    [10, 8, 7, 5],
  ] as const;

  await db
    .insertInto('channel_inventory')
    .values(
      inventory.flatMap(([productId, web, store, marketplace]) => [
        { product_id: productId, channel_id: 1, allocated_stock: web },
        { product_id: productId, channel_id: 2, allocated_stock: store },
        { product_id: productId, channel_id: 3, allocated_stock: marketplace },
      ]),
    )
    .execute();

  // Some existing sales
  await db
    .insertInto('sales')
    .values([
      { product_id: 1, channel_id: 1, quantity: 2, unit_price: 29.99 },
      { product_id: 1, channel_id: 2, quantity: 1, unit_price: 29.99 },
      { product_id: 2, channel_id: 1, quantity: 1, unit_price: 79.99 },
      { product_id: 5, channel_id: 3, quantity: 3, unit_price: 59.99 },
      { product_id: 9, channel_id: 1, quantity: 1, unit_price: 129.99 },
    ])
    .execute();

  console.log('Seed completed successfully');
  await db.destroy();
}

seed();
