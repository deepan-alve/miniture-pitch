-- Demo seed data — uses real Miniture product handles + plausible Indian
-- pricing. This is what makes the demo feel like *their* app, not a clone.
--
-- Three accounts shape the demo narrative:
--   1. Josh's Parent     — multi-kid (4yo + 1yo), heavy buyer.        Path: refurb / trade-in
--   2. Maya's Mom        — single kid (now 7), aged out of catalog.   Path: donate (steering demo)
--   3. ops admin         — internal user for QC dashboard

set search_path = public;
begin;

-- ------------------------------------------------------------
-- Catalog (real Miniture products + categories from app)
-- ------------------------------------------------------------

insert into products (id, shopify_product_id, title, description, price_inr, min_age_months, max_age_months, category, hero_image_url) values
  ('aaaaaaaa-0001-0000-0000-000000000001', 'gid://shopify/Product/seed-flexdesk-super',
   'FlexDesk 6-in-1 Super Desk',
   'Multi-feature growing desk that adapts as your child grows. Tilt, flat, drawing, easel — six configurations in one.',
   18999, 24, 96, 'fine_motor',
   'https://miniture.in/cdn/shop/files/flexdesk-hero.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000002', 'gid://shopify/Product/seed-throne',
   'Miniture Throne — Toddler Lounger',
   'Foam-core chair sized for toddlers. Surprisingly sturdy, easy to wipe down.',
   3499, 18, 60, 'fine_motor',
   'https://miniture.in/cdn/shop/files/throne.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000003', 'gid://shopify/Product/seed-pushcart',
   'Miniture Push Cart',
   'Solid wood push-along, weighted just enough that early walkers can lean on it without it tipping.',
   4999, 9, 24, 'fine_motor',
   'https://miniture.in/cdn/shop/files/pushcart.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000004', 'gid://shopify/Product/seed-stepstool',
   'Steady Steps Step Stool',
   'Two-step stool for the bathroom or kitchen. Non-slip rubber feet, child-safe rounded edges.',
   1899, 18, 84, 'fine_motor',
   'https://miniture.in/cdn/shop/files/stepstool.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000005', 'gid://shopify/Product/seed-waterpump',
   'Miniture Water Pump Dispenser',
   'Lever-pump dispenser sized for small hands. Builds independence in pouring water.',
   1299, 24, 72, 'fine_motor',
   'https://miniture.in/cdn/shop/files/waterpump.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000006', 'gid://shopify/Product/seed-cactus-shelf',
   'Cactus Themed Shelf',
   'Open-front bookshelf for picture books. Front-facing display so kids choose their own.',
   5499, 24, 96, 'literacy',
   'https://miniture.in/cdn/shop/files/cactus-shelf.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000007', 'gid://shopify/Product/seed-rocket-bookshelf',
   'Rocket Bookshelf',
   'Vertical book display in rocket form. Front-facing books on multiple levels.',
   6499, 24, 96, 'literacy',
   'https://miniture.in/cdn/shop/files/rocket-bookshelf.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000008', 'gid://shopify/Product/seed-curio-corner',
   'Curio Corner Carrot Bookshelf',
   'Booknook with a carrot-shaped silhouette. Houses ~30 picture books.',
   4799, 18, 72, 'literacy',
   'https://miniture.in/cdn/shop/files/curio-corner.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000009', 'gid://shopify/Product/seed-art-kit',
   'Art Kit',
   'Curated set: chunky crayons, finger paints, brushes, and reusable smock. Mess-tolerated palette.',
   1499, 18, 60, 'fine_motor',
   'https://miniture.in/cdn/shop/files/art-kit.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000010', 'gid://shopify/Product/seed-storage-wagon',
   'Storage Wagon',
   'Roll-around toy bin. Wood frame, fabric tubs. Kids can pull it room to room.',
   3899, 24, 96, 'fine_motor',
   'https://miniture.in/cdn/shop/files/storage-wagon.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000011', 'gid://shopify/Product/seed-toy-organizer',
   'Space Contour Toy Organizer',
   'Multi-bin storage that doubles as a play surface. Bins lift out for transport.',
   7299, 24, 120, 'fine_motor',
   'https://miniture.in/cdn/shop/files/toy-organizer.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000012', 'gid://shopify/Product/seed-height-adjustable',
   'Height-Adjustable Study Table',
   'Single-pillar desk that rises with your child. Anti-glare laminate top.',
   12999, 36, 144, 'literacy',
   'https://miniture.in/cdn/shop/files/height-adjustable.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000013', 'gid://shopify/Product/seed-flexdesk-6in1',
   'FlexDesk 6-in-1 Multi-Feature Study Table',
   'Sister product to the Super Desk. Smaller footprint, same six configurations.',
   15499, 24, 96, 'literacy',
   'https://miniture.in/cdn/shop/files/flexdesk-6in1.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000014', 'gid://shopify/Product/seed-nubo-grov',
   'Nubo Grov Activity Tray',
   'Wooden activity tray for sensory bins, painting, or dough work. High lip contains spills.',
   2299, 18, 72, 'sensory',
   'https://miniture.in/cdn/shop/files/nubo-grov.jpg'),

  ('aaaaaaaa-0001-0000-0000-000000000015', 'gid://shopify/Product/seed-duplo-blocks',
   'Duplo Block Collection',
   'Curated 60-piece Duplo set. Mixed bricks, wheels, and minifigs to spark open-ended building.',
   2799, 18, 60, 'logical_reasoning',
   'https://miniture.in/cdn/shop/files/duplo-blocks.jpg');

