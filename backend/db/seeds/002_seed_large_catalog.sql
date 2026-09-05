-- Supplemental development catalog: 50 deterministic products per merchant.
-- Safe to rerun because user, merchant, product, and attribute keys are stable.

INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  '00000000-0000-4000-8000-000000000104',
  'Vikram Rao',
  'vikram@homepulse.test',
  'scrypt:aisle_demo_merchant123:c4bdf8f4ae8c23ccb9c99566ae606d00cfdf14999ca1af7355c860c71c81055a7643bf484e5623146a2d88c97acb975b2a665bd537a4ab00d608581686b97502',
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
