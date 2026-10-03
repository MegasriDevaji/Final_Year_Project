const express = require('express');
const router = express.Router();
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
  const result = { ...user };
  delete result._id;
  delete result.PASSWORD_HASH;
  result.USER_ID = Number(user._id);
  return result;
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
      database: 'MongoDB Atlas',
      dbName: getDb().databaseName,
      openMode: 'READ WRITE',
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
    const { category, search, deal, prime, minPrice, maxPrice, sort } = req.query;
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
    if (prime === '1' || prime === 'true') filter.IS_PRIME = 1;
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
      ...product,
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
      ...product,
      PRODUCT_ID: Number(product._id),
      CATEGORY_NAME: category?.NAME || null,
      CATEGORY_SLUG: category?.SLUG || null,
      IMAGES: images.length ? images.map(image => image.IMAGE_URL) : [product.MAIN_IMAGE],
      REVIEWS: reviews.map(review => ({ ...review, REVIEW_ID: Number(review._id) }))
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

router.post('/checkout', async (req, res) => {
  try {
    const { customerName, email, shippingAddress, city, postalCode, phone, paymentMethod, items, totalAmount } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty.' });
    const orderId = await nextId('orders');
    const orderNumber = 'AMZ-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
    const orderItems = items.map(item => ({
      PRODUCT_ID: Number(item.PRODUCT_ID),
      PRODUCT_TITLE: item.TITLE,
      PRICE: Number(item.PRICE),
      QUANTITY: Number(item.QUANTITY),
      IMAGE_URL: item.MAIN_IMAGE
    }));
    await collection('orders').insertOne({
      _id: orderId,
      ORDER_NUMBER: orderNumber,
      USER_ID: 2,
      CUSTOMER_NAME: customerName || 'Valued Customer',
      EMAIL: email || '',
      SHIPPING_ADDRESS: shippingAddress || '123 Main Street',
      CITY: city || 'Seattle',
      POSTAL_CODE: postalCode || '98101',
      PHONE: phone || '+1-555-0199',
      TOTAL_AMOUNT: Number.parseFloat(totalAmount),
      PAYMENT_METHOD: paymentMethod || 'Credit Card',
      PAYMENT_STATUS: 'Paid',
      ORDER_STATUS: 'Processing',
      ESTIMATED_DELIVERY: new Date(Date.now() + 2 * 86400000),
      ORDER_DATE: new Date(),
      ITEMS: orderItems
    });
    await Promise.all(orderItems.map(item => collection('products').updateOne(
      { _id: item.PRODUCT_ID },
      { $inc: { STOCK_QTY: -item.QUANTITY } }
    )));
    res.json({ success: true, orderId, orderNumber, message: 'Order placed successfully! Recorded in MongoDB Atlas.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await collection('orders').find({}).sort({ _id: -1 }).toArray();
    res.json(orders.map(order => ({ ...order, ORDER_ID: Number(order._id), ITEMS: order.ITEMS || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/products', async (req, res) => {
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
    res.json({ success: true, message: 'Product successfully added to MongoDB Atlas!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/products/:id', async (req, res) => {
  try {
    const productId = numberId(req.params.id);
    await collection('products').deleteOne({ _id: productId });
    await collection('product_images').deleteMany({ PRODUCT_ID: productId });
    await collection('product_reviews').deleteMany({ PRODUCT_ID: productId });
    res.json({ success: true, message: 'Product deleted from MongoDB Atlas.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/products/:id', async (req, res) => {
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
    res.json({ success: true, message: 'Product updated successfully in MongoDB Atlas!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/admin/orders/:id/status', async (req, res) => {
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
    res.json({ success: true, message: 'Account created successfully!', user: publicUser(user) });
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
    res.json({ success: true, message: 'Login successful!', user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
