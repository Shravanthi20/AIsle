-- Supplemental development catalog: 50 deterministic products per original merchant,
-- plus three clothing merchants with 15 shared dress/color combinations each.
-- Safe to rerun because user, merchant, product, and attribute keys are stable.

INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  '00000000-0000-4000-8000-000000000104',
  'Vikram Rao',
  'vikram@homepulse.test',
  'scrypt:c8e3c1e95463104087089b869b5a8598:460cc79d4647778c684cf98c441172870c18048f39e516c3b9f263d23885022ddcc09994e0ed0b0e165e6aa6a4106b8c8881975790f5318b712da599929aafbd',
  'MERCHANT'
)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

INSERT INTO merchants (id, user_id, store_name, description)
VALUES (
  '00000000-0000-4000-8000-000000001004',
  '00000000-0000-4000-8000-000000000104',
  'HomePulse',
  'Smart home, kitchen, and practical lifestyle products.'
)
ON CONFLICT (user_id) DO UPDATE
SET store_name = EXCLUDED.store_name,
    description = EXCLUDED.description;

WITH merchant_catalog AS (
  SELECT * FROM (VALUES
    (
      1,
      '00000000-0000-4000-8000-000000001001'::uuid,
      'StrideHub',
      ARRAY['Running shoes', 'Fitness products', 'Sports accessories', 'Recovery gear', 'Outdoor training']::text[],
      ARRAY['daily running', 'strength training', 'gym workouts', 'recovery', 'outdoor training']::text[],
      1800::numeric
    ),
    (
      2,
      '00000000-0000-4000-8000-000000001002'::uuid,
      'SoundNest',
      ARRAY['Headphones', 'Earbuds', 'Audio accessories', 'Conference audio', 'Travel audio']::text[],
      ARRAY['music listening', 'travel', 'work calls', 'gaming audio', 'commuting']::text[],
      2200::numeric
    ),
    (
      3,
      '00000000-0000-4000-8000-000000001003'::uuid,
      'TechCrate',
      ARRAY['Laptops', 'Monitors', 'Keyboards', 'Desk accessories', 'Storage devices']::text[],
      ARRAY['coding', 'productivity', 'gaming', 'remote work', 'content creation']::text[],
      4200::numeric
    ),
    (
      4,
      '00000000-0000-4000-8000-000000001004'::uuid,
      'HomePulse',
      ARRAY['Smart home', 'Kitchen appliances', 'Lighting', 'Home organization', 'Lifestyle products']::text[],
      ARRAY['home automation', 'cooking', 'ambient lighting', 'organization', 'everyday living']::text[],
      1400::numeric
    )
  ) AS data(merchant_number, merchant_id, brand, categories, use_cases, base_price)
), generated_products AS (
  SELECT
    md5(format('aisle-large-catalog-%s-%s', catalog.merchant_number, series.product_number))::uuid AS id,
    catalog.merchant_id,
    format('%s %s %s', catalog.brand, catalog.categories[1 + ((series.product_number - 1) % 5)], lpad(series.product_number::text, 2, '0')) AS name,
    format('%s product for %s. Stocked for recommendation, upsell, and cross-sell testing.', catalog.categories[1 + ((series.product_number - 1) % 5)], catalog.use_cases[1 + ((series.product_number - 1) % 5)]) AS description,
    catalog.categories[1 + ((series.product_number - 1) % 5)] AS category,
    catalog.base_price + (((series.product_number * 137) % 18) * 500) AS price,
    'INR'::char(3) AS currency,
    5 + ((series.product_number * 7) % 46) AS stock,
    format('https://example.test/images/%s-%s.jpg', lower(replace(catalog.brand, ' ', '-')), series.product_number) AS image_url,
    'ACTIVE'::product_status AS status,
    catalog.brand,
    catalog.use_cases[1 + ((series.product_number - 1) % 5)] AS use_case,
    CASE WHEN series.product_number % 3 = 0 THEN 'premium' WHEN series.product_number % 3 = 1 THEN 'standard' ELSE 'value' END AS tier,
    CASE WHEN series.product_number % 2 = 0 THEN 'universal' ELSE 'everyday' END AS compatibility
  FROM merchant_catalog catalog
  CROSS JOIN generate_series(1, 50) AS series(product_number)
)
INSERT INTO products (id, merchant_id, name, description, category, price, currency, stock, image_url, status)
SELECT id, merchant_id, name, description, category, price, currency, stock, image_url, status
FROM generated_products
ON CONFLICT (id) DO UPDATE
SET merchant_id = EXCLUDED.merchant_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    stock = EXCLUDED.stock,
    image_url = EXCLUDED.image_url,
    status = EXCLUDED.status;

