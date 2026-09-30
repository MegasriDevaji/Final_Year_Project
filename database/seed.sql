-- =========================================================
-- Amazon E-Commerce Seed Data Script for Oracle Database 23c
-- Target PDB: FREEPDB1 | Schema: RETAIL_STORE
-- =========================================================

-- 1. Insert Categories
INSERT INTO CATEGORIES (NAME, SLUG, ICON, DESCRIPTION) VALUES ('Electronics', 'electronics', 'fa-laptop', 'Smartphones, Audio, TVs, Wearables & Smart Home');
INSERT INTO CATEGORIES (NAME, SLUG, ICON, DESCRIPTION) VALUES ('Computers & Gaming', 'computers', 'fa-desktop', 'Laptops, Monitors, Keyboards, PC Gaming');
INSERT INTO CATEGORIES (NAME, SLUG, ICON, DESCRIPTION) VALUES ('Home & Kitchen', 'home-kitchen', 'fa-couch', 'Appliances, Cookware, Decor, Robot Vacuums');
INSERT INTO CATEGORIES (NAME, SLUG, ICON, DESCRIPTION) VALUES ('Fashion & Apparel', 'fashion', 'fa-shirt', 'Men & Women Apparel, Shoes, Watches, Sunglasses');
INSERT INTO CATEGORIES (NAME, SLUG, ICON, DESCRIPTION) VALUES ('Beauty & Personal Care', 'beauty', 'fa-pump-soap', 'Skincare, Haircare, Perfumes, Grooming');
INSERT INTO CATEGORIES (NAME, SLUG, ICON, DESCRIPTION) VALUES ('Books & Media', 'books', 'fa-book', 'Bestsellers, Tech Guides, Fiction, Comics');
INSERT INTO CATEGORIES (NAME, SLUG, ICON, DESCRIPTION) VALUES ('Toys & Games', 'toys', 'fa-gamepad', 'Board Games, Building Blocks, Action Figures');
INSERT INTO CATEGORIES (NAME, SLUG, ICON, DESCRIPTION) VALUES ('Sports & Fitness', 'sports', 'fa-dumbbell', 'Fitness Gear, Yoga Mats, Outdoor Equipment');

-- 2. Insert Products (Category 1: Electronics)
INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Apple iPhone 15 Pro (256 GB) - Natural Titanium', 'Titanium design with A17 Pro chip, customizable Action button, dynamic island, 48MP camera system, and USB-C speed connectivity.', 'Apple', 999.00, 1099.00, 9, 4.8, 12450, 45, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80', 1, 1, 1, 'Top Seller');

INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Sony WH-1000XM5 Wireless Noise Canceling Headphones', 'Industry-leading noise canceling with two processors and 8 microphones. Up to 30-hour battery life and ultra-comfortable lightweight design.', 'Sony', 348.00, 399.99, 13, 4.7, 8920, 60, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', 1, 1, 1, 'Epic Savings');

INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Samsung 65-Inch Class OLED 4K S90C Series Smart TV', 'Neural Quantum Processor with 4K Upscaling, Quantum HDR OLED, Motion Xcelerator Turbo+ 144Hz, Dolby Atmos sound.', 'Samsung', 1597.99, 1899.99, 16, 4.6, 3120, 15, 'https://images.unsplash.com/photo-1593784991095-87710daf9977?auto=format&fit=crop&w=800&q=80', 1, 1, 0, 'Prime Choice');

INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Apple Watch Series 9 GPS 45mm Midnight Aluminum', 'Advanced health sensors, double tap gesture control, brighter Always-On Retina display, faster S9 SiP chip.', 'Apple', 389.00, 429.00, 9, 4.7, 5430, 30, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80', 1, 1, 0, 'Best Value');

-- Products (Category 2: Computers & Gaming)
INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Apple MacBook Air 15-inch M2 Chip (16GB RAM, 512GB SSD)', 'Incredibly thin design, vibrant Liquid Retina Display, 1080p FaceTime HD camera, six-speaker sound system with Spatial Audio.', 'Apple', 1299.00, 1499.00, 13, 4.9, 6780, 25, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', 2, 1, 1, 'Limited Time Deal');

INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('ASUS ROG Zephyrus G16 Gaming Laptop (Intel Core i9, RTX 4070)', '16" 240Hz QHD+ Display, 32GB LPDDR5X RAM, 1TB PCIe 4.0 SSD, CNC Aluminum Chassis with customizable RGB lighting.', 'ASUS', 1899.99, 2199.99, 14, 4.6, 1450, 20, 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80', 2, 1, 0, 'Gaming Choice');

INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Logitech MX Master 3S Performance Wireless Mouse', '8K DPI tracking on any surface including glass, Quiet Clicks, Ergonomic design, Electromagnetic MagSpeed scrolling.', 'Logitech', 99.99, 109.99, 9, 4.8, 23100, 120, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80', 2, 1, 1, 'Overall Pick');

