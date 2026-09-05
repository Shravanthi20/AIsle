INSERT INTO users (id, name, email, password_hash, role)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'Riya Kapoor', 'riya@stridehub.test', 'scrypt:c8e3c1e95463104087089b869b5a8598:460cc79d4647778c684cf98c441172870c18048f39e516c3b9f263d23885022ddcc09994e0ed0b0e165e6aa6a4106b8c8881975790f5318b712da599929aafbd', 'MERCHANT'),
  ('00000000-0000-4000-8000-000000000102', 'Arjun Mehta', 'arjun@soundnest.test', 'scrypt:c8e3c1e95463104087089b869b5a8598:460cc79d4647778c684cf98c441172870c18048f39e516c3b9f263d23885022ddcc09994e0ed0b0e165e6aa6a4106b8c8881975790f5318b712da599929aafbd', 'MERCHANT'),
  ('00000000-0000-4000-8000-000000000103', 'Neha Iyer', 'neha@techcrate.test', 'scrypt:c8e3c1e95463104087089b869b5a8598:460cc79d4647778c684cf98c441172870c18048f39e516c3b9f263d23885022ddcc09994e0ed0b0e165e6aa6a4106b8c8881975790f5318b712da599929aafbd', 'MERCHANT'),
  ('00000000-0000-4000-8000-000000000201', 'Kabir Shah', 'kabir@example.test', 'scrypt:a1ab88cb46b4dfda6434dbe6769a882c:42fecdb951cdbf446975589c046cd5c784a4e88e39aeae1b90ffcc1381468963425bbdb2e663cc4573ca786c1aeaf01e9da0d9a1b47b3438b357053b6c39283e', 'BUYER'),
  ('00000000-0000-4000-8000-000000000202', 'Ananya Rao', 'ananya@example.test', 'scrypt:a1ab88cb46b4dfda6434dbe6769a882c:42fecdb951cdbf446975589c046cd5c784a4e88e39aeae1b90ffcc1381468963425bbdb2e663cc4573ca786c1aeaf01e9da0d9a1b47b3438b357053b6c39283e', 'BUYER'),
  ('00000000-0000-4000-8000-000000000203', 'Dev Patel', 'dev@example.test', 'scrypt:a1ab88cb46b4dfda6434dbe6769a882c:42fecdb951cdbf446975589c046cd5c784a4e88e39aeae1b90ffcc1381468963425bbdb2e663cc4573ca786c1aeaf01e9da0d9a1b47b3438b357053b6c39283e', 'BUYER')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

INSERT INTO merchants (id, user_id, store_name, description)
VALUES
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000101', 'StrideHub', 'Running shoes and fitness essentials for everyday athletes.'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000102', 'SoundNest', 'Headphones, earbuds, and accessories for work and travel.'),
  ('00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000103', 'TechCrate', 'Laptops, productivity gear, and practical desk accessories.')
ON CONFLICT (user_id) DO UPDATE
SET store_name = EXCLUDED.store_name,
    description = EXCLUDED.description;