WITH merchant_catalog AS (
  SELECT * FROM (VALUES
    (1, '00000000-0000-4000-8000-000000001001'::uuid, 'StrideHub'),
    (2, '00000000-0000-4000-8000-000000001002'::uuid, 'SoundNest'),
    (3, '00000000-0000-4000-8000-000000001003'::uuid, 'TechCrate'),
    (4, '00000000-0000-4000-8000-000000001004'::uuid, 'HomePulse')
  ) AS data(merchant_number, merchant_id, brand)
), generated_attributes AS (
  SELECT
    md5(format('aisle-large-catalog-%s-%s', catalog.merchant_number, series.product_number))::uuid AS product_id,
    attribute.key,
    attribute.value
  FROM merchant_catalog catalog
  CROSS JOIN generate_series(1, 50) AS series(product_number)
  CROSS JOIN LATERAL (
    VALUES
      ('brand', catalog.brand),
      ('use_case', CASE catalog.merchant_number
        WHEN 1 THEN (ARRAY['daily running', 'strength training', 'gym workouts', 'recovery', 'outdoor training'])[1 + ((series.product_number - 1) % 5)]
        WHEN 2 THEN (ARRAY['music listening', 'travel', 'work calls', 'gaming audio', 'commuting'])[1 + ((series.product_number - 1) % 5)]
        WHEN 3 THEN (ARRAY['coding', 'productivity', 'gaming', 'remote work', 'content creation'])[1 + ((series.product_number - 1) % 5)]
        ELSE (ARRAY['home automation', 'cooking', 'ambient lighting', 'organization', 'everyday living'])[1 + ((series.product_number - 1) % 5)]
      END),
      ('tier', CASE WHEN series.product_number % 3 = 0 THEN 'premium' WHEN series.product_number % 3 = 1 THEN 'standard' ELSE 'value' END),
      ('compatibility', CASE WHEN series.product_number % 2 = 0 THEN 'universal' ELSE 'everyday' END)
  ) AS attribute(key, value)
)
INSERT INTO product_attributes (product_id, key, value)
SELECT product_id, key, value
FROM generated_attributes
ON CONFLICT (product_id, key) DO UPDATE
SET value = EXCLUDED.value;

INSERT INTO users (id, name, email, password_hash, role)
VALUES
  ('00000000-0000-4000-8000-000000000105', 'Asha Verma', 'asha@rangrez.test', 'scrypt:c8e3c1e95463104087089b869b5a8598:460cc79d4647778c684cf98c441172870c18048f39e516c3b9f263d23885022ddcc09994e0ed0b0e165e6aa6a4106b8c8881975790f5318b712da599929aafbd', 'MERCHANT'),
  ('00000000-0000-4000-8000-000000000106', 'Meera Joshi', 'meera@vastra.test', 'scrypt:c8e3c1e95463104087089b869b5a8598:460cc79d4647778c684cf98c441172870c18048f39e516c3b9f263d23885022ddcc09994e0ed0b0e165e6aa6a4106b8c8881975790f5318b712da599929aafbd', 'MERCHANT'),
  ('00000000-0000-4000-8000-000000000107', 'Kavya Nair', 'kavya@rangoli.test', 'scrypt:c8e3c1e95463104087089b869b5a8598:460cc79d4647778c684cf98c441172870c18048f39e516c3b9f263d23885022ddcc09994e0ed0b0e165e6aa6a4106b8c8881975790f5318b712da599929aafbd', 'MERCHANT')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

INSERT INTO merchants (id, user_id, store_name, description)
VALUES
  ('00000000-0000-4000-8000-000000001005', '00000000-0000-4000-8000-000000000105', 'Rangrez', 'Contemporary Indian clothing, kurtis, sarees, and festive wear.'),
  ('00000000-0000-4000-8000-000000001006', '00000000-0000-4000-8000-000000000106', 'Vastra', 'Everyday ethnic wear and occasion-ready Indian fashion.'),
  ('00000000-0000-4000-8000-000000001007', '00000000-0000-4000-8000-000000000107', 'Rangoli', 'Colorful Indian dresses for celebrations and daily style.')
ON CONFLICT (user_id) DO UPDATE
SET store_name = EXCLUDED.store_name,
    description = EXCLUDED.description;

