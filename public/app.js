/**
 * RetailShop E-Commerce Client Application
 */


const API_BASE = '/api';

class RetailShopApp {
  constructor() {
    this.products = [];
    this.categories = [];
    this.cart = this.loadCartFromStorage();
    this.wishlist = this.loadWishlistFromStorage();
    this.currentUser = this.loadUserFromStorage();
    this.currentCategory = '';
    this.searchQuery = '';
    this.dealFilter = false;
    this.primeFilter = false;

    this.init();
  }

  async init() {
    console.log('🚀 Initializing RetailShop Frontend...');
    this.updateCartBadge();
    this.updateWishlistBadge();
    this.updateUserNavUI();
    await this.checkDatabaseStatus();
    await this.loadCategories();
    await this.loadProducts();
    
    // Close autosuggest when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-search')) {
        const popup = document.getElementById('searchAutosuggestPopup');
        if (popup) popup.classList.remove('open');
      }
    });
  }

  /* ================= 1. DATABASE HEALTH & METRICS ================= */
  async checkDatabaseStatus() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      
      const pillText = document.getElementById('dbStateText');
      const pill = document.getElementById('dbStatusPill');

      if (data.status === 'ONLINE') {
        if (pillText) pillText.textContent = `${data.database} (${data.openMode})`;
        if (pill) pill.style.background = 'rgba(0, 230, 118, 0.18)';
        this.metrics = data.metrics || {};
        this.updateAdminMetricsUI();
      } else {
        if (pillText) pillText.textContent = 'Service Unavailable';
        if (pill) pill.style.background = 'rgba(255, 23, 68, 0.18)';
      }
    } catch (err) {
      console.error('Database connection error:', err);
      const pillText = document.getElementById('dbStateText');
      if (pillText) pillText.textContent = 'Disconnected';
    }
  }

  updateAdminMetricsUI() {
    if (this.metrics) {
      const mP = document.getElementById('metricProducts');
      const mC = document.getElementById('metricCategories');
      const mO = document.getElementById('metricOrders');
      if (mP) mP.textContent = this.metrics.PRODUCTS_COUNT || 0;
      if (mC) mC.textContent = this.metrics.CATEGORIES_COUNT || 0;
      if (mO) mO.textContent = this.metrics.ORDERS_COUNT || 0;
    }
  }

  /* ================= 2. CATEGORIES & NAV ================= */
  async loadCategories() {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      this.categories = await res.json();

      // Render search category dropdown
      const searchDropdown = document.getElementById('searchCategorySelect');
      const adminCategoryDropdown = document.getElementById('admCategory');
      const sideCatList = document.getElementById('sideCategoriesList');
      const categoryChips = document.getElementById('categoryChips');

      if (searchDropdown) {
        searchDropdown.innerHTML = `<option value="">All Categories</option>` +
          this.categories.map(c => `<option value="${c.SLUG}">${c.NAME}</option>`).join('');
      }

      if (adminCategoryDropdown) {
        adminCategoryDropdown.innerHTML = this.categories.map(c => 
          `<option value="${c.CATEGORY_ID}">${c.NAME}</option>`
        ).join('');
      }

      if (sideCatList) {
        sideCatList.innerHTML = this.categories.map(c => 
          `<a href="#" class="side-link" onclick="app.filterByCategory('${c.SLUG}'); app.toggleSideMenu(); return false;">
            <i class="fa-solid ${c.ICON || 'fa-tag'}"></i> ${c.NAME}
          </a>`
        ).join('');
      }

      if (categoryChips) {
        categoryChips.innerHTML = `
          <button class="chip-btn ${this.currentCategory === '' ? 'active' : ''}" onclick="app.filterByCategory('')">All Departments</button>
        ` + this.categories.map(c => 
          `<button class="chip-btn ${this.currentCategory === c.SLUG ? 'active' : ''}" onclick="app.filterByCategory('${c.SLUG}')">${c.NAME}</button>`
        ).join('');
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  /* ================= 3. PRODUCTS & FILTERING ================= */
  async loadProducts() {
    const grid = document.getElementById('productGrid');
    const countEl = document.getElementById('resultsCount');
    
    if (grid) {
      grid.innerHTML = `
        <div class="loading-spinner">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          <p>Loading products...</p>
        </div>
      `;
    }

    try {
      const queryParams = new URLSearchParams();
      if (this.currentCategory) queryParams.append('category', this.currentCategory);
      if (this.searchQuery) queryParams.append('search', this.searchQuery);
      if (this.dealFilter) queryParams.append('deal', '1');
      if (this.primeFilter) queryParams.append('prime', '1');

      const sortVal = document.getElementById('sortSelect')?.value;
      if (sortVal) queryParams.append('sort', sortVal);

      const res = await fetch(`${API_BASE}/products?${queryParams.toString()}`);
      this.products = await res.json();

      if (countEl) {
        countEl.textContent = `1-${this.products.length} of ${this.products.length} results`;
      }

      this.renderProductsGrid();
    } catch (err) {
      console.error('Failed to load products:', err);
      if (grid) {
        grid.innerHTML = `<p style="grid-column: 1/-1; color: red;">Failed to load products. Please try again.</p>`;
      }
    }
  }

  renderProductsGrid() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (this.products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <i class="fa-solid fa-box-open" style="font-size: 3rem; color: #ccc; margin-bottom: 12px;"></i>
          <h3>No matching products found</h3>
          <p style="color: #666; margin-top: 6px;">Try adjusting your search filters or clearing department selections.</p>
          <button class="chip-btn" style="margin-top: 16px;" onclick="app.resetFilters()">Clear Filters</button>
        </div>
      `;
      return;
    }

    const isAdmin = this.currentUser && this.currentUser.ROLE === 'ADMIN';

    grid.innerHTML = this.products.map(p => {
      const discount = p.LIST_PRICE && p.LIST_PRICE > p.PRICE 
        ? Math.round(((p.LIST_PRICE - p.PRICE) / p.LIST_PRICE) * 100)
        : p.DISCOUNT_PCT;

      const starsHtml = this.generateStarsHtml(p.RATING || 4.5);
      const isWishlisted = this.wishlist.some(item => item.PRODUCT_ID === p.PRODUCT_ID);

      return `
        <article class="product-card">
          <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); app.toggleWishlist(${p.PRODUCT_ID})" title="Save to Wishlist">
            <i class="fa-${isWishlisted ? 'solid' : 'regular'} fa-heart"></i>
          </button>

          ${p.BADGE_TEXT ? `<span class="badge-tag">${p.BADGE_TEXT}</span>` : (p.IS_DEAL ? `<span class="badge-tag">Deal</span>` : '')}

          <div class="product-img-wrapper" onclick="app.openProductModal(${p.PRODUCT_ID})">
            <img src="${p.MAIN_IMAGE}" alt="${p.TITLE}" loading="lazy">
          </div>

          <span class="product-brand">${p.BRAND || 'Brand'}</span>
          <a href="#" class="product-title-link" onclick="app.openProductModal(${p.PRODUCT_ID}); return false;">${p.TITLE}</a>

          <div class="rating-row">
            <div class="stars">${starsHtml}</div>
            <span class="review-cnt">(${p.REVIEW_COUNT || 0})</span>
          </div>

          <div class="price-row">
            ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
            <span class="current-price">$${p.PRICE.toFixed(2)}</span>
            ${p.LIST_PRICE ? `<span class="list-price">$${p.LIST_PRICE.toFixed(2)}</span>` : ''}
          </div>

          ${p.IS_PRIME ? `
            <div class="prime-row">
              <i class="fa-solid fa-check text-prime"></i>
              <span><strong>prime</strong> FREE One-Day</span>
            </div>
          ` : ''}

          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button class="add-to-cart-btn" style="flex: 1;" onclick="app.addToCart(${p.PRODUCT_ID})">
              <i class="fa-solid fa-cart-shopping"></i> Add to Cart
            </button>
            ${isAdmin ? `
              <button class="chip-btn" style="padding: 8px 12px; background: #007185; color: #fff;" onclick="app.openEditProductModal(${p.PRODUCT_ID})" title="Edit Product">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="chip-btn" style="padding: 8px 12px; background: #c53030; color: #fff;" onclick="app.deleteProduct(${p.PRODUCT_ID})" title="Delete Product">
                <i class="fa-solid fa-trash"></i>
              </button>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  generateStarsHtml(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < fullStars; i++) html += '<i class="fa-solid fa-star"></i>';
    if (hasHalf) html += '<i class="fa-solid fa-star-half-stroke"></i>';
    const empty = 5 - Math.ceil(rating);
    for (let i = 0; i < empty; i++) html += '<i class="fa-regular fa-star"></i>';
    return html;
  }

  /* ================= 4. SEARCH & FILTER HANDLERS ================= */
  filterByCategory(slug) {
    this.currentCategory = slug;
    const searchDropdown = document.getElementById('searchCategorySelect');
    if (searchDropdown) searchDropdown.value = slug;
    
    // Update chip styling
    const categoryChips = document.getElementById('categoryChips');
    if (categoryChips) {
      categoryChips.querySelectorAll('.chip-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(slug) || (slug === '' && btn.textContent === 'All Departments'));
      });
    }

    const heading = document.getElementById('catalogHeading');
    if (heading) {
      const matched = this.categories.find(c => c.SLUG === slug);
      heading.textContent = matched ? matched.NAME : 'Featured Products';
    }

    this.loadProducts();
  }

  filterBySpecial(type) {
    if (type === 'deals') {
      this.dealFilter = true;
      const t = document.getElementById('dealsOnlyToggle');
      if (t) t.checked = true;
    } else if (type === 'prime') {
      this.primeFilter = true;
      const t = document.getElementById('primeOnlyToggle');
      if (t) t.checked = true;
    } else {
      this.resetFilters();
      return;
    }
    this.loadProducts();
  }

  handleSearchInput(event) {
    if (event.key === 'Enter') {
      const popup = document.getElementById('searchAutosuggestPopup');
      if (popup) popup.classList.remove('open');
      this.handleSearch();
      return;
    }

    const input = document.getElementById('searchInput');
    const term = input ? input.value.trim().toLowerCase() : '';

    const popup = document.getElementById('searchAutosuggestPopup');
    if (!popup) return;

    if (term.length < 2) {
      popup.classList.remove('open');
      return;
    }

    const matches = this.products.filter(p => 
      p.TITLE.toLowerCase().includes(term) || 
      (p.BRAND && p.BRAND.toLowerCase().includes(term)) ||
      (p.CATEGORY_NAME && p.CATEGORY_NAME.toLowerCase().includes(term))
    ).slice(0, 6);

    if (matches.length === 0) {
      popup.innerHTML = `<div style="padding: 12px; font-size: 0.85rem; color: #666;">No products matching "${term}"</div>`;
    } else {
      popup.innerHTML = matches.map(p => `
        <div class="suggest-item" onclick="app.openProductModal(${p.PRODUCT_ID}); document.getElementById('searchAutosuggestPopup').classList.remove('open');">
          <img src="${p.MAIN_IMAGE}" class="suggest-img" alt="${p.TITLE}">
          <div class="suggest-info">
            <span class="suggest-title">${p.TITLE.substring(0, 45)}...</span>
            <span class="suggest-category">${p.BRAND || 'Brand'} • ${p.CATEGORY_NAME || 'Category'}</span>
          </div>
          <span class="suggest-price">$${p.PRICE.toFixed(2)}</span>
        </div>
      `).join('');
    }

    popup.classList.add('open');
  }

  handleSearch() {
    const input = document.getElementById('searchInput');
    this.searchQuery = input ? input.value.trim() : '';
    const popup = document.getElementById('searchAutosuggestPopup');
    if (popup) popup.classList.remove('open');
    this.loadProducts();
  }

  applyFilters() {
    this.primeFilter = document.getElementById('primeOnlyToggle')?.checked || false;
    this.dealFilter = document.getElementById('dealsOnlyToggle')?.checked || false;
    this.loadProducts();
  }

  resetFilters() {
    this.currentCategory = '';
    this.searchQuery = '';
    this.dealFilter = false;
    this.primeFilter = false;
    
    const input = document.getElementById('searchInput');
    if (input) input.value = '';

    const pT = document.getElementById('primeOnlyToggle');
    if (pT) pT.checked = false;

    const dT = document.getElementById('dealsOnlyToggle');
    if (dT) dT.checked = false;

    this.filterByCategory('');
  }

  /* ================= 5. PRODUCT DETAIL MODAL ================= */
  async openProductModal(productId) {
    const overlay = document.getElementById('productDetailModalOverlay');
    const content = document.getElementById('productDetailContent');
    
    if (content) {
      content.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading details...</div>`;
    }
    if (overlay) overlay.classList.add('open');

    try {
      const res = await fetch(`${API_BASE}/products/${productId}`);
      const product = await res.json();

      const stars = this.generateStarsHtml(product.RATING || 4.5);
      const discount = product.LIST_PRICE && product.LIST_PRICE > product.PRICE 
        ? Math.round(((product.LIST_PRICE - product.PRICE) / product.LIST_PRICE) * 100) 
        : 0;

      content.innerHTML = `
        <div class="detail-img-box">
          <img id="detailMainImg" src="${product.MAIN_IMAGE}" alt="${product.TITLE}">
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            ${(product.IMAGES || [product.MAIN_IMAGE]).map(img => 
              `<img src="${img}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 1px solid #ccc;" onclick="document.getElementById('detailMainImg').src='${img}'">`
            ).join('')}
          </div>
        </div>

        <div class="detail-info">
          <a href="#" class="detail-brand" onclick="app.filterByCategory('${product.CATEGORY_SLUG}')">Brand: ${product.BRAND || 'RetailShop Choice'}</a>
          <h2>${product.TITLE}</h2>
          
          <div class="rating-row">
            <div class="stars">${stars}</div>
            <span class="review-cnt">${product.RATING} (${product.REVIEW_COUNT} customer ratings)</span>
          </div>

          <div class="detail-price-box">
            <div class="price-row" style="margin-bottom: 4px;">
              ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
              <span class="current-price" style="font-size: 1.8rem;">$${product.PRICE.toFixed(2)}</span>
            </div>
            ${product.LIST_PRICE ? `<div style="font-size: 0.85rem; color: #666;">List Price: <span style="text-decoration: line-through;">$${product.LIST_PRICE.toFixed(2)}</span></div>` : ''}
            <div class="stock-status" style="margin-top: 10px;">
              <i class="fa-solid fa-circle-check"></i> In Stock (${product.STOCK_QTY || 50} available)
            </div>
            <div style="font-size: 0.82rem; color: #555;">Ships from and sold by RetailShop</div>
          </div>

          <p style="font-size: 0.9rem; color: #333; margin-bottom: 16px;">${product.DESCRIPTION || 'Premium quality product with full warranty and free returns.'}</p>

          <div class="detail-actions">
            <button class="add-to-cart-btn" onclick="app.addToCart(${product.PRODUCT_ID})">
              <i class="fa-solid fa-cart-shopping"></i> Add to Cart
            </button>
            <button class="buy-now-btn" onclick="app.addToCart(${product.PRODUCT_ID}); app.closeProductModal(); app.openCheckoutModal();">
              Buy Now
            </button>
          </div>

          <!-- Customer Reviews Section -->
          <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            <h3>Customer Reviews</h3>
            <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 12px;">
              ${(product.REVIEWS || []).map(r => `
                <div style="background: #f9f9f9; padding: 12px; border-radius: 6px;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                    <strong>${r.USER_NAME}</strong>
                    <span style="color: #ffa41c;">${this.generateStarsHtml(r.RATING)}</span>
                  </div>
                  <strong>${r.REVIEW_TITLE || ''}</strong>
                  <p style="font-size: 0.85rem; color: #444; margin-top: 4px;">${r.COMMENT_TEXT}</p>
                </div>
              `).join('')}
            </div>

            <!-- Submit Review Form -->
            <form style="margin-top: 20px; background: #f4f6f8; padding: 16px; border-radius: 8px;" onsubmit="app.handleReviewSubmit(event, ${product.PRODUCT_ID})">
              <h4>Write a Customer Review</h4>
              <div class="form-row" style="margin-top: 8px;">
                <input type="text" id="revName" required placeholder="Your Name" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                <select id="revRating" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                  <option value="5">5 Stars - Excellent</option>
                  <option value="4">4 Stars - Good</option>
                  <option value="3">3 Stars - Average</option>
                  <option value="2">2 Stars - Poor</option>
                  <option value="1">1 Star - Terrible</option>
                </select>
              </div>
              <input type="text" id="revTitle" placeholder="Headline / Review Title" style="width: 100%; margin-top: 8px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
              <textarea id="revComment" required placeholder="Write your review comments..." style="width: 100%; margin-top: 8px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; height: 60px;"></textarea>
              <button type="submit" class="chip-btn" style="margin-top: 10px; background: var(--amz-navy); color: #fff;">Submit Review</button>
            </form>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('Failed to fetch product details:', err);
    }
  }

  closeProductModal() {
    const overlay = document.getElementById('productDetailModalOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  async handleReviewSubmit(e, productId) {
    e.preventDefault();
    const userName = document.getElementById('revName').value;
    const rating = document.getElementById('revRating').value;
    const reviewTitle = document.getElementById('revTitle').value;
    const commentText = document.getElementById('revComment').value;

    try {
      const res = await fetch(`${API_BASE}/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, rating, reviewTitle, commentText })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Review submitted! Thank you.');
        this.openProductModal(productId);
      }
    } catch (err) {
      this.showToast('Failed to post review.');
    }
  }

  /* ================= 5.5 WISHLIST MANAGEMENT ================= */
  loadWishlistFromStorage() {
    try {
      const stored = localStorage.getItem('amz_wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveWishlistToStorage() {
    localStorage.setItem('amz_wishlist', JSON.stringify(this.wishlist));
    this.updateWishlistBadge();
    this.renderWishlistDrawerUI();
    this.renderProductsGrid();
  }

  toggleWishlist(productId) {
    const product = this.products.find(p => p.PRODUCT_ID === productId);
    if (!product) return;

    const index = this.wishlist.findIndex(item => item.PRODUCT_ID === productId);
    if (index > -1) {
      this.wishlist.splice(index, 1);
      this.showToast(`Removed from Wishlist`);
    } else {
      this.wishlist.push(product);
      this.showToast(`Saved "${product.TITLE.substring(0, 25)}..." to Wishlist! ❤️`);
    }
    this.saveWishlistToStorage();
  }

  updateWishlistBadge() {
    const badge = document.getElementById('wishlistCountBadge');
    if (badge) badge.textContent = this.wishlist.length;
  }

  toggleWishlistDrawer(forceOpen = false) {
    const drawer = document.getElementById('wishlistDrawer');
    const overlay = document.getElementById('wishlistDrawerOverlay');
    if (!drawer || !overlay) return;

    if (forceOpen || !drawer.classList.contains('open')) {
      drawer.classList.add('open');
      overlay.classList.add('open');
      this.renderWishlistDrawerUI();
    } else {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
    }
  }

  renderWishlistDrawerUI() {
    const listEl = document.getElementById('wishlistItemsList');
    if (!listEl) return;

    if (this.wishlist.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: #666;">
          <i class="fa-solid fa-heart-crack" style="font-size: 2.5rem; color: #ccc; margin-bottom: 10px;"></i>
          <p>Your Wishlist is empty.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.wishlist.map(item => `
      <div class="cart-item-row">
        <img src="${item.MAIN_IMAGE}" class="cart-item-img" alt="${item.TITLE}">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.TITLE}</div>
          <div class="cart-item-price">$${item.PRICE.toFixed(2)}</div>
          <div style="margin-top: 8px; display: flex; gap: 8px;">
            <button class="chip-btn" style="padding: 4px 8px; font-size: 0.76rem; background: var(--amz-orange); color: #000;" onclick="app.moveWishlistItemToCart(${item.PRODUCT_ID})">
              Move to Cart
            </button>
            <button style="background: none; border: none; color: #c53030; cursor: pointer; font-size: 0.78rem;" onclick="app.toggleWishlist(${item.PRODUCT_ID})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  moveWishlistItemToCart(productId) {
    this.addToCart(productId);
    this.toggleWishlist(productId);
    this.toggleWishlistDrawer(false);
  }

  /* ================= 6. CART MANAGEMENT ================= */
  loadCartFromStorage() {
    try {
      const stored = localStorage.getItem('amz_cart');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveCartToStorage() {
    localStorage.setItem('amz_cart', JSON.stringify(this.cart));
    this.updateCartBadge();
    this.renderCartDrawerUI();
  }

  addToCart(productId) {
    const product = this.products.find(p => p.PRODUCT_ID === productId);
    if (!product) return;

    const existing = this.cart.find(item => item.PRODUCT_ID === productId);
    if (existing) {
      existing.QUANTITY += 1;
    } else {
      this.cart.push({ ...product, QUANTITY: 1 });
    }

    this.saveCartToStorage();
    this.showToast(`Added "${product.TITLE.substring(0, 30)}..." to Cart!`);
    this.toggleCartDrawer(true);
  }

  updateQuantity(productId, delta) {
    const item = this.cart.find(i => i.PRODUCT_ID === productId);
    if (!item) return;

    item.QUANTITY += delta;
    if (item.QUANTITY <= 0) {
      this.cart = this.cart.filter(i => i.PRODUCT_ID !== productId);
    }
    this.saveCartToStorage();
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(i => i.PRODUCT_ID !== productId);
    this.saveCartToStorage();
    this.showToast('Item removed from cart');
  }

  updateCartBadge() {
    const totalCount = this.cart.reduce((sum, item) => sum + item.QUANTITY, 0);
    const badge = document.getElementById('cartCountBadge');
    if (badge) badge.textContent = totalCount;
  }

  toggleCartDrawer(forceOpen = false) {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (!drawer || !overlay) return;

    if (forceOpen || !drawer.classList.contains('open')) {
      drawer.classList.add('open');
      overlay.classList.add('open');
      this.renderCartDrawerUI();
    } else {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
    }
  }

  renderCartDrawerUI() {
    const listEl = document.getElementById('cartItemsList');
    const totalCountEl = document.getElementById('cartTotalItemsCount');
    const chkBadgeEl = document.getElementById('checkoutBadgeCount');
    const priceEl = document.getElementById('cartSubtotalPrice');

    const totalQty = this.cart.reduce((sum, item) => sum + item.QUANTITY, 0);
    const subtotal = this.cart.reduce((sum, item) => sum + (item.PRICE * item.QUANTITY), 0);

    if (totalCountEl) totalCountEl.textContent = totalQty;
    if (chkBadgeEl) chkBadgeEl.textContent = totalQty;
    if (priceEl) priceEl.textContent = `$${subtotal.toFixed(2)}`;

    if (!listEl) return;

    if (this.cart.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: #666;">
          <i class="fa-solid fa-cart-shopping" style="font-size: 2.5rem; color: #ccc; margin-bottom: 10px;"></i>
          <p>Your cart is empty.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.cart.map(item => `
      <div class="cart-item-row">
        <img src="${item.MAIN_IMAGE}" class="cart-item-img" alt="${item.TITLE}">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.TITLE}</div>
          <div class="cart-item-price">$${item.PRICE.toFixed(2)}</div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="app.updateQuantity(${item.PRODUCT_ID}, -1)">-</button>
            <span>${item.QUANTITY}</span>
            <button class="qty-btn" onclick="app.updateQuantity(${item.PRODUCT_ID}, 1)">+</button>
            <button style="margin-left: 10px; background: none; border: none; color: #007185; cursor: pointer; font-size: 0.78rem;" onclick="app.removeFromCart(${item.PRODUCT_ID})">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  /* ================= 7. CHECKOUT & ORDERS ================= */
  openCheckoutModal() {
    if (this.cart.length === 0) {
      this.showToast('Your cart is empty.');
      return;
    }
    this.toggleCartDrawer(false);
    
    const subtotal = this.cart.reduce((sum, item) => sum + (item.PRICE * item.QUANTITY), 0);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const elItems = document.getElementById('chkItemsPrice');
    const elTax = document.getElementById('chkTaxPrice');
    const elTotal = document.getElementById('chkGrandTotal');

    if (elItems) elItems.textContent = `$${subtotal.toFixed(2)}`;
    if (elTax) elTax.textContent = `$${tax.toFixed(2)}`;
    if (elTotal) elTotal.textContent = `$${total.toFixed(2)}`;

    const overlay = document.getElementById('checkoutModalOverlay');
    if (overlay) overlay.classList.add('open');
  }

  closeCheckoutModal() {
    const overlay = document.getElementById('checkoutModalOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const placeBtn = document.getElementById('placeOrderBtn');
    if (placeBtn) placeBtn.disabled = true;

    const name = document.getElementById('chkName').value;
    const phone = document.getElementById('chkPhone').value;
    const address = document.getElementById('chkAddress').value;
    const city = document.getElementById('chkCity').value;
    const zip = document.getElementById('chkZip').value;
    const payment = document.querySelector('input[name="payMethod"]:checked')?.value || 'Credit Card';

    const subtotal = this.cart.reduce((sum, item) => sum + (item.PRICE * item.QUANTITY), 0);
    const totalAmount = subtotal * 1.08;

    try {
      const res = await fetch(`${API_BASE}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          phone,
          shippingAddress: address,
          city,
          postalCode: zip,
          paymentMethod: payment,
          items: this.cart,
          totalAmount
        })
      });

      const data = await res.json();
      if (data.success) {
        this.cart = [];
        this.saveCartToStorage();
        this.closeCheckoutModal();
        this.showToast(`🎉 Order Placed! Order ID: ${data.orderNumber}`);
        this.openOrdersModal();
      } else {
        this.showToast('Checkout failed: ' + data.error);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      this.showToast('Error processing your order. Please try again.');
    } finally {
      if (placeBtn) placeBtn.disabled = false;
    }
  }

  async openOrdersModal() {
    const overlay = document.getElementById('ordersModalOverlay');
    if (overlay) overlay.classList.add('open');
    await this.loadOrders();
  }

  closeOrdersModal() {
    const overlay = document.getElementById('ordersModalOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  renderOrderStepper(status) {
    const steps = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentIdx = steps.indexOf(status) > -1 ? steps.indexOf(status) : 0;

    return `
      <div class="order-stepper-container">
        <div class="order-stepper">
          ${steps.map((step, idx) => {
            const isCompleted = idx < currentIdx;
            const isActive = idx === currentIdx;
            const cls = isCompleted ? 'completed' : (isActive ? 'active' : '');
            return `
              <div class="step-node ${cls}">
                <div class="step-circle">
                  ${isCompleted ? '<i class="fa-solid fa-check"></i>' : (idx + 1)}
                </div>
                <span class="step-label">${step}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  async loadOrders() {
    const listEl = document.getElementById('ordersListContent');
    if (!listEl) return;

    listEl.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading your orders...</div>`;

    try {
      const res = await fetch(`${API_BASE}/orders`);
      const orders = await res.json();

      if (orders.length === 0) {
        listEl.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">No orders placed yet. Start shopping!</p>`;
        return;
      }

      const isAdmin = this.currentUser && this.currentUser.ROLE === 'ADMIN';

      listEl.innerHTML = orders.map(o => `
        <div class="order-card">
          <div class="order-card-header">
            <div>
              <strong>ORDER PLACED:</strong> ${o.ORDER_DATE || 'Recently'}
            </div>
            <div>
              <strong>TOTAL:</strong> $${o.TOTAL_AMOUNT.toFixed(2)}
            </div>
            <div>
              <strong>SHIP TO:</strong> ${o.CUSTOMER_NAME} (${o.CITY})
            </div>
            <div>
              <strong>ORDER # ${o.ORDER_NUMBER}</strong>
            </div>
          </div>
          <div class="order-card-body">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div style="color: #007600; font-weight: 700;">
                <i class="fa-solid fa-truck"></i> Status: ${o.ORDER_STATUS} — ${o.PAYMENT_METHOD} Paid
              </div>
              ${isAdmin ? `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.78rem; font-weight: 700;">Update Status:</span>
                  <select class="admin-status-select" onchange="app.updateOrderStatus(${o.ORDER_ID}, this.value)">
                    <option value="Processing" ${o.ORDER_STATUS === 'Processing' ? 'selected' : ''}>Processing</option>
                    <option value="Shipped" ${o.ORDER_STATUS === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Out for Delivery" ${o.ORDER_STATUS === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                    <option value="Delivered" ${o.ORDER_STATUS === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${o.ORDER_STATUS === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </div>
              ` : ''}
            </div>

            ${this.renderOrderStepper(o.ORDER_STATUS)}

            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
              ${(o.ITEMS || []).map(i => `
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${i.IMAGE_URL}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.88rem;">${i.PRODUCT_TITLE}</div>
                    <div style="font-size: 0.8rem; color: #555;">Qty: ${i.QUANTITY} | Price: $${i.PRICE.toFixed(2)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`Order status updated to ${status}!`);
        await this.loadOrders();
      } else {
        this.showToast('Error updating status: ' + data.error);
      }
    } catch (err) {
      this.showToast('Failed to connect to backend.');
    }
  }

  /* ================= 7.5 USER AUTHENTICATION ================= */
  loadUserFromStorage() {
    try {
      const stored = localStorage.getItem('amz_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  saveUserToStorage(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('amz_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('amz_user');
    }
    this.updateUserNavUI();
    this.renderProductsGrid();
  }

  updateUserNavUI() {
    const navTop = document.getElementById('navAccountTop');
    const navBottom = document.getElementById('navAccountBottom');

    if (this.currentUser) {
      if (navTop) navTop.textContent = `Hello, ${this.currentUser.FULL_NAME.split(' ')[0]}`;
      if (navBottom) navBottom.innerHTML = `${this.currentUser.ROLE === 'ADMIN' ? 'Admin Portal' : 'Account & Orders'} <i class="fa-solid fa-caret-down"></i>`;

      const chkName = document.getElementById('chkName');
      const chkPhone = document.getElementById('chkPhone');
      const chkAddress = document.getElementById('chkAddress');
      const chkCity = document.getElementById('chkCity');
      const chkZip = document.getElementById('chkZip');

      if (chkName && this.currentUser.FULL_NAME) chkName.value = this.currentUser.FULL_NAME;
      if (chkPhone && this.currentUser.PHONE) chkPhone.value = this.currentUser.PHONE;
      if (chkAddress && this.currentUser.ADDRESS) chkAddress.value = this.currentUser.ADDRESS;
      if (chkCity && this.currentUser.CITY) chkCity.value = this.currentUser.CITY;
      if (chkZip && this.currentUser.POSTAL_CODE) chkZip.value = this.currentUser.POSTAL_CODE;
    } else {
      if (navTop) navTop.textContent = 'Hello, Sign in';
      if (navBottom) navBottom.innerHTML = 'Account <i class="fa-solid fa-caret-down"></i>';
    }
  }

  handleAccountClick() {
    if (this.currentUser) {
      if (this.currentUser.ROLE === 'ADMIN') {
        window.location.href = '/admin.html';
      } else {
        this.openOrdersModal();
      }
    } else {
      this.openAuthModal();
    }
  }

  openAuthModal() {
    const overlay = document.getElementById('authModalOverlay');
    if (overlay) overlay.classList.add('open');
    this.switchAuthTab('login');
  }

  closeAuthModal() {
    const overlay = document.getElementById('authModalOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabBtnLogin');
    const tabReg = document.getElementById('tabBtnRegister');
    const authTitle = document.getElementById('authTitle');

    if (tab === 'login') {
      if (loginForm) loginForm.style.display = 'block';
      if (regForm) regForm.style.display = 'none';
      if (tabLogin) tabLogin.classList.add('active');
      if (tabReg) tabReg.classList.remove('active');
      if (authTitle) authTitle.textContent = 'Sign In';
    } else {
      if (loginForm) loginForm.style.display = 'none';
      if (regForm) regForm.style.display = 'block';
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabReg) tabReg.classList.add('active');
      if (authTitle) authTitle.textContent = 'Create Account';
    }
  }

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        this.saveUserToStorage(data.user);
        this.closeAuthModal();
        this.showToast(`Welcome back, ${data.user.FULL_NAME}!`);
      } else {
        this.showToast(data.error || 'Login failed.');
      }
    } catch (err) {
      this.showToast('Login failed: network error.');
    }
  }

  async handleRegisterSubmit(e) {
    e.preventDefault();
    const fullName = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value;
    const city = document.getElementById('regCity').value;
    const address = document.getElementById('regAddress').value;

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, phone, city, address })
      });
      const data = await res.json();
      if (data.success) {
        this.saveUserToStorage(data.user);
        this.closeAuthModal();
        this.showToast(`Account created successfully! Welcome, ${data.user.FULL_NAME}`);
      } else {
        this.showToast(data.error || 'Registration failed.');
      }
    } catch (err) {
      this.showToast('Registration failed: network error.');
    }
  }

  logout() {
    this.saveUserToStorage(null);
    this.showToast('Logged out successfully.');
  }

  /* ================= 8. ADMIN & PRODUCT EDITING ================= */
  openEditProductModal(productId) {
    const product = this.products.find(p => p.PRODUCT_ID === productId);
    if (!product) return;

    document.getElementById('editProdId').value = product.PRODUCT_ID;
    document.getElementById('editTitle').value = product.TITLE;
    document.getElementById('editBrand').value = product.BRAND || '';
    document.getElementById('editPrice').value = product.PRICE;
    document.getElementById('editListPrice').value = product.LIST_PRICE || product.PRICE;
    document.getElementById('editStockQty').value = product.STOCK_QTY || 50;
    document.getElementById('editBadgeText').value = product.BADGE_TEXT || '';
    document.getElementById('editDescription').value = product.DESCRIPTION || '';
    document.getElementById('editIsPrime').checked = product.IS_PRIME === 1;
    document.getElementById('editIsDeal').checked = product.IS_DEAL === 1;

    const editCategory = document.getElementById('editCategory');
    if (editCategory && this.categories.length > 0) {
      editCategory.innerHTML = this.categories.map(c => 
        `<option value="${c.CATEGORY_ID}" ${c.CATEGORY_ID === product.CATEGORY_ID ? 'selected' : ''}>${c.NAME}</option>`
      ).join('');
    }

    const overlay = document.getElementById('editProductModalOverlay');
    if (overlay) overlay.classList.add('open');
  }

  closeEditProductModal() {
    const overlay = document.getElementById('editProductModalOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  async handleEditProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editProdId').value;
    const title = document.getElementById('editTitle').value;
    const brand = document.getElementById('editBrand').value;
    const price = document.getElementById('editPrice').value;
    const listPrice = document.getElementById('editListPrice').value;
    const categoryId = document.getElementById('editCategory').value;
    const stockQty = document.getElementById('editStockQty').value;
    const badgeText = document.getElementById('editBadgeText').value;
    const description = document.getElementById('editDescription').value;
    const isPrime = document.getElementById('editIsPrime').checked;
    const isDeal = document.getElementById('editIsDeal').checked;

    try {
      const res = await fetch(`${API_BASE}/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, brand, price, listPrice, categoryId, stockQty, badgeText, description, isPrime, isDeal
        })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Product updated successfully!');
        this.closeEditProductModal();
        await this.loadProducts();
      } else {
        this.showToast('Error updating product: ' + data.error);
      }
    } catch (err) {
      this.showToast('Failed to update product.');
    }
  }

  async deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?\n\nThis cannot be undone.')) return;

    try {
      const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Product deleted successfully.');
        await this.loadProducts();
        await this.checkDatabaseStatus();
      } else {
        this.showToast('Error: ' + data.error);
      }
    } catch (err) {
      this.showToast('Failed to delete product.');
    }
  }

  /* ================= 8. ADMIN PORTAL ================= */
  toggleAdminModal() {
    const overlay = document.getElementById('adminModalOverlay');
    if (!overlay) return;
    overlay.classList.toggle('open');
    if (overlay.classList.contains('open')) {
      this.checkDatabaseStatus();
    }
  }

  closeAdminModal() {
    const overlay = document.getElementById('adminModalOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  async handleAddProduct(e) {
    e.preventDefault();
    const title = document.getElementById('admTitle').value;
    const brand = document.getElementById('admBrand').value;
    const price = document.getElementById('admPrice').value;
    const listPrice = document.getElementById('admListPrice').value;
    const categoryId = document.getElementById('admCategory').value;
    const mainImage = document.getElementById('admImage').value;
    const description = document.getElementById('admDescription').value;
    const isPrime = document.getElementById('admIsPrime').checked;
    const isDeal = document.getElementById('admIsDeal').checked;

    try {
      const res = await fetch(`${API_BASE}/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, brand, price, listPrice, categoryId, mainImage, description, isPrime, isDeal
        })
      });

      const data = await res.json();
      if (data.success) {
        this.showToast('Product added to catalog!');
        this.closeAdminModal();
        await this.loadProducts();
        await this.checkDatabaseStatus();
      } else {
        this.showToast('Error: ' + data.error);
      }
    } catch (err) {
      this.showToast('Failed to connect to backend');
    }
  }

  toggleSideMenu() {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('sidebarOverlay');
    if (drawer && overlay) {
      drawer.classList.toggle('open');
      overlay.classList.toggle('open');
    }
  }

  showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--amz-orange);"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Initialize Application
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new RetailShopApp();
});