INSERT INTO products (id, merchant_id, name, description, category, price, currency, stock, image_url, status)
VALUES
  ('00000000-0000-4000-8000-000000002001', '00000000-0000-4000-8000-000000001001', 'Nike Air Zoom Pegasus 41', 'Responsive neutral running shoe for daily training.', 'Running shoes', 11895.00, 'INR', 24, 'https://example.test/images/pegasus-41.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002002', '00000000-0000-4000-8000-000000001001', 'Adidas Ultraboost Light', 'Cushioned road running shoe with knit upper.', 'Running shoes', 17999.00, 'INR', 16, 'https://example.test/images/ultraboost-light.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002003', '00000000-0000-4000-8000-000000001001', 'Asics Gel-Kayano 31', 'Stability shoe for long runs and overpronation support.', 'Running shoes', 16499.00, 'INR', 12, 'https://example.test/images/gel-kayano-31.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002004', '00000000-0000-4000-8000-000000001001', 'Puma Velocity Nitro 3', 'Lightweight trainer for tempo runs and gym days.', 'Running shoes', 10499.00, 'INR', 19, 'https://example.test/images/velocity-nitro-3.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002005', '00000000-0000-4000-8000-000000001001', 'FlexForm Yoga Mat Pro', 'Dense non-slip yoga and stretching mat.', 'Fitness products', 2499.00, 'INR', 40, 'https://example.test/images/yoga-mat-pro.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002006', '00000000-0000-4000-8000-000000001001', 'IronCore Adjustable Dumbbell 20kg', 'Compact adjustable dumbbell for home workouts.', 'Fitness products', 8999.00, 'INR', 9, 'https://example.test/images/adjustable-dumbbell.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002007', '00000000-0000-4000-8000-000000001002', 'Sony WH-1000XM5', 'Premium wireless headphones with strong noise cancellation.', 'Headphones', 29990.00, 'INR', 14, 'https://example.test/images/sony-xm5.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002008', '00000000-0000-4000-8000-000000001002', 'Bose QuietComfort Ultra Earbuds', 'Compact earbuds for travel and calls.', 'Headphones', 25900.00, 'INR', 20, 'https://example.test/images/bose-qc-ultra-earbuds.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002009', '00000000-0000-4000-8000-000000001002', 'JBL Tune 770NC', 'Affordable over-ear wireless headphones.', 'Headphones', 6499.00, 'INR', 31, 'https://example.test/images/jbl-tune-770nc.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002010', '00000000-0000-4000-8000-000000001002', 'Anker SoundCore Life P3', 'Everyday earbuds with app EQ and ANC.', 'Headphones', 7999.00, 'INR', 27, 'https://example.test/images/life-p3.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002011', '00000000-0000-4000-8000-000000001002', 'Belkin USB-C Audio Adapter', 'Compact audio adapter for USB-C devices.', 'Accessories', 1599.00, 'INR', 55, 'https://example.test/images/usb-c-audio-adapter.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002012', '00000000-0000-4000-8000-000000001003', 'Lenovo ThinkPad E14 Gen 6', 'Durable business laptop for productivity.', 'Laptops', 74990.00, 'INR', 8, 'https://example.test/images/thinkpad-e14.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002013', '00000000-0000-4000-8000-000000001003', 'Apple MacBook Air 13 M3', 'Thin laptop for students and creators.', 'Laptops', 114900.00, 'INR', 7, 'https://example.test/images/macbook-air-m3.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002014', '00000000-0000-4000-8000-000000001003', 'HP Victus 15', 'Gaming and creator laptop with dedicated graphics.', 'Laptops', 82990.00, 'INR', 6, 'https://example.test/images/hp-victus-15.jpg', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000002015', '00000000-0000-4000-8000-000000001003', 'Logitech MX Master 3S', 'Ergonomic wireless mouse for productivity.', 'Accessories', 9495.00, 'INR', 22, 'https://example.test/images/mx-master-3s.jpg', 'ACTIVE')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    stock = EXCLUDED.stock,
    image_url = EXCLUDED.image_url,
    status = EXCLUDED.status;

INSERT INTO product_attributes (product_id, key, value)
VALUES
  ('00000000-0000-4000-8000-000000002001', 'brand', 'Nike'),
  ('00000000-0000-4000-8000-000000002001', 'color', 'black'),
  ('00000000-0000-4000-8000-000000002001', 'material', 'mesh'),
  ('00000000-0000-4000-8000-000000002001', 'use_case', 'daily running'),
  ('00000000-0000-4000-8000-000000002002', 'brand', 'Adidas'),
  ('00000000-0000-4000-8000-000000002002', 'color', 'white'),
  ('00000000-0000-4000-8000-000000002002', 'material', 'knit'),
  ('00000000-0000-4000-8000-000000002002', 'use_case', 'long distance running'),
  ('00000000-0000-4000-8000-000000002003', 'brand', 'Asics'),
  ('00000000-0000-4000-8000-000000002003', 'size', '9'),
  ('00000000-0000-4000-8000-000000002003', 'use_case', 'stability running'),
  ('00000000-0000-4000-8000-000000002004', 'brand', 'Puma'),
  ('00000000-0000-4000-8000-000000002004', 'use_case', 'tempo running'),
  ('00000000-0000-4000-8000-000000002005', 'material', 'natural rubber'),
  ('00000000-0000-4000-8000-000000002005', 'use_case', 'yoga and mobility'),
  ('00000000-0000-4000-8000-000000002006', 'material', 'steel'),
  ('00000000-0000-4000-8000-000000002006', 'use_case', 'strength training'),
  ('00000000-0000-4000-8000-000000002007', 'brand', 'Sony'),
  ('00000000-0000-4000-8000-000000002007', 'battery_life', '30 hours'),
  ('00000000-0000-4000-8000-000000002007', 'noise_cancellation', 'adaptive ANC'),
  ('00000000-0000-4000-8000-000000002008', 'brand', 'Bose'),
  ('00000000-0000-4000-8000-000000002008', 'noise_cancellation', 'strong ANC'),
  ('00000000-0000-4000-8000-000000002009', 'brand', 'JBL'),
  ('00000000-0000-4000-8000-000000002009', 'battery_life', '70 hours'),
  ('00000000-0000-4000-8000-000000002010', 'brand', 'Anker'),
  ('00000000-0000-4000-8000-000000002010', 'noise_cancellation', 'hybrid ANC'),
  ('00000000-0000-4000-8000-000000002011', 'connector', 'USB-C'),
  ('00000000-0000-4000-8000-000000002012', 'brand', 'Lenovo'),
  ('00000000-0000-4000-8000-000000002012', 'ram', '16GB'),
  ('00000000-0000-4000-8000-000000002012', 'storage', '512GB SSD'),
  ('00000000-0000-4000-8000-000000002013', 'brand', 'Apple'),
  ('00000000-0000-4000-8000-000000002013', 'ram', '8GB'),
  ('00000000-0000-4000-8000-000000002013', 'battery_life', '18 hours'),
  ('00000000-0000-4000-8000-000000002014', 'brand', 'HP'),
  ('00000000-0000-4000-8000-000000002014', 'ram', '16GB'),
  ('00000000-0000-4000-8000-000000002014', 'use_case', 'gaming'),
  ('00000000-0000-4000-8000-000000002015', 'brand', 'Logitech'),
  ('00000000-0000-4000-8000-000000002015', 'use_case', 'productivity')
ON CONFLICT (product_id, key) DO UPDATE
SET value = EXCLUDED.value;

INSERT INTO carts (id, buyer_id)
VALUES
  ('00000000-0000-4000-8000-000000003001', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000003002', '00000000-0000-4000-8000-000000000202'),
  ('00000000-0000-4000-8000-000000003003', '00000000-0000-4000-8000-000000000203')
ON CONFLICT (buyer_id) DO NOTHING;

INSERT INTO cart_items (cart_id, product_id, quantity)
VALUES
  ('00000000-0000-4000-8000-000000003001', '00000000-0000-4000-8000-000000002001', 1),
  ('00000000-0000-4000-8000-000000003001', '00000000-0000-4000-8000-000000002007', 1),
  ('00000000-0000-4000-8000-000000003002', '00000000-0000-4000-8000-000000002013', 1),
  ('00000000-0000-4000-8000-000000003003', '00000000-0000-4000-8000-000000002005', 2)
ON CONFLICT (cart_id, product_id) DO UPDATE
SET quantity = EXCLUDED.quantity;

INSERT INTO orders (id, buyer_id, merchant_id, total_amount, currency, status, payment_status)
VALUES
  ('00000000-0000-4000-8000-000000004001', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000001001', 11895.00, 'INR', 'COMPLETED', 'PAID'),
  ('00000000-0000-4000-8000-000000004002', '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000001002', 25900.00, 'INR', 'CONFIRMED', 'PAID'),
  ('00000000-0000-4000-8000-000000004003', '00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000001003', 92485.00, 'INR', 'PENDING', 'PENDING')
ON CONFLICT (id) DO UPDATE
SET total_amount = EXCLUDED.total_amount,
    status = EXCLUDED.status,
    payment_status = EXCLUDED.payment_status;

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES
  ('00000000-0000-4000-8000-000000004001', '00000000-0000-4000-8000-000000002001', 1, 11895.00),
  ('00000000-0000-4000-8000-000000004002', '00000000-0000-4000-8000-000000002008', 1, 25900.00),
  ('00000000-0000-4000-8000-000000004003', '00000000-0000-4000-8000-000000002014', 1, 82990.00),
  ('00000000-0000-4000-8000-000000004003', '00000000-0000-4000-8000-000000002015', 1, 9495.00)
ON CONFLICT (order_id, product_id) DO UPDATE
SET quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price;