WITH clothing_merchants AS (
  SELECT * FROM (VALUES
    (5, '00000000-0000-4000-8000-000000001005'::uuid),
    (6, '00000000-0000-4000-8000-000000001006'::uuid),
    (7, '00000000-0000-4000-8000-000000001007'::uuid)
  ) AS data(merchant_number, merchant_id)
), dresses AS (
  SELECT * FROM (VALUES
    (1, 'Cotton Kurti', 'Kurtis', 'everyday ethnic wear'),
    (2, 'Silk Saree', 'Sarees', 'festive wear'),
    (3, 'Festive Lehenga', 'Lehengas', 'wedding and celebration wear'),
    (4, 'Palazzo Pants', 'Ethnic pants', 'comfortable ethnic wear'),
    (5, 'Anarkali Suit', 'Anarkali suits', 'occasion wear')
  ) AS data(dress_number, dress_name, category, use_case)
), colors AS (
  SELECT * FROM (VALUES
    (1, 'Black'),
    (2, 'White'),
    (3, 'Maroon')
  ) AS data(color_number, color)
), clothing_products AS (
  SELECT
    md5(format('aisle-clothing-%s-%s-%s', merchant.merchant_number, dress.dress_number, color.color_number))::uuid AS id,
    merchant.merchant_id,
    format('%s %s', color.color, dress.dress_name) AS name,
    format('%s %s for %s. Indian clothing stocked for recommendation, upsell, and cross-sell testing.', color.color, dress.dress_name, dress.use_case) AS description,
    dress.category,
    CASE
      WHEN dress.dress_number = 1 AND color.color_number = 1 THEN CASE merchant.merchant_number WHEN 5 THEN 2000.00 WHEN 6 THEN 5000.00 ELSE 6000.00 END
      WHEN dress.dress_number = 1 THEN 2500.00 + ((merchant.merchant_number - 5) * 1500.00) + ((color.color_number - 2) * 500.00)
      ELSE 3500.00 + ((dress.dress_number - 2) * 1200.00) + ((merchant.merchant_number - 5) * 900.00) + ((color.color_number - 1) * 400.00)
    END AS price,
    'INR'::char(3) AS currency,
    12 + ((merchant.merchant_number + dress.dress_number + color.color_number) % 25) AS stock,
    format('https://example.test/images/%s-%s.jpg', lower(replace(color.color, ' ', '-')), lower(replace(dress.dress_name, ' ', '-'))) AS image_url,
    'ACTIVE'::product_status AS status,
    color.color,
    dress.use_case,
    CASE WHEN dress.dress_number IN (2, 3) THEN 'festive' ELSE 'everyday' END AS occasion,
    CASE WHEN merchant.merchant_number = 5 THEN 'artisan' WHEN merchant.merchant_number = 6 THEN 'classic' ELSE 'premium' END AS collection
  FROM clothing_merchants merchant
  CROSS JOIN dresses dress
  CROSS JOIN colors color
)
INSERT INTO products (id, merchant_id, name, description, category, price, currency, stock, image_url, status)
SELECT id, merchant_id, name, description, category, price, currency, stock, image_url, status
FROM clothing_products
ON CONFLICT (id) DO UPDATE
SET merchant_id = EXCLUDED.merchant_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    stock = EXCLUDED.stock,
    image_url = EXCLUDED.image_url,
    status = EXCLUDED.status;

WITH clothing_merchants AS (
  SELECT * FROM (VALUES
    (5, '00000000-0000-4000-8000-000000001005'::uuid),
    (6, '00000000-0000-4000-8000-000000001006'::uuid),
    (7, '00000000-0000-4000-8000-000000001007'::uuid)
  ) AS data(merchant_number, merchant_id)
), dresses AS (
  SELECT * FROM (VALUES
    (1, 'Cotton Kurti', 'everyday ethnic wear'),
    (2, 'Silk Saree', 'festive wear'),
    (3, 'Festive Lehenga', 'wedding and celebration wear'),
    (4, 'Palazzo Pants', 'comfortable ethnic wear'),
    (5, 'Anarkali Suit', 'occasion wear')
  ) AS data(dress_number, dress_name, use_case)
), colors AS (
  SELECT * FROM (VALUES
    (1, 'Black'),
    (2, 'White'),
    (3, 'Maroon')
  ) AS data(color_number, color)
), clothing_attributes AS (
  SELECT
    md5(format('aisle-clothing-%s-%s-%s', merchant.merchant_number, dress.dress_number, color.color_number))::uuid AS product_id,
    attribute.key,
    attribute.value
  FROM clothing_merchants merchant
  CROSS JOIN dresses dress
  CROSS JOIN colors color
  CROSS JOIN LATERAL (
    VALUES
      ('color', color.color),
      ('use_case', dress.use_case),
      ('occasion', CASE WHEN dress.dress_number IN (2, 3) THEN 'festive' ELSE 'everyday' END),
      ('collection', CASE WHEN merchant.merchant_number = 5 THEN 'artisan' WHEN merchant.merchant_number = 6 THEN 'classic' ELSE 'premium' END)
  ) AS attribute(key, value)
)
INSERT INTO product_attributes (product_id, key, value)
SELECT product_id, key, value
FROM clothing_attributes
ON CONFLICT (product_id, key) DO UPDATE
SET value = EXCLUDED.value;
