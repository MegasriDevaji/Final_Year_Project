const express = require('express');
const router = express.Router();
const { randomBytes } = require('crypto');
const { getDb } = require('../db');

const collection = name => getDb().collection(name);
const numberId = value => Number.parseInt(value, 10);
const boolFlag = value => value ? 1 : 0;
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function nextId(name) {
  const last = await collection(name).findOne({}, { sort: { _id: -1 }, projection: { _id: 1 } });
  return last ? Number(last._id) + 1 : 1;
}

async function categoryForProduct(product) {
  return product.CATEGORY_ID
    ? collection('categories').findOne({ _id: Number(product.CATEGORY_ID) })
    : null;
}

function publicUser(user) {
  if (!user) return user;
  const result = rebrandCopy({ ...user });
  delete result._id;
  delete result.PASSWORD_HASH;
  result.USER_ID = Number(user._id);
  if (result.EMAIL === 'admin@amazon.com') result.EMAIL = 'admin@retailshop.com';
  return result;
}

function rebrandCopy(value) {
  if (typeof value === 'string') {
    return value.replace(/\bamazon\b/gi, 'RetailShop').replace(/\bprime\b/gi, 'RetailShop');
  }
  if (Array.isArray(value)) return value.map(rebrandCopy);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rebrandCopy(item)]));
  }
  return value;
}

async function createSession(user) {
  const token = randomBytes(32).toString('hex');
  const sessions = collection('auth_sessions');
  await sessions.deleteMany({ EXPIRES_AT: { $lte: new Date() } });
  await sessions.insertOne({
    _id: token,
    USER_ID: Number(user._id),
    EXPIRES_AT: new Date(Date.now() + 7 * 86400000)
  });
  return token;
}

