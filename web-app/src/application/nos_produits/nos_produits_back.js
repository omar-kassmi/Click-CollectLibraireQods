/* El Qods - Nos produits V6 MultiCategories - catalogue + fiche produit */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const grid = $('products-grid');
  if (!grid || !window.supabase) return;

  const db = supabase.createClient(
    'https://jgfkshsizrtwzqsdrhhp.supabase.co',
    'sb_publishable_Rdn2yMULDq05BGBV-X-zCA_S934mdEh'
  );

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const money = (value) => `${Number(value || 0).toFixed(2).replace('.', ',')} MAD`;

  let categories = [];
  let products = [];
  let variants = [];
  let selectedCategories = new Set();
  let selectedSubcategories = new Set();
  let activeProduct = null;
  let activeVariant = null;
  let quantity = 1;

  const rootCategories = () => categories.filter((item) => !item.parent_id);
  const childCategories = (parentId) => categories.filter(
    (item) => String(item.parent_id || '') === String(parentId)
  );
  const productVariants = (productId) => variants.filter(
    (variant) => String(variant.product_id) === String(productId) && variant.is_active !== false
  );
  const minimumPrice = (product) => {
    const prices = productVariants(product.id).map((variant) => Number(variant.price) || 0);
    return prices.length ? Math.min(...prices) : 0;
  };
  const stockState = (product) => {
    const list = productVariants(product.id);
    if (list.some((variant) => variant.availability === 'in_stock' && Number(variant.stock_quantity) !== 0)) return 'in_stock';
    if (list.some((variant) => variant.availability === 'low_stock' && Number(variant.stock_quantity) !== 0)) return 'low_stock';
    return 'out_of_stock';
  };
  const stockText = (state) => state === 'in_stock'
    ? 'En stock'
    : state === 'low_stock'
      ? 'Presque épuisé'
      : 'Rupture de stock';

  function familyIds(categoryId) {
    return new Set([String(categoryId), ...childCategories(categoryId).map((item) => String(item.id))]);
  }

  function availableSubcategories() {
    return categories.filter(
      (item) => item.parent_id && selectedCategories.has(String(item.parent_id))
    );
  }

  function toggleCategory(id) {
    selectedCategories.has(id) ? selectedCategories.delete(id) : selectedCategories.add(id);
    const allowed = new Set(availableSubcategories().map((item) => String(item.id)));
    selectedSubcategories = new Set([...selectedSubcategories].filter((item) => allowed.has(item)));
    renderTaxonomy();
    renderProducts();
  }

  function renderTaxonomy() {
    const anySelected = selectedCategories.size > 0;
    const categoryHost = $('products-category-nav')?.querySelector('.products-category-nav-inner');

    if (categoryHost) {
      categoryHost.innerHTML = rootCategories().map((category) => {
        const selected = selectedCategories.has(String(category.id));
        return `<button type="button" class="category-bubble ${selected ? 'is-active' : anySelected ? 'is-muted' : ''}" data-category-bubble="${category.id}">
          <span class="category-picture">${category.image_url
            ? `<img src="${esc(category.image_url)}" alt="${esc(category.name)}">`
            : `<span>${esc(category.name.charAt(0))}</span>`}</span>
          <strong>${esc(category.name)}</strong>
          <i class="category-remove" aria-hidden="true">×</i>
        </button>`;
      }).join('');
    }

    if ($('products-category-filters')) {
      $('products-category-filters').innerHTML = rootCategories().map((category) => `
        <label><input type="checkbox" data-category-filter value="${category.id}" ${selectedCategories.has(String(category.id)) ? 'checked' : ''}><i></i><span>${esc(category.name)}</span></label>
      `).join('');
    }

    const subcategories = availableSubcategories();
    if ($('products-subcategory-filters')) {
      $('products-subcategory-filters').innerHTML = subcategories.length
        ? subcategories.map((subcategory) => `
          <label><input type="checkbox" data-subcategory-filter value="${subcategory.id}" ${selectedSubcategories.has(String(subcategory.id)) ? 'checked' : ''}><i></i><span>${esc(subcategory.name)}</span></label>
        `).join('')
        : '<p class="products-filter-hint">Sélectionnez une ou plusieurs catégories.</p>';
    }

    document.querySelectorAll('[data-category-bubble]').forEach((button) => {
      button.onclick = () => toggleCategory(button.dataset.categoryBubble);
    });
    document.querySelectorAll('[data-category-filter]').forEach((input) => {
      input.onchange = () => toggleCategory(input.value);
    });
    document.querySelectorAll('[data-subcategory-filter]').forEach((input) => {
      input.onchange = () => {
        input.checked ? selectedSubcategories.add(input.value) : selectedSubcategories.delete(input.value);
        renderProducts();
      };
    });
  }

  function filteredProducts() {
    const query = ($('products-search')?.value || '').trim().toLowerCase();
    const stockFilters = [...document.querySelectorAll('[data-stock-filter]:checked')].map((input) => input.value);
    const allowedCategoryIds = new Set();
    selectedCategories.forEach((id) => familyIds(id).forEach((familyId) => allowedCategoryIds.add(familyId)));

    const result = products.filter((product) => {
      if (selectedCategories.size && !allowedCategoryIds.has(String(product.category_id))) return false;
      if (selectedSubcategories.size && !selectedSubcategories.has(String(product.category_id))) return false;
      if (query && ![product.title, product.brand, product.sku, product.short_description]
        .some((value) => String(value || '').toLowerCase().includes(query))) return false;
      if (stockFilters.length && !stockFilters.includes(stockState(product))) return false;
      return true;
    });

    const sort = $('products-sort')?.value || 'newest';
    return result.sort((a, b) => sort === 'price_asc'
      ? minimumPrice(a) - minimumPrice(b)
      : sort === 'price_desc'
        ? minimumPrice(b) - minimumPrice(a)
        : sort === 'title'
          ? a.title.localeCompare(b.title, 'fr')
          : new Date(b.created_at) - new Date(a.created_at));
  }

  function renderProducts() {
    const list = filteredProducts();
    if ($('products-results-count')) $('products-results-count').textContent = `${list.length} produit${list.length > 1 ? 's' : ''}`;

    grid.innerHTML = list.length ? list.map((product) => {
      const state = stockState(product);
      const productUrl = `produit.html?id=${encodeURIComponent(product.id)}`;
      return `<article class="product-card">
        <a class="product-card-link" href="${productUrl}" data-product-link="${product.id}" aria-label="Ouvrir ${esc(product.title)}">
          <div class="product-card-media"><img src="${esc(product.image_url)}" alt="${esc(product.title)}"></div>
          <div class="product-card-body">
            <h3>${esc(product.title)}</h3>
            <div class="product-card-price">${money(minimumPrice(product))}</div>
            <div class="product-card-stock ${state === 'low_stock' ? 'low' : state === 'out_of_stock' ? 'out' : ''}"><i></i><span>${stockText(state)}</span></div>
            <span class="product-card-cta">+ AJOUTER</span>
          </div>
        </a>
      </article>`;
    }).join('') : '<p class="products-empty">Aucun produit ne correspond aux filtres.</p>';

    // Les cartes sont de vrais liens HTML vers produit.html.
    // Aucun overlay, hash ou panneau intermédiaire n'est utilisé.
    grid.querySelectorAll('[data-product-link]').forEach((link) => {
      link.onclick = (event) => {
        event.stopImmediatePropagation();
        // Le navigateur suit ensuite directement le href du lien.
      };
    });
  }

  function variantOptions(variant) {
    if (Array.isArray(variant.options)) return variant.options;
    if (Array.isArray(variant.product_variant_options)) {
      return variant.product_variant_options.map((item) => ({
        name: item.option_name || item.name,
        value: item.option_value || item.value
      }));
    }
    return [];
  }

  function optionGroups(list) {
    const groups = new Map();
    list.forEach((variant) => {
      variantOptions(variant).forEach((option) => {
        if (!option?.name || option?.value == null) return;
        if (!groups.has(option.name)) groups.set(option.name, new Set());
        groups.get(option.name).add(String(option.value));
      });
    });
    return groups;
  }

  function ensureProductPage() {
    let page = $('product-page-view');
    if (page) return page;

    page = document.createElement('section');
    page.id = 'product-page-view';
    page.className = 'product-page-view';
    page.innerHTML = `
      <div class="product-page-shell">
        <button type="button" id="product-page-back" class="product-page-back" aria-label="Retour aux produits">‹</button>
        <div id="product-page-content"></div>
      </div>`;
    document.body.appendChild(page);
    $('product-page-back').onclick = closeProductPage;
    return page;
  }

  function productImages(product) {
    const list = [];
    if (product.image_url) list.push(product.image_url);
    if (Array.isArray(product.images)) {
      product.images.forEach((item) => {
        const url = typeof item === 'string' ? item : item?.url;
        if (url && !list.includes(url)) list.push(url);
      });
    }
    return list.length ? list : [''];
  }


  Promise.all([
    db.from('product_categories').select('*').eq('is_active', true).order('sort_order'),
    db.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    db.from('product_variants').select('*,product_variant_options(*)').eq('is_active', true).order('sort_order')
  ]).then(([categoryResult, productResult, variantResult]) => {
    if (categoryResult.error || productResult.error || variantResult.error) {
      console.error(categoryResult.error || productResult.error || variantResult.error);
      grid.innerHTML = '<p class="products-empty">Le catalogue est momentanément indisponible.</p>';
      return;
    }
    categories = categoryResult.data || [];
    products = productResult.data || [];
    variants = variantResult.data || [];
    renderTaxonomy();
    renderProducts();
  });

  $('products-search')?.addEventListener('input', renderProducts);
  $('products-sort')?.addEventListener('change', renderProducts);
  document.querySelectorAll('[data-stock-filter]').forEach((input) => input.addEventListener('change', renderProducts));
  $('products-clear-filters')?.addEventListener('click', () => {
    selectedCategories.clear();
    selectedSubcategories.clear();
    if ($('products-search')) $('products-search').value = '';
    document.querySelectorAll('[data-stock-filter]').forEach((input) => { input.checked = false; });
    renderTaxonomy();
    renderProducts();
  });
});
