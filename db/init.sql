-- Schema
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image_url TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE channels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE channel_inventory (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id),
  channel_id INT REFERENCES channels(id),
  allocated_stock INT NOT NULL DEFAULT 0,
  reserved_stock INT NOT NULL DEFAULT 0,
  UNIQUE(product_id, channel_id)
);

CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id),
  channel_id INT REFERENCES channels(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  sold_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id),
  channel_id INT REFERENCES channels(id),
  quantity INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'held',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_update_jobs (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  total_items INT NOT NULL DEFAULT 0,
  completed_items INT NOT NULL DEFAULT 0,
  failed_items INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_update_items (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES price_update_jobs(id),
  product_id INT REFERENCES products(id),
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Indexes
CREATE INDEX idx_reservations_active ON reservations(product_id, status, expires_at)
  WHERE status = 'held';
CREATE INDEX idx_channel_inventory_product ON channel_inventory(product_id);
CREATE INDEX idx_sales_product ON sales(product_id, sold_at);

-- Seed: Channels
INSERT INTO channels (name, type) VALUES
  ('web', 'online'),
  ('store_stockholm', 'store'),
  ('marketplace', 'marketplace');

-- Seed: Products
INSERT INTO products (name, description, price, stock) VALUES
  ('Classic White T-Shirt', 'Essential cotton crew neck tee', 29.99, 150),
  ('Slim Fit Jeans', 'Dark wash stretch denim', 79.99, 80),
  ('Wool Blend Overcoat', 'Mid-length winter coat in charcoal', 249.99, 25),
  ('Leather Belt', 'Full-grain leather with brass buckle', 49.99, 60),
  ('Canvas Sneakers', 'Low-top lace-up in off-white', 59.99, 100),
  ('Merino Wool Scarf', 'Lightweight knit scarf in navy', 39.99, 45),
  ('Linen Button-Down', 'Relaxed fit summer shirt', 69.99, 55),
  ('Chino Shorts', 'Tailored fit in khaki', 44.99, 70),
  ('Aviator Sunglasses', 'Gold frame with green lenses', 129.99, 35),
  ('Weekender Bag', 'Waxed canvas with leather handles', 159.99, 20);

-- Seed: Channel inventory (distribute stock across channels)
INSERT INTO channel_inventory (product_id, channel_id, allocated_stock) VALUES
  (1, 1, 60),  (1, 2, 50),  (1, 3, 40),
  (2, 1, 30),  (2, 2, 30),  (2, 3, 20),
  (3, 1, 10),  (3, 2, 10),  (3, 3, 5),
  (4, 1, 25),  (4, 2, 20),  (4, 3, 15),
  (5, 1, 40),  (5, 2, 35),  (5, 3, 25),
  (6, 1, 20),  (6, 2, 15),  (6, 3, 10),
  (7, 1, 20),  (7, 2, 20),  (7, 3, 15),
  (8, 1, 30),  (8, 2, 25),  (8, 3, 15),
  (9, 1, 15),  (9, 2, 10),  (9, 3, 10),
  (10, 1, 8),  (10, 2, 7),  (10, 3, 5);

-- Seed: Some existing sales
INSERT INTO sales (product_id, channel_id, quantity, unit_price) VALUES
  (1, 1, 2, 29.99),
  (1, 2, 1, 29.99),
  (2, 1, 1, 79.99),
  (5, 3, 3, 59.99),
  (9, 1, 1, 129.99);