async function requireUser(req, res, next) {
  try {
    const authorization = req.get('Authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Sign in with a customer account to place an order.' });

    const session = await collection('auth_sessions').findOne({
      _id: token,
      EXPIRES_AT: { $gt: new Date() }
    });
    if (!session) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });

    const user = await collection('users').findOne({ _id: session.USER_ID });
    if (!user) return res.status(401).json({ error: 'Your account could not be verified. Please sign in again.' });
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function requireCustomer(req, res, next) {
  if (req.user.ROLE !== 'CUSTOMER') return res.status(403).json({ error: 'Only customer accounts can place orders.' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.ROLE !== 'ADMIN') return res.status(403).json({ error: 'Administrator access is required.' });
  next();
}

router.get('/health', async (req, res) => {
  try {
    const [products, categories, orders] = await Promise.all([
      collection('products').countDocuments(),
      collection('categories').countDocuments(),
      collection('orders').countDocuments()
    ]);
    res.json({
      status: 'ONLINE',
      service: 'RetailShop',
      metrics: { PRODUCTS_COUNT: products, CATEGORIES_COUNT: categories, ORDERS_COUNT: orders },
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await collection('categories').find({}).sort({ _id: 1 }).toArray();
    res.json(categories.map(category => ({
      CATEGORY_ID: Number(category._id),
      NAME: category.NAME,
      SLUG: category.SLUG,
      ICON: category.ICON,
      DESCRIPTION: category.DESCRIPTION
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { category, search, deal, delivery, minPrice, maxPrice, sort } = req.query;
    const filter = {};
    if (category) {
      const categoryNumber = numberId(category);
      filter.$or = [
        { CATEGORY_SLUG: category },
        ...(Number.isNaN(categoryNumber) ? [] : [{ CATEGORY_ID: categoryNumber }])
      ];
    }
    if (search) {
      const expression = new RegExp(escapeRegex(search), 'i');
      filter.$and = [{ $or: [{ TITLE: expression }, { BRAND: expression }, { DESCRIPTION: expression }] }];
    }
    if (deal === '1' || deal === 'true') filter.IS_DEAL = 1;
    if (delivery === '1' || delivery === 'true') filter.IS_PRIME = 1;
    if (minPrice) filter.PRICE = { ...(filter.PRICE || {}), $gte: Number.parseFloat(minPrice) };
    if (maxPrice) filter.PRICE = { ...(filter.PRICE || {}), $lte: Number.parseFloat(maxPrice) };

    const sortSpec = sort === 'price-low'
      ? { PRICE: 1 }
      : sort === 'price-high'
        ? { PRICE: -1 }
        : sort === 'rating'
          ? { RATING: -1 }
          : { _id: -1 };
    const products = await collection('products').find(filter).sort(sortSpec).toArray();
    const categories = await collection('categories').find({}).toArray();
    const categoryMap = new Map(categories.map(item => [Number(item._id), item.NAME]));
    res.json(products.map(product => ({
      ...rebrandCopy(product),
      PRODUCT_ID: Number(product._id),
      CATEGORY_NAME: categoryMap.get(Number(product.CATEGORY_ID)) || null
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await collection('products').findOne({ _id: numberId(req.params.id) });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const [category, images, reviews] = await Promise.all([
      categoryForProduct(product),
      collection('product_images').find({ PRODUCT_ID: Number(product._id) }).sort({ DISPLAY_ORDER: 1 }).toArray(),
      collection('product_reviews').find({ PRODUCT_ID: Number(product._id) }).sort({ REVIEW_DATE: -1 }).toArray()
    ]);
    res.json({
      ...rebrandCopy(product),
      PRODUCT_ID: Number(product._id),
      CATEGORY_NAME: category?.NAME || null,
      CATEGORY_SLUG: category?.SLUG || null,
      IMAGES: images.length ? images.map(image => image.IMAGE_URL) : [product.MAIN_IMAGE],
      REVIEWS: reviews.map(review => ({ ...rebrandCopy(review), REVIEW_ID: Number(review._id) }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products/:id/reviews', async (req, res) => {
  try {
    const productId = numberId(req.params.id);
    const { userName, rating, reviewTitle, commentText } = req.body;
    if (!userName || !rating || !commentText) {
      return res.status(400).json({ error: 'Name, rating, and review text are required.' });
    }
    await collection('product_reviews').insertOne({
      _id: await nextId('product_reviews'),
      PRODUCT_ID: productId,
      USER_NAME: userName,
      RATING: Number.parseFloat(rating),
      REVIEW_TITLE: reviewTitle || '',
      COMMENT_TEXT: commentText,
      REVIEW_DATE: new Date()
    });
    const summary = await collection('product_reviews').aggregate([
      { $match: { PRODUCT_ID: productId } },
      { $group: { _id: null, average: { $avg: '$RATING' }, count: { $sum: 1 } } }
    ]).next();
    await collection('products').updateOne({ _id: productId }, {
      $set: { RATING: Math.round((summary?.average || 0) * 10) / 10, REVIEW_COUNT: summary?.count || 0 }
    });
    res.json({ success: true, message: 'Review submitted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/checkout', requireUser, requireCustomer, async (req, res) => {
  try {
    const { customerName, email, shippingAddress, city, postalCode, phone, paymentMethod, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty.' });
    if (paymentMethod && !['Credit Card', 'Cash on Delivery'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Select a supported payment method.' });
    }
    const requestedItems = items.map(item => ({
      productId: numberId(item.PRODUCT_ID),
      quantity: Number(item.QUANTITY)
    }));
    if (requestedItems.some(item => !Number.isSafeInteger(item.productId) || item.productId <= 0 || !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) {
      return res.status(400).json({ error: 'Cart contains an invalid product or quantity.' });
    }

    const productIds = [...new Set(requestedItems.map(item => item.productId))];
    const products = await collection('products').find({ _id: { $in: productIds } }).toArray();
    const productMap = new Map(products.map(product => [Number(product._id), product]));
    const orderItems = [];
    let subtotal = 0;
    for (const item of requestedItems) {
      const product = productMap.get(item.productId);
      if (!product) return res.status(404).json({ error: 'A product in your cart is no longer available.' });
      if (Number(product.STOCK_QTY) < item.quantity) {
        return res.status(409).json({ error: `${product.TITLE} does not have enough stock.` });
      }
      const price = Number(product.PRICE);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'A product in your cart has an invalid price.' });
      subtotal += price * item.quantity;
      orderItems.push({
        PRODUCT_ID: item.productId,
        PRODUCT_TITLE: product.TITLE,
        PRICE: price,
        QUANTITY: item.quantity,
        IMAGE_URL: product.MAIN_IMAGE || ''
      });
    }

    const calculatedTotal = Number((subtotal * 1.08).toFixed(2));
    const orderId = await nextId('orders');
    const orderNumber = 'RS-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
    const reservedItems = [];
    try {
      for (const item of orderItems) {
        const reservation = await collection('products').updateOne(
          { _id: item.PRODUCT_ID, STOCK_QTY: { $gte: item.QUANTITY } },
          { $inc: { STOCK_QTY: -item.QUANTITY } }
        );
        if (reservation.modifiedCount !== 1) {
          const error = new Error(`${item.PRODUCT_TITLE} does not have enough stock.`);
          error.statusCode = 409;
          throw error;
        }
        reservedItems.push(item);
      }

      await collection('orders').insertOne({
        _id: orderId,
        ORDER_NUMBER: orderNumber,
        USER_ID: Number(req.user._id),
        CUSTOMER_NAME: customerName || req.user.FULL_NAME,
        EMAIL: email || req.user.EMAIL,
        SHIPPING_ADDRESS: shippingAddress || req.user.ADDRESS || '',
        CITY: city || req.user.CITY || '',
        POSTAL_CODE: postalCode || req.user.POSTAL_CODE || '',
        PHONE: phone || req.user.PHONE || '',
        TOTAL_AMOUNT: calculatedTotal,
        PAYMENT_METHOD: paymentMethod || 'Credit Card',
        PAYMENT_STATUS: 'Pending',
        ORDER_STATUS: 'Processing',
        ESTIMATED_DELIVERY: new Date(Date.now() + 2 * 86400000),
        ORDER_DATE: new Date(),
        ITEMS: orderItems
      });
    } catch (err) {
      await Promise.all(reservedItems.map(item => collection('products').updateOne(
        { _id: item.PRODUCT_ID },
        { $inc: { STOCK_QTY: item.QUANTITY } }
      )));
      if (err.statusCode === 409) return res.status(err.statusCode).json({ error: err.message });
      throw err;
    }
    res.json({ success: true, orderId, orderNumber, message: 'Order placed successfully in RetailShop.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', requireUser, async (req, res) => {
  try {
    const filter = req.user.ROLE === 'ADMIN' ? {} : { USER_ID: Number(req.user._id) };
    const orders = await collection('orders').find(filter).sort({ _id: -1 }).toArray();
    res.json(orders.map(order => ({ ...rebrandCopy(order), ORDER_ID: Number(order._id), ITEMS: order.ITEMS || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/products', requireUser, requireAdmin, async (req, res) => {
  try {
    const { title, description, brand, price, listPrice, categoryId, mainImage, stockQty, isPrime, isDeal, badgeText } = req.body;
    if (!title || !price || !categoryId) return res.status(400).json({ error: 'Title, Price, and Category are required.' });
    const parsedPrice = Number.parseFloat(price);
    const parsedListPrice = listPrice ? Number.parseFloat(listPrice) : parsedPrice;
    await collection('products').insertOne({
      _id: await nextId('products'), TITLE: title, DESCRIPTION: description || '', BRAND: brand || 'Generic',
      PRICE: parsedPrice, LIST_PRICE: parsedListPrice,
      DISCOUNT_PCT: parsedListPrice > parsedPrice ? Math.round(((parsedListPrice - parsedPrice) / parsedListPrice) * 100) : 0,
      RATING: 5, REVIEW_COUNT: 1, STOCK_QTY: stockQty ? Number.parseInt(stockQty, 10) : 50,
      MAIN_IMAGE: mainImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
      CATEGORY_ID: numberId(categoryId), IS_PRIME: boolFlag(isPrime), IS_DEAL: boolFlag(isDeal),
      BADGE_TEXT: badgeText || 'New Arrival', CREATED_AT: new Date()
    });
    res.json({ success: true, message: 'Product successfully added to RetailShop.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/products/:id', requireUser, requireAdmin, async (req, res) => {
  try {
    const productId = numberId(req.params.id);
    await collection('products').deleteOne({ _id: productId });
    await collection('product_images').deleteMany({ PRODUCT_ID: productId });
    await collection('product_reviews').deleteMany({ PRODUCT_ID: productId });
    res.json({ success: true, message: 'Product deleted from RetailShop.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/products/:id', requireUser, requireAdmin, async (req, res) => {
  try {
    const productId = numberId(req.params.id);
    const { title, description, brand, price, listPrice, categoryId, stockQty, isPrime, isDeal, badgeText } = req.body;
    const parsedPrice = Number.parseFloat(price);
    const parsedListPrice = listPrice ? Number.parseFloat(listPrice) : parsedPrice;
    await collection('products').updateOne({ _id: productId }, { $set: {
      TITLE: title, DESCRIPTION: description || '', BRAND: brand || 'Generic', PRICE: parsedPrice,
      LIST_PRICE: parsedListPrice,
      DISCOUNT_PCT: parsedListPrice > parsedPrice ? Math.round(((parsedListPrice - parsedPrice) / parsedListPrice) * 100) : 0,
      STOCK_QTY: Number.parseInt(stockQty || 50, 10), CATEGORY_ID: numberId(categoryId),
      IS_PRIME: boolFlag(isPrime), IS_DEAL: boolFlag(isDeal), BADGE_TEXT: badgeText || ''
    } });
    res.json({ success: true, message: 'Product updated successfully in RetailShop.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/admin/orders/:id/status', requireUser, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid order status value.' });
    const orderId = numberId(req.params.id);
    await collection('orders').updateOne({ _id: orderId }, { $set: { ORDER_STATUS: status } });
    res.json({ success: true, message: `Order #${orderId} status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, phone, address, city, postalCode } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (await collection('users').findOne({ EMAIL: normalizedEmail })) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    const user = {
      _id: await nextId('users'), FULL_NAME: fullName, EMAIL: normalizedEmail, PASSWORD_HASH: password,
      PHONE: phone || '', ADDRESS: address || '', CITY: city || '', POSTAL_CODE: postalCode || '',
      ROLE: 'CUSTOMER', CREATED_AT: new Date()
    };
    await collection('users').insertOne(user);
    const authToken = await createSession(user);
    res.json({ success: true, message: 'Account created successfully!', user: publicUser(user), authToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const authorization = req.get('Authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (token) await collection('auth_sessions').deleteOne({ _id: token });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const normalizedEmail = String(email).trim().toLowerCase();
    const lookupEmail = normalizedEmail === 'admin@retailshop.com' ? 'admin@amazon.com' : normalizedEmail;
    const user = await collection('users').findOne({ EMAIL: lookupEmail });
    if (!user || user.PASSWORD_HASH !== password) return res.status(401).json({ error: 'Invalid email or password.' });
    const authToken = await createSession(user);
    res.json({ success: true, message: 'Login successful!', user: publicUser(user), authToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