-- ------------------------------------------------------------
-- NGO partners (donation path)
-- ------------------------------------------------------------

insert into ngo_partners (id, name, description, logo_url, has_80g_status, active) values
  ('cccccccc-0001-0000-0000-000000000001', 'Smile Foundation',
   'Pan-India NGO running early childhood centres for underserved communities. Runs Mission Education programmes in 25 states.',
   'https://www.smilefoundationindia.org/logo.png',
   true, true),
  ('cccccccc-0001-0000-0000-000000000002', 'Goonj',
   'Material-aid NGO that channels reusable goods (clothes, school supplies, toys) to rural communities. Receives in-kind donations regularly.',
   'https://goonj.org/logo.png',
   true, true),
  ('cccccccc-0001-0000-0000-000000000003', 'Anganwadi Network — Karnataka',
   'State-government early childhood centres. We partner with 14 anganwadis in rural Karnataka districts to distribute educational toys.',
   null,
   false, true);

-- ------------------------------------------------------------
-- Demo accounts (linked to auth.users created out-of-band; the
-- auth_user_id values below are placeholders — when we wire up Auth,
-- we'll either UPDATE them or recreate accounts after sign-up).
-- ------------------------------------------------------------

insert into accounts (id, auth_user_id, display_name, phone, default_address, shopify_customer_gid) values
  ('bbbbbbbb-0001-0000-0000-000000000001', 'bbbbbbbb-7777-0000-0000-000000000001',
   'Josh''s Parent', '+919876543210',
   jsonb_build_object('line1','42 Indira Nagar','line2','5th Cross','city','Bengaluru','state','Karnataka','pincode','560038'),
   'gid://shopify/Customer/seed-josh-parent'),

  ('bbbbbbbb-0001-0000-0000-000000000002', 'bbbbbbbb-7777-0000-0000-000000000002',
   'Maya''s Mom', '+919812345678',
   jsonb_build_object('line1','12 Brigade Road','city','Bengaluru','state','Karnataka','pincode','560001'),
   'gid://shopify/Customer/seed-maya-mom'),

  ('bbbbbbbb-0001-0000-0000-000000000003', 'bbbbbbbb-7777-0000-0000-000000000003',
   'Ops Admin', '+918888888888',
   jsonb_build_object('line1','Miniture Warehouse','city','Bengaluru'),
   'gid://shopify/Customer/seed-ops');

-- Children (drives the path-recommendation logic — multi-kid vs aged-out)
insert into child_profiles (account_id, name, birth_date) values
  ('bbbbbbbb-0001-0000-0000-000000000001', 'Josh',  date '2022-03-15'),  -- ~3.1 yrs at 2026-05
  ('bbbbbbbb-0001-0000-0000-000000000001', 'Anya',  date '2024-11-08'),  -- ~1.5 yrs
  ('bbbbbbbb-0001-0000-0000-000000000002', 'Maya',  date '2018-06-22');  -- ~7.9 yrs (aged out → donate path)

-- ------------------------------------------------------------
-- Orders + line items + owned_units
-- ------------------------------------------------------------

-- Josh's Parent: a primary order with several big items
insert into orders (id, shopify_order_id, account_id, placed_at, total_inr) values
  ('dddddddd-0001-0000-0000-000000000001', 'gid://shopify/Order/seed-josh-001',
   'bbbbbbbb-0001-0000-0000-000000000001', timestamptz '2024-06-15 10:30:00+05:30', 27998);

insert into order_line_items (id, order_id, product_id, quantity, unit_price_inr) values
  ('eeeeeeee-0001-0000-0000-000000000001', 'dddddddd-0001-0000-0000-000000000001',
   'aaaaaaaa-0001-0000-0000-000000000013', 1, 15499),  -- FlexDesk 6-in-1
  ('eeeeeeee-0001-0000-0000-000000000002', 'dddddddd-0001-0000-0000-000000000001',
   'aaaaaaaa-0001-0000-0000-000000000003', 1, 4999),   -- Push cart
  ('eeeeeeee-0001-0000-0000-000000000003', 'dddddddd-0001-0000-0000-000000000001',
   'aaaaaaaa-0001-0000-0000-000000000004', 1, 1899),   -- Step stool
  ('eeeeeeee-0001-0000-0000-000000000004', 'dddddddd-0001-0000-0000-000000000001',
   'aaaaaaaa-0001-0000-0000-000000000009', 1, 1499),   -- Art kit
  ('eeeeeeee-0001-0000-0000-000000000005', 'dddddddd-0001-0000-0000-000000000001',
   'aaaaaaaa-0001-0000-0000-000000000005', 1, 1299),   -- Water pump
  ('eeeeeeee-0001-0000-0000-000000000006', 'dddddddd-0001-0000-0000-000000000001',
   'aaaaaaaa-0001-0000-0000-000000000014', 1, 2299);   -- Activity tray

-- Owned units derived from those line items
insert into owned_units (id, account_id, product_id, order_line_item_id, acquired_at, status) values
  ('ffffffff-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000013', 'eeeeeeee-0001-0000-0000-000000000001', timestamptz '2024-06-18', 'owned'),
  ('ffffffff-0001-0000-0000-000000000002', 'bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000003',  'eeeeeeee-0001-0000-0000-000000000002', timestamptz '2024-06-18', 'owned'),
  ('ffffffff-0001-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000004',  'eeeeeeee-0001-0000-0000-000000000003', timestamptz '2024-06-18', 'owned'),
  ('ffffffff-0001-0000-0000-000000000004', 'bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000009',  'eeeeeeee-0001-0000-0000-000000000004', timestamptz '2024-06-18', 'owned'),
  ('ffffffff-0001-0000-0000-000000000005', 'bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000005',  'eeeeeeee-0001-0000-0000-000000000005', timestamptz '2024-06-18', 'owned'),
  ('ffffffff-0001-0000-0000-000000000006', 'bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000014', 'eeeeeeee-0001-0000-0000-000000000006', timestamptz '2024-06-18', 'owned');

-- Maya's Mom: a single big purchase from years ago — the kid has aged out
insert into orders (id, shopify_order_id, account_id, placed_at, total_inr) values
  ('dddddddd-0001-0000-0000-000000000002', 'gid://shopify/Order/seed-maya-001',
   'bbbbbbbb-0001-0000-0000-000000000002', timestamptz '2021-11-04 14:20:00+05:30', 24398);

insert into order_line_items (id, order_id, product_id, quantity, unit_price_inr) values
  ('eeeeeeee-0002-0000-0000-000000000001', 'dddddddd-0001-0000-0000-000000000002',
   'aaaaaaaa-0001-0000-0000-000000000001', 1, 18999),  -- FlexDesk Super
  ('eeeeeeee-0002-0000-0000-000000000002', 'dddddddd-0001-0000-0000-000000000002',
   'aaaaaaaa-0001-0000-0000-000000000002', 1, 3499),   -- Throne
  ('eeeeeeee-0002-0000-0000-000000000003', 'dddddddd-0001-0000-0000-000000000002',
   'aaaaaaaa-0001-0000-0000-000000000009', 1, 1499),   -- Art kit
  ('eeeeeeee-0002-0000-0000-000000000004', 'dddddddd-0001-0000-0000-000000000002',
   'aaaaaaaa-0001-0000-0000-000000000015', 1, 2799);   -- Duplo

insert into owned_units (id, account_id, product_id, order_line_item_id, acquired_at, status) values
  ('ffffffff-0002-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000001', 'eeeeeeee-0002-0000-0000-000000000001', timestamptz '2021-11-08', 'owned'),
  ('ffffffff-0002-0000-0000-000000000002', 'bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000002', 'eeeeeeee-0002-0000-0000-000000000002', timestamptz '2021-11-08', 'owned'),
  ('ffffffff-0002-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000009', 'eeeeeeee-0002-0000-0000-000000000003', timestamptz '2021-11-08', 'owned'),
  ('ffffffff-0002-0000-0000-000000000004', 'bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000015', 'eeeeeeee-0002-0000-0000-000000000004', timestamptz '2021-11-08', 'owned');

commit;
