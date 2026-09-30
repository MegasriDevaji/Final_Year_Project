const express = require('express');
const router = express.Router();
const { executeQuery } = require('../db');

// Health Check & Oracle DB Metrics
router.get('/health', async (req, res) => {
  try {
    const dbResult = await executeQuery('SELECT name, open_mode, database_role FROM v$database');
    const dbInfo = dbResult.rows[0] || {};
    
    const countResult = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM PRODUCTS) AS PRODUCTS_COUNT,
        (SELECT COUNT(*) FROM CATEGORIES) AS CATEGORIES_COUNT,
        (SELECT COUNT(*) FROM ORDERS) AS ORDERS_COUNT
      FROM DUAL
    `);

    res.json({
      status: 'ONLINE',
      database: 'Oracle Database 23c Free Edition',
      dbName: dbInfo.NAME || 'FREE',
      openMode: dbInfo.OPEN_MODE || 'READ WRITE',
      metrics: countResult.rows[0],
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// GET All Categories
router.get('/categories', async (req, res) => {
  try {
    const result = await executeQuery('SELECT CATEGORY_ID, NAME, SLUG, ICON, DESCRIPTION FROM CATEGORIES ORDER BY CATEGORY_ID ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Products (with search, category filter, deals filter, sorting)
router.get('/products', async (req, res) => {
  try {
    const { category, search, deal, prime, minPrice, maxPrice, sort } = req.query;
    let sql = `
      SELECT p.*, c.NAME as CATEGORY_NAME 
      FROM PRODUCTS p 
      LEFT JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID 
      WHERE 1=1
    `;
    const binds = {};

    if (category) {
      sql += ' AND (c.SLUG = :category OR c.CATEGORY_ID = :catId)';
      binds.category = category;
      binds.catId = isNaN(category) ? -1 : parseInt(category);
    }

    if (search) {
      sql += ' AND (LOWER(p.TITLE) LIKE :search OR LOWER(p.BRAND) LIKE :search OR LOWER(p.DESCRIPTION) LIKE :search)';
      binds.search = `%${search.toLowerCase()}%`;
    }

    if (deal === '1' || deal === 'true') {
      sql += ' AND p.IS_DEAL = 1';
    }

    if (prime === '1' || prime === 'true') {
      sql += ' AND p.IS_PRIME = 1';
    }

    if (minPrice) {
      sql += ' AND p.PRICE >= :minPrice';
      binds.minPrice = parseFloat(minPrice);
    }

    if (maxPrice) {
      sql += ' AND p.PRICE <= :maxPrice';
      binds.maxPrice = parseFloat(maxPrice);
    }

    if (sort === 'price-low') {
      sql += ' ORDER BY p.PRICE ASC';
    } else if (sort === 'price-high') {
      sql += ' ORDER BY p.PRICE DESC';
    } else if (sort === 'rating') {
      sql += ' ORDER BY p.RATING DESC';
    } else {
      sql += ' ORDER BY p.PRODUCT_ID DESC';
    }

    const result = await executeQuery(sql, binds);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Single Product Details + Gallery + Reviews
router.get('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const productResult = await executeQuery(
      `SELECT p.*, c.NAME as CATEGORY_NAME, c.SLUG as CATEGORY_SLUG 
       FROM PRODUCTS p 
       LEFT JOIN CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID 
       WHERE p.PRODUCT_ID = :id`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const imagesResult = await executeQuery(
      'SELECT IMAGE_URL FROM PRODUCT_IMAGES WHERE PRODUCT_ID = :id ORDER BY DISPLAY_ORDER ASC',
      [productId]
    );

    const reviewsResult = await executeQuery(
      'SELECT REVIEW_ID, USER_NAME, RATING, REVIEW_TITLE, COMMENT_TEXT, REVIEW_DATE FROM PRODUCT_REVIEWS WHERE PRODUCT_ID = :id ORDER BY REVIEW_DATE DESC',
      [productId]
    );

    const product = productResult.rows[0];
    product.IMAGES = imagesResult.rows.map(img => img.IMAGE_URL);
    if (!product.IMAGES.length) {
      product.IMAGES = [product.MAIN_IMAGE];
    }
    product.REVIEWS = reviewsResult.rows;

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Product Review
router.post('/products/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id;
    const { userName, rating, reviewTitle, commentText } = req.body;

    if (!userName || !rating || !commentText) {
      return res.status(400).json({ error: 'Name, rating, and review text are required.' });
    }

    await executeQuery(
      `INSERT INTO PRODUCT_REVIEWS (PRODUCT_ID, USER_NAME, RATING, REVIEW_TITLE, COMMENT_TEXT) 
       VALUES (:productId, :userName, :rating, :reviewTitle, :commentText)`,
      {
        productId: parseInt(productId),
        userName,
        rating: parseFloat(rating),
        reviewTitle: reviewTitle || '',
        commentText
      }
    );

    // Recalculate average rating & count
    await executeQuery(
      `UPDATE PRODUCTS 
       SET RATING = (SELECT ROUND(AVG(RATING), 1) FROM PRODUCT_REVIEWS WHERE PRODUCT_ID = :id),
           REVIEW_COUNT = (SELECT COUNT(*) FROM PRODUCT_REVIEWS WHERE PRODUCT_ID = :id)
       WHERE PRODUCT_ID = :id`,
      [parseInt(productId)]
    );

    res.json({ success: true, message: 'Review submitted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Checkout & Create Order in Oracle DB
router.post('/checkout', async (req, res) => {
  try {
    const { customerName, email, shippingAddress, city, postalCode, phone, paymentMethod, items, totalAmount } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    const orderNumber = 'AMZ-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);

    // Insert Order Record
    const orderResult = await executeQuery(
      `INSERT INTO ORDERS (
        ORDER_NUMBER, USER_ID, CUSTOMER_NAME, SHIPPING_ADDRESS, CITY, POSTAL_CODE, PHONE, 
        TOTAL_AMOUNT, PAYMENT_METHOD, PAYMENT_STATUS, ORDER_STATUS, ESTIMATED_DELIVERY
      ) VALUES (
        :orderNumber, 2, :customerName, :shippingAddress, :city, :postalCode, :phone, 
        :totalAmount, :paymentMethod, 'Paid', 'Processing', SYSDATE + 2
      ) RETURNING ORDER_ID INTO :orderId`,
      {
        orderNumber,
        customerName: customerName || 'Valued Customer',
        shippingAddress: shippingAddress || '123 Main Street',
        city: city || 'Seattle',
        postalCode: postalCode || '98101',
        phone: phone || '+1-555-0199',
        totalAmount: parseFloat(totalAmount),
        paymentMethod: paymentMethod || 'Credit Card',
        orderId: { type: require('../db').oracledb.NUMBER, dir: require('../db').oracledb.BIND_OUT }
      }
    );

    const orderId = orderResult.outBinds.orderId[0];

    // Insert Order Items & Update Stock
    for (const item of items) {
      await executeQuery(
        `INSERT INTO ORDER_ITEMS (ORDER_ID, PRODUCT_ID, PRODUCT_TITLE, PRICE, QUANTITY, IMAGE_URL)
         VALUES (:orderId, :productId, :title, :price, :qty, :img)`,
        {
          orderId,
          productId: item.PRODUCT_ID,
          title: item.TITLE,
          price: item.PRICE,
          qty: item.QUANTITY,
          img: item.MAIN_IMAGE
        }
      );

      // Decrement stock
      await executeQuery(
        `UPDATE PRODUCTS SET STOCK_QTY = GREATEST(0, STOCK_QTY - :qty) WHERE PRODUCT_ID = :productId`,
        { qty: item.QUANTITY, productId: item.PRODUCT_ID }
      );
    }

    res.json({
      success: true,
      orderId,
      orderNumber,
      message: 'Order placed successfully! Recorded in Oracle DB 23c.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET All Orders or User Orders
router.get('/orders', async (req, res) => {
  try {
    const ordersResult = await executeQuery(
      `SELECT ORDER_ID, ORDER_NUMBER, CUSTOMER_NAME, SHIPPING_ADDRESS, CITY, TOTAL_AMOUNT, PAYMENT_METHOD, ORDER_STATUS, TO_CHAR(ORDER_DATE, 'YYYY-MM-DD HH24:MI:SS') AS ORDER_DATE 
       FROM ORDERS 
       ORDER BY ORDER_ID DESC`
    );

    const orders = ordersResult.rows;

    for (const order of orders) {
      const itemsResult = await executeQuery(
        `SELECT PRODUCT_TITLE, PRICE, QUANTITY, IMAGE_URL FROM ORDER_ITEMS WHERE ORDER_ID = :id`,
        [order.ORDER_ID]
      );
      order.ITEMS = itemsResult.rows;
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Add New Product to Oracle DB
router.post('/admin/products', async (req, res) => {
  try {
    const { title, description, brand, price, listPrice, categoryId, mainImage, stockQty, isPrime, isDeal, badgeText } = req.body;

    if (!title || !price || !categoryId) {
      return res.status(400).json({ error: 'Title, Price, and Category are required.' });
    }

    const discountPct = listPrice && listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0;

    await executeQuery(
      `INSERT INTO PRODUCTS (
        TITLE, DESCRIPTION, BRAND, PRICE, LIST_PRICE, DISCOUNT_PCT, RATING, REVIEW_COUNT, STOCK_QTY, MAIN_IMAGE, CATEGORY_ID, IS_PRIME, IS_DEAL, BADGE_TEXT
      ) VALUES (
        :title, :description, :brand, :price, :listPrice, :discountPct, 5.0, 1, :stockQty, :mainImage, :categoryId, :isPrime, :isDeal, :badgeText
      )`,
      {
        title,
        description: description || '',
        brand: brand || 'Generic',
        price: parseFloat(price),
        listPrice: listPrice ? parseFloat(listPrice) : parseFloat(price),
        discountPct,
        stockQty: stockQty ? parseInt(stockQty) : 50,
        mainImage: mainImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        categoryId: parseInt(categoryId),
        isPrime: isPrime ? 1 : 0,
        isDeal: isDeal ? 1 : 0,
        badgeText: badgeText || 'New Arrival'
      }
    );

    res.json({ success: true, message: 'Product successfully added to Oracle DB!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Delete Product
router.delete('/admin/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    await executeQuery('DELETE FROM PRODUCTS WHERE PRODUCT_ID = :id', [parseInt(productId)]);
    res.json({ success: true, message: 'Product deleted from Oracle DB.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Update Product
router.put('/admin/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const { title, description, brand, price, listPrice, categoryId, stockQty, isPrime, isDeal, badgeText } = req.body;

    const discountPct = listPrice && listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0;

    await executeQuery(
      `UPDATE PRODUCTS 
       SET TITLE = :title, DESCRIPTION = :description, BRAND = :brand, PRICE = :price, 
           LIST_PRICE = :listPrice, DISCOUNT_PCT = :discountPct, STOCK_QTY = :stockQty, 
           CATEGORY_ID = :categoryId, IS_PRIME = :isPrime, IS_DEAL = :isDeal, BADGE_TEXT = :badgeText
       WHERE PRODUCT_ID = :id`,
      {
        id: parseInt(productId),
        title,
        description: description || '',
        brand: brand || 'Generic',
        price: parseFloat(price),
        listPrice: listPrice ? parseFloat(listPrice) : parseFloat(price),
        discountPct,
        stockQty: parseInt(stockQty || 50),
        categoryId: parseInt(categoryId),
        isPrime: isPrime ? 1 : 0,
        isDeal: isDeal ? 1 : 0,
        badgeText: badgeText || ''
      }
    );

    res.json({ success: true, message: 'Product updated successfully in Oracle DB!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: Update Order Status
router.patch('/admin/orders/:id/status', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status value.' });
    }

    await executeQuery(
      `UPDATE ORDERS SET ORDER_STATUS = :status WHERE ORDER_ID = :id`,
      { status, id: parseInt(orderId) }
    );

    res.json({ success: true, message: `Order #${orderId} status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// USER AUTH: Register
router.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, phone, address, city, postalCode } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check if user already exists
    const checkUser = await executeQuery('SELECT USER_ID FROM USERS WHERE LOWER(EMAIL) = LOWER(:email)', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    await executeQuery(
      `INSERT INTO USERS (FULL_NAME, EMAIL, PASSWORD_HASH, PHONE, ADDRESS, CITY, POSTAL_CODE, ROLE)
       VALUES (:fullName, :email, :password, :phone, :address, :city, :postalCode, 'CUSTOMER')`,
      {
        fullName,
        email,
        password, // stored for demo
        phone: phone || '',
        address: address || '',
        city: city || '',
        postalCode: postalCode || ''
      }
    );

    const newUserResult = await executeQuery('SELECT USER_ID, FULL_NAME, EMAIL, ROLE, PHONE, ADDRESS, CITY, POSTAL_CODE FROM USERS WHERE LOWER(EMAIL) = LOWER(:email)', [email]);
    const user = newUserResult.rows[0];

    res.json({
      success: true,
      message: 'Account created successfully!',
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// USER AUTH: Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim();
    const lookupEmail = normalizedEmail.toLowerCase() === 'admin@retailshop.com'
      ? 'admin@amazon.com'
      : normalizedEmail;

    const result = await executeQuery(
      `SELECT USER_ID, FULL_NAME, EMAIL, ROLE, PHONE, ADDRESS, CITY, POSTAL_CODE, PASSWORD_HASH 
       FROM USERS WHERE LOWER(EMAIL) = LOWER(:email)`,
      [lookupEmail]
    );

    if (result.rows.length === 0 || result.rows[0].PASSWORD_HASH !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    delete user.PASSWORD_HASH;

    res.json({
      success: true,
      message: 'Login successful!',
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

