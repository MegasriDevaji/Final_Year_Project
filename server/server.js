const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializePool, getDb } = require('./db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', apiRoutes);

// Catch-all to serve index.html for SPA client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/* ───────────────────────────────────────────────────────────────
   AUTO-SEED: populate MongoDB if collections are empty
   Runs once on startup — safe to re-deploy multiple times
─────────────────────────────────────────────────────────────── */
async function autoSeedIfEmpty() {
  const db = getDb();
  const count = await db.collection('products').countDocuments();
  if (count > 0) {
    console.log(`✅ Database already has ${count} products — skipping seed.`);
    return;
  }

  console.log('🌱 Database is empty — auto-seeding with sample data...');

  const categories = [
    { _id: 1, NAME: 'Electronics', SLUG: 'electronics', ICON: 'fa-laptop', DESCRIPTION: 'Smartphones, Audio, TVs, Wearables & Smart Home', PARENT_ID: null },
    { _id: 2, NAME: 'Computers & Gaming', SLUG: 'computers', ICON: 'fa-desktop', DESCRIPTION: 'Laptops, Monitors, Keyboards, PC Gaming', PARENT_ID: null },
    { _id: 3, NAME: 'Home & Kitchen', SLUG: 'home-kitchen', ICON: 'fa-couch', DESCRIPTION: 'Appliances, Cookware, Decor, Robot Vacuums', PARENT_ID: null },
    { _id: 4, NAME: 'Fashion & Apparel', SLUG: 'fashion', ICON: 'fa-shirt', DESCRIPTION: 'Men & Women Apparel, Shoes, Watches, Sunglasses', PARENT_ID: null },
    { _id: 5, NAME: 'Beauty & Personal Care', SLUG: 'beauty', ICON: 'fa-pump-soap', DESCRIPTION: 'Skincare, Haircare, Perfumes, Grooming', PARENT_ID: null },
    { _id: 6, NAME: 'Books & Media', SLUG: 'books', ICON: 'fa-book', DESCRIPTION: 'Bestsellers, Tech Guides, Fiction, Comics', PARENT_ID: null },
    { _id: 7, NAME: 'Toys & Games', SLUG: 'toys', ICON: 'fa-gamepad', DESCRIPTION: 'Board Games, Building Blocks, Action Figures', PARENT_ID: null },
    { _id: 8, NAME: 'Sports & Fitness', SLUG: 'sports', ICON: 'fa-dumbbell', DESCRIPTION: 'Fitness Gear, Yoga Mats, Outdoor Equipment', PARENT_ID: null }
  ];

  const products = [
    { _id: 1, TITLE: 'Apple iPhone 15 Pro (256 GB) - Natural Titanium', DESCRIPTION: 'Titanium design with A17 Pro chip, customizable Action button, dynamic island, 48MP camera system, and USB-C speed connectivity.', BRAND: 'Apple', PRICE: 999.00, LIST_PRICE: 1099.00, DISCOUNT_PCT: 9, RATING: 4.8, REVIEW_COUNT: 12450, STOCK_QTY: 45, MAIN_IMAGE: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 1, CATEGORY_SLUG: 'electronics', IS_PRIME: 1, IS_DEAL: 1, BADGE_TEXT: 'Top Seller', CREATED_AT: new Date() },
    { _id: 2, TITLE: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones', DESCRIPTION: 'Industry-leading noise canceling with two processors and 8 microphones. Up to 30-hour battery life and ultra-comfortable lightweight design.', BRAND: 'Sony', PRICE: 348.00, LIST_PRICE: 399.99, DISCOUNT_PCT: 13, RATING: 4.7, REVIEW_COUNT: 8920, STOCK_QTY: 60, MAIN_IMAGE: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 1, CATEGORY_SLUG: 'electronics', IS_PRIME: 1, IS_DEAL: 1, BADGE_TEXT: 'Epic Savings', CREATED_AT: new Date() },
    { _id: 3, TITLE: 'Samsung 65-Inch Class OLED 4K S90C Series Smart TV', DESCRIPTION: 'Neural Quantum Processor with 4K Upscaling, Quantum HDR OLED, Motion Xcelerator Turbo+ 144Hz, Dolby Atmos sound.', BRAND: 'Samsung', PRICE: 1597.99, LIST_PRICE: 1899.99, DISCOUNT_PCT: 16, RATING: 4.6, REVIEW_COUNT: 3120, STOCK_QTY: 15, MAIN_IMAGE: 'https://images.unsplash.com/photo-1593784991095-87710daf9977?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 1, CATEGORY_SLUG: 'electronics', IS_PRIME: 1, IS_DEAL: 0, BADGE_TEXT: 'Prime Choice', CREATED_AT: new Date() },
    { _id: 4, TITLE: 'Apple Watch Series 9 GPS 45mm Midnight Aluminum', DESCRIPTION: 'Advanced health sensors, double tap gesture control, brighter Always-On Retina display, faster S9 SiP chip.', BRAND: 'Apple', PRICE: 389.00, LIST_PRICE: 429.00, DISCOUNT_PCT: 9, RATING: 4.7, REVIEW_COUNT: 5430, STOCK_QTY: 30, MAIN_IMAGE: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 1, CATEGORY_SLUG: 'electronics', IS_PRIME: 1, IS_DEAL: 0, BADGE_TEXT: 'Best Value', CREATED_AT: new Date() },
    { _id: 5, TITLE: 'Apple MacBook Air 15-inch M2 Chip (16GB RAM, 512GB SSD)', DESCRIPTION: 'Incredibly thin design, vibrant Liquid Retina Display, 1080p FaceTime HD camera, six-speaker sound system with Spatial Audio.', BRAND: 'Apple', PRICE: 1299.00, LIST_PRICE: 1499.00, DISCOUNT_PCT: 13, RATING: 4.9, REVIEW_COUNT: 6780, STOCK_QTY: 25, MAIN_IMAGE: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 2, CATEGORY_SLUG: 'computers', IS_PRIME: 1, IS_DEAL: 1, BADGE_TEXT: 'Limited Time Deal', CREATED_AT: new Date() },
    { _id: 6, TITLE: 'ASUS ROG Zephyrus G16 Gaming Laptop (Intel Core i9, RTX 4070)', DESCRIPTION: '16" 240Hz QHD+ Display, 32GB LPDDR5X RAM, 1TB PCIe 4.0 SSD, CNC Aluminum Chassis with customizable RGB lighting.', BRAND: 'ASUS', PRICE: 1899.99, LIST_PRICE: 2199.99, DISCOUNT_PCT: 14, RATING: 4.6, REVIEW_COUNT: 1450, STOCK_QTY: 20, MAIN_IMAGE: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 2, CATEGORY_SLUG: 'computers', IS_PRIME: 1, IS_DEAL: 0, BADGE_TEXT: 'Gaming Choice', CREATED_AT: new Date() },
    { _id: 7, TITLE: 'Logitech MX Master 3S Performance Wireless Mouse', DESCRIPTION: '8K DPI tracking on any surface including glass, Quiet Clicks, Ergonomic design, Electromagnetic MagSpeed scrolling.', BRAND: 'Logitech', PRICE: 99.99, LIST_PRICE: 109.99, DISCOUNT_PCT: 9, RATING: 4.8, REVIEW_COUNT: 23100, STOCK_QTY: 120, MAIN_IMAGE: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 2, CATEGORY_SLUG: 'computers', IS_PRIME: 1, IS_DEAL: 1, BADGE_TEXT: 'Overall Pick', CREATED_AT: new Date() },
    { _id: 8, TITLE: "DeLonghi Magnifica S Automatic Espresso & Cappuccino Machine", DESCRIPTION: 'Compact bean-to-cup machine with manual milk frother for customized latte and cappuccino drinks.', BRAND: 'DeLonghi', PRICE: 549.95, LIST_PRICE: 699.95, DISCOUNT_PCT: 21, RATING: 4.6, REVIEW_COUNT: 4320, STOCK_QTY: 18, MAIN_IMAGE: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 3, CATEGORY_SLUG: 'home-kitchen', IS_PRIME: 1, IS_DEAL: 1, BADGE_TEXT: 'Deal of the Day', CREATED_AT: new Date() },
    { _id: 9, TITLE: 'iRobot Roomba j7+ Self-Emptying Robot Vacuum', DESCRIPTION: 'Avoids pet waste and cords, 60-day self-empty base, Smart Mapping technology, ideal for homes with pets.', BRAND: 'iRobot', PRICE: 599.00, LIST_PRICE: 799.99, DISCOUNT_PCT: 25, RATING: 4.5, REVIEW_COUNT: 7890, STOCK_QTY: 35, MAIN_IMAGE: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 3, CATEGORY_SLUG: 'home-kitchen', IS_PRIME: 1, IS_DEAL: 0, BADGE_TEXT: 'Save $200', CREATED_AT: new Date() },
    { _id: 10, TITLE: 'Classic Leather Bomber Jacket for Men', DESCRIPTION: '100% Genuine lambskin leather, soft viscose inner lining, heavy-duty YKK zipper, classic ribbed collar and cuffs.', BRAND: 'UrbanStyle', PRICE: 149.50, LIST_PRICE: 220.00, DISCOUNT_PCT: 32, RATING: 4.5, REVIEW_COUNT: 1290, STOCK_QTY: 50, MAIN_IMAGE: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 4, CATEGORY_SLUG: 'fashion', IS_PRIME: 1, IS_DEAL: 1, BADGE_TEXT: 'Fashion Deal', CREATED_AT: new Date() },
    { _id: 11, TITLE: 'Ray-Ban Classic Aviator Sunglasses (Gold/G-15 Green)', DESCRIPTION: 'Timeless pilot metal frame, 100% UV protection lenses, durable metal frame with crystal clear glass lenses.', BRAND: 'Ray-Ban', PRICE: 163.00, LIST_PRICE: 180.00, DISCOUNT_PCT: 9, RATING: 4.7, REVIEW_COUNT: 15400, STOCK_QTY: 80, MAIN_IMAGE: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 4, CATEGORY_SLUG: 'fashion', IS_PRIME: 1, IS_DEAL: 0, BADGE_TEXT: 'Popular', CREATED_AT: new Date() },
    { _id: 12, TITLE: 'Dyson Airwrap Multi-Styler Complete Long', DESCRIPTION: 'Curl, shape, smooth and hide flyaways with no extreme heat. Designed for multiple hair types and lengths.', BRAND: 'Dyson', PRICE: 599.99, LIST_PRICE: 649.99, DISCOUNT_PCT: 8, RATING: 4.8, REVIEW_COUNT: 3890, STOCK_QTY: 22, MAIN_IMAGE: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 5, CATEGORY_SLUG: 'beauty', IS_PRIME: 1, IS_DEAL: 0, BADGE_TEXT: 'Luxury Beauty', CREATED_AT: new Date() },
    { _id: 13, TITLE: 'Atomic Habits: An Easy & Proven Way to Build Good Habits', DESCRIPTION: 'The definitive guide to breaking bad behaviors and adopting good ones in 4 simple steps by James Clear.', BRAND: 'Penguin Press', PRICE: 13.79, LIST_PRICE: 27.00, DISCOUNT_PCT: 49, RATING: 4.9, REVIEW_COUNT: 142000, STOCK_QTY: 200, MAIN_IMAGE: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 6, CATEGORY_SLUG: 'books', IS_PRIME: 1, IS_DEAL: 1, BADGE_TEXT: '#1 Best Seller', CREATED_AT: new Date() },
    { _id: 14, TITLE: 'LEGO Star Wars Millennium Falcon Building Set 75257', DESCRIPTION: 'Includes 7 minifigures: Finn, Chewbacca, Lando Calrissian, C-3PO, Boolio, plus R2-D2 and D-O LEGO droids.', BRAND: 'LEGO', PRICE: 135.99, LIST_PRICE: 169.99, DISCOUNT_PCT: 20, RATING: 4.9, REVIEW_COUNT: 11200, STOCK_QTY: 40, MAIN_IMAGE: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 7, CATEGORY_SLUG: 'toys', IS_PRIME: 1, IS_DEAL: 0, BADGE_TEXT: 'Collector Edition', CREATED_AT: new Date() },
    { _id: 15, TITLE: 'Adjustable Dumbbell Set (5 to 52.5 lbs Pair)', DESCRIPTION: 'Replaces 15 sets of weights. Easy-to-use selection dials for adjusting weight from 5 up to 52.5 lbs.', BRAND: 'Bowflex', PRICE: 379.00, LIST_PRICE: 429.00, DISCOUNT_PCT: 12, RATING: 4.7, REVIEW_COUNT: 18400, STOCK_QTY: 30, MAIN_IMAGE: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80', CATEGORY_ID: 8, CATEGORY_SLUG: 'sports', IS_PRIME: 1, IS_DEAL: 1, BADGE_TEXT: 'Top Fitness', CREATED_AT: new Date() }
  ];

  const reviews = [
    { _id: 1, PRODUCT_ID: 1, USER_NAME: 'Alex M.', RATING: 5, REVIEW_TITLE: 'Best iPhone ever made!', COMMENT_TEXT: 'The titanium feel is amazing and lightweight. Battery lasts all day and the camera in low light is unbelievable.', REVIEW_DATE: new Date() },
    { _id: 2, PRODUCT_ID: 1, USER_NAME: 'Sarah K.', RATING: 5, REVIEW_TITLE: 'Upgraded from 12 Pro', COMMENT_TEXT: 'Fast delivery via Prime! Action button setup is super convenient.', REVIEW_DATE: new Date() },
    { _id: 3, PRODUCT_ID: 2, USER_NAME: 'David R.', RATING: 5, REVIEW_TITLE: 'Silence on airplane flights', COMMENT_TEXT: "Active noise cancellation is unbeatable. Used it on a 12 hour flight and didn't hear a single baby crying.", REVIEW_DATE: new Date() },
    { _id: 4, PRODUCT_ID: 5, USER_NAME: 'Elena P.', RATING: 5, REVIEW_TITLE: 'Sleek, silent, and blazing fast!', COMMENT_TEXT: 'M2 chip handles 4K video editing without spinning up any fan noise. Super light weight for travel.', REVIEW_DATE: new Date() }
  ];

  const users = [
    { _id: 1, FULL_NAME: 'Amazon Admin', EMAIL: 'admin@amazon.com', PASSWORD_HASH: 'admin123', PHONE: '+1-800-555-0199', ADDRESS: '100 Amazon Way', CITY: 'Seattle', POSTAL_CODE: '98101', ROLE: 'ADMIN', CREATED_AT: new Date() },
    { _id: 2, FULL_NAME: 'John Doe', EMAIL: 'john@example.com', PASSWORD_HASH: 'user123', PHONE: '+1-555-0144', ADDRESS: '742 Evergreen Terrace', CITY: 'Springfield', POSTAL_CODE: '97477', ROLE: 'CUSTOMER', CREATED_AT: new Date() }
  ];

  async function upsertAll(collection, docs) {
    if (!docs.length) return;
    await db.collection(collection).bulkWrite(
      docs.map(doc => ({
        replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true }
      })),
      { ordered: false }
    );
  }

  await upsertAll('categories', categories);
  await upsertAll('products', products);
  await upsertAll('product_reviews', reviews);
  await upsertAll('users', users);

  // Indexes
  await db.collection('users').createIndex({ EMAIL: 1 }, { unique: true, background: true });
  await db.collection('categories').createIndex({ SLUG: 1 }, { unique: true, background: true });
  await db.collection('orders').createIndex({ ORDER_NUMBER: 1 }, { sparse: true, background: true });

  console.log(`✅ Auto-seed complete: ${categories.length} categories, ${products.length} products, ${users.length} users.`);
}

// Start Server & Initialize MongoDB Connection
async function startServer() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await initializePool();

    // Auto-seed if the database is empty
    await autoSeedIfEmpty();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 RetailShop E-Commerce App Live on http://localhost:${PORT}`);
      console.log(`📊 Connected to MongoDB Atlas`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('❌ Server failed to start due to MongoDB connection error:', err);
    process.exit(1);
  }
}

startServer();
