const oracledb = require('oracledb');
const { MongoClient } = require('mongodb');
require('dotenv').config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const oracleConfig = {
  user: process.env.ORACLE_DB_USER || process.env.DB_USER,
  password: process.env.ORACLE_DB_PASSWORD || process.env.DB_PASSWORD,
  connectString: process.env.ORACLE_DB_CONNECT_STRING || process.env.DB_CONNECT_STRING
};
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME || 'retailshop';

function required(name, value) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function dateValue(value) {
  return value ? new Date(value) : null;
}

async function upsertRows(collection, rows) {
  if (!rows.length) return;
  await collection.bulkWrite(rows.map(row => ({
    replaceOne: { filter: { _id: row._id }, replacement: row, upsert: true }
  })), { ordered: false });
}

async function read(connection, sql) {
  const result = await connection.execute(sql);
  return result.rows;
}

async function migrate() {
  required('MONGODB_URI', mongoUri);
  required('Oracle user (ORACLE_DB_USER or DB_USER)', oracleConfig.user);
  required('Oracle password (ORACLE_DB_PASSWORD or DB_PASSWORD)', oracleConfig.password);
  required('Oracle connect string (ORACLE_DB_CONNECT_STRING or DB_CONNECT_STRING)', oracleConfig.connectString);

  let oracleConnection;
  let mongoClient;
  try {
    console.log('Connecting to Oracle...');
    oracleConnection = await oracledb.getConnection(oracleConfig);
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const database = mongoClient.db(mongoDbName);

    const [categories, products, images, reviews, users, orders, orderItems] = await Promise.all([
      read(oracleConnection, 'SELECT CATEGORY_ID, NAME, SLUG, ICON, DESCRIPTION, PARENT_ID FROM CATEGORIES'),
      read(oracleConnection, 'SELECT PRODUCT_ID, TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT, CREATED_AT FROM PRODUCTS'),
      read(oracleConnection, 'SELECT IMAGE_ID, PRODUCT_ID, IMAGE_URL, DISPLAY_ORDER FROM PRODUCT_IMAGES'),
      read(oracleConnection, 'SELECT REVIEW_ID, PRODUCT_ID, USER_NAME, RATING, REVIEW_TITLE, COMMENT_TEXT, REVIEW_DATE FROM PRODUCT_REVIEWS'),
      read(oracleConnection, 'SELECT USER_ID, FULL_NAME, EMAIL, PASSWORD_HASH, PHONE, ADDRESS, CITY, POSTAL_CODE, ROLE, CREATED_AT FROM USERS'),
      read(oracleConnection, 'SELECT ORDER_ID, ORDER_NUMBER, USER_ID, CUSTOMER_NAME, SHIPPING_ADDRESS, CITY, POSTAL_CODE, PHONE, TOTAL_AMOUNT, PAYMENT_METHOD, PAYMENT_STATUS, ORDER_STATUS, ESTIMATED_DELIVERY, ORDER_DATE FROM ORDERS'),
      read(oracleConnection, 'SELECT ORDER_ITEM_ID, ORDER_ID, PRODUCT_ID, PRODUCT_TITLE, PRICE, QUANTITY, IMAGE_URL FROM ORDER_ITEMS')
    ]);

    const categoryById = new Map(categories.map(row => [Number(row.CATEGORY_ID), row]));
    const itemsByOrder = new Map();
    for (const item of orderItems) {
      const list = itemsByOrder.get(Number(item.ORDER_ID)) || [];
      list.push({
        PRODUCT_ID: item.PRODUCT_ID == null ? null : Number(item.PRODUCT_ID),
        PRODUCT_TITLE: item.PRODUCT_TITLE,
        PRICE: Number(item.PRICE),
        QUANTITY: Number(item.QUANTITY),
        IMAGE_URL: item.IMAGE_URL
      });
      itemsByOrder.set(Number(item.ORDER_ID), list);
    }

    const categoryRows = categories.map(row => ({
      _id: Number(row.CATEGORY_ID), NAME: row.NAME, SLUG: row.SLUG, ICON: row.ICON,
      DESCRIPTION: row.DESCRIPTION, PARENT_ID: row.PARENT_ID == null ? null : Number(row.PARENT_ID)
    }));
    const productRows = products.map(row => ({
      _id: Number(row.PRODUCT_ID), TITLE: row.TITLE, DESCRIPTION: row.DESCRIPTION, BRAND: row.BRAND,
      PRICE: Number(row.PRICE), LIST_PRICE: Number(row.LIST_PRICE), DISCOUNT_PCT: Number(row.DISCOUNT_PCT),
      RATING: Number(row.RATING), REVIEW_COUNT: Number(row.REVIEW_COUNT), STOCK_QTY: Number(row.STOCK_QTY),
      MAIN_IMAGE: row.MAIN_IMAGE, CATEGORY_ID: row.CATEGORY_ID == null ? null : Number(row.CATEGORY_ID),
      CATEGORY_SLUG: categoryById.get(Number(row.CATEGORY_ID))?.SLUG || null,
      IS_PRIME: Number(row.IS_PRIME), IS_DEAL: Number(row.IS_DEAL), BADGE_TEXT: row.BADGE_TEXT,
      CREATED_AT: dateValue(row.CREATED_AT)
    }));
    const imageRows = images.map(row => ({
      _id: Number(row.IMAGE_ID), PRODUCT_ID: Number(row.PRODUCT_ID), IMAGE_URL: row.IMAGE_URL,
      DISPLAY_ORDER: Number(row.DISPLAY_ORDER)
    }));
    const reviewRows = reviews.map(row => ({
      _id: Number(row.REVIEW_ID), PRODUCT_ID: Number(row.PRODUCT_ID), USER_NAME: row.USER_NAME,
      RATING: Number(row.RATING), REVIEW_TITLE: row.REVIEW_TITLE, COMMENT_TEXT: row.COMMENT_TEXT,
      REVIEW_DATE: dateValue(row.REVIEW_DATE)
    }));
    const userRows = users.map(row => ({
      _id: Number(row.USER_ID), FULL_NAME: row.FULL_NAME, EMAIL: String(row.EMAIL).toLowerCase(),
      PASSWORD_HASH: row.PASSWORD_HASH, PHONE: row.PHONE, ADDRESS: row.ADDRESS, CITY: row.CITY,
      POSTAL_CODE: row.POSTAL_CODE, ROLE: row.ROLE, CREATED_AT: dateValue(row.CREATED_AT)
    }));
    const orderRows = orders.map(row => ({
      _id: Number(row.ORDER_ID), ORDER_NUMBER: row.ORDER_NUMBER, USER_ID: row.USER_ID == null ? null : Number(row.USER_ID),
      CUSTOMER_NAME: row.CUSTOMER_NAME, SHIPPING_ADDRESS: row.SHIPPING_ADDRESS, CITY: row.CITY,
      POSTAL_CODE: row.POSTAL_CODE, PHONE: row.PHONE, TOTAL_AMOUNT: Number(row.TOTAL_AMOUNT),
      PAYMENT_METHOD: row.PAYMENT_METHOD, PAYMENT_STATUS: row.PAYMENT_STATUS, ORDER_STATUS: row.ORDER_STATUS,
      ESTIMATED_DELIVERY: dateValue(row.ESTIMATED_DELIVERY), ORDER_DATE: dateValue(row.ORDER_DATE),
      ITEMS: itemsByOrder.get(Number(row.ORDER_ID)) || []
    }));

    const names = ['categories', 'products', 'product_images', 'product_reviews', 'users', 'orders'];
    if (process.env.MIGRATION_REPLACE === 'true') {
      await Promise.all(names.map(name => database.collection(name).deleteMany({})));
      console.log('Cleared existing MongoDB collections because MIGRATION_REPLACE=true.');
    }
    await upsertRows(database.collection('categories'), categoryRows);
    await upsertRows(database.collection('products'), productRows);
    await upsertRows(database.collection('product_images'), imageRows);
    await upsertRows(database.collection('product_reviews'), reviewRows);
    await upsertRows(database.collection('users'), userRows);
    await upsertRows(database.collection('orders'), orderRows);
    await database.collection('users').createIndex({ EMAIL: 1 }, { unique: true });
    await database.collection('categories').createIndex({ SLUG: 1 }, { unique: true });
    await database.collection('orders').createIndex({ ORDER_NUMBER: 1 }, { unique: true });

    console.log(`Migration complete: ${categoryRows.length} categories, ${productRows.length} products, ${reviewRows.length} reviews, ${userRows.length} users, ${orderRows.length} orders.`);
  } finally {
    if (oracleConnection) await oracleConnection.close();
    if (mongoClient) await mongoClient.close();
  }
}

migrate().catch(error => {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
});