-- Products (Category 3: Home & Kitchen)
INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('DeLonghi Magnifica S Automatic Espresso & Cappuccino Machine', 'Compact bean-to-cup machine with manual milk frother for customized latte and cappuccino drinks.', 'DeLonghi', 549.95, 699.95, 21, 4.6, 4320, 18, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80', 3, 1, 1, 'Deal of the Day');

INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('iRobot Roomba j7+ Self-Emptying Robot Vacuum', 'Avoids pet waste and cords, 60-day self-empty base, Smart Mapping technology, ideal for homes with pets.', 'iRobot', 599.00, 799.99, 25, 4.5, 7890, 35, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80', 3, 1, 0, 'Save $200');

-- Products (Category 4: Fashion & Apparel)
INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Classic Leather Bomber Jacket for Men', '100% Genuine lambskin leather, soft viscose inner lining, heavy-duty YKK zipper, classic ribbed collar and cuffs.', 'UrbanStyle', 149.50, 220.00, 32, 4.5, 1290, 50, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80', 4, 1, 1, 'Fashion Deal');

INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Ray-Ban Classic Aviator Sunglasses (Gold/G-15 Green)', 'Timeless pilot metal frame, 100% UV protection lenses, durable metal frame with crystal clear glass lenses.', 'Ray-Ban', 163.00, 180.00, 9, 4.7, 15400, 80, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80', 4, 1, 0, 'Popular');

-- Products (Category 5: Beauty)
INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Dyson Airwrap Multi-Styler Complete Long', 'Curl, shape, smooth and hide flyaways with no extreme heat. Designed for multiple hair types and lengths.', 'Dyson', 599.99, 649.99, 8, 4.8, 3890, 22, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', 5, 1, 0, 'Luxury Beauty');

-- Products (Category 6: Books)
INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Atomic Habits: An Easy & Proven Way to Build Good Habits', 'The definitive guide to breaking bad behaviors and adopting good ones in 4 simple steps by James Clear.', 'Penguin Press', 13.79, 27.00, 49, 4.9, 142000, 200, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80', 6, 1, 1, '#1 Best Seller');

-- Products (Category 7: Toys & Games)
INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('LEGO Star Wars Millennium Falcon Building Set 75257', 'Includes 7 minifigures: Finn, Chewbacca, Lando Calrissian, C-3PO, Boolio, plus R2-D2 and D-O LEGO droids.', 'LEGO', 135.99, 169.99, 20, 4.9, 11200, 40, 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=800&q=80', 7, 1, 0, 'Collector Edition');

-- Products (Category 8: Sports)
INSERT INTO PRODUCTS (TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT) 
VALUES ('Adjustable Dumbbell Set (5 to 52.5 lbs Pair)', 'Replaces 15 sets of weights. Easy-to-use selection dials for adjusting weight from 5 up to 52.5 lbs.', 'Bowflex', 379.00, 429.00, 12, 4.7, 18400, 30, 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80', 8, 1, 1, 'Top Fitness');

-- 3. Insert Product Reviews
INSERT INTO PRODUCT_REVIEWS (PRODUCT_ID, USER_NAME, RATING, REVIEW_TITLE, COMMENT_TEXT) 
VALUES (1, 'Alex M.', 5, 'Best iPhone ever made!', 'The titanium feel is amazing and lightweight. Battery lasts all day long and the camera in low light is unbelievable.');

INSERT INTO PRODUCT_REVIEWS (PRODUCT_ID, USER_NAME, RATING, REVIEW_TITLE, COMMENT_TEXT) 
VALUES (1, 'Sarah K.', 5, 'Upgraded from 12 Pro', 'Fast delivery via Prime! Action button setup is super convenient.');

INSERT INTO PRODUCT_REVIEWS (PRODUCT_ID, USER_NAME, RATING, REVIEW_TITLE, COMMENT_TEXT) 
VALUES (2, 'David R.', 5, 'Silence on airplane flights', 'Active noise cancellation is unbeatable. Used it on a 12 hour flight and didn''t hear a single baby crying.');

INSERT INTO PRODUCT_REVIEWS (PRODUCT_ID, USER_NAME, RATING, REVIEW_TITLE, COMMENT_TEXT) 
VALUES (5, 'Elena P.', 5, 'Sleek, silent, and blazing fast!', 'M2 chip handles 4K video editing without spinning up any fan noise. Super light weight for travel.');

-- 4. Insert Default Admin User
INSERT INTO USERS (FULL_NAME, EMAIL, PASSWORD_HASH, PHONE, ADDRESS, CITY, POSTAL_CODE, ROLE) 
VALUES ('Amazon Admin', 'admin@amazon.com', 'admin123', '+1-800-555-0199', '100 Amazon Way', 'Seattle', '98101', 'ADMIN');

INSERT INTO USERS (FULL_NAME, EMAIL, PASSWORD_HASH, PHONE, ADDRESS, CITY, POSTAL_CODE, ROLE) 
VALUES ('John Doe', 'john@example.com', 'user123', '+1-555-0144', '742 Evergreen Terrace', 'Springfield', '97477', 'CUSTOMER');

COMMIT;
