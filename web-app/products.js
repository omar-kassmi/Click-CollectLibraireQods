document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const isCatalogue = Boolean($('products-grid'));
  const isProductPage = Boolean($('product-page-root'));
  if (!isCatalogue && !isProductPage) return;

  const db = supabase.createClient(
    'https://jgfkshsizrtwzqsdrhhp.supabase.co',
    'sb_publishable_Rdn2yMULDq05BGBV-X-zCA_S934mdEh'
  );
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const FILTER_KEY = 'elqods-products-filter-state';
  const RETURN_KEY = 'elqods-return-products';
  let categories = [];
  let products = [];
  let variants = [];
  let selectedCategory = '';
  let selectedSubs = new Set();
  let selectedBrands = new Set();

  const roots = () => categories.filter(category => !category.parent_id);
  const children = parentId => categories.filter(category => String(category.parent_id || '') === String(parentId));
  const productVariants = productId => variants.filter(item => String(item.product_id) === String(productId) && item.is_active !== false);
  const productPrice = product => {
    const prices = productVariants(product.id).map(item => Number(item.price)).filter(Number.isFinite);
    return prices.length ? Math.min(...prices) : Number(product.price || 0);
  };
  const productStock = product => {
    const list = productVariants(product.id);
    if (!list.length) return 'in_stock';
    const available = list.some(item => item.availability === 'in_stock' && Number(item.stock_quantity || 0) > 0);
    const low = list.some(item => item.availability === 'low_stock' && Number(item.stock_quantity || 0) > 0);
    return available ? 'in_stock' : low ? 'low_stock' : 'out_of_stock';
  };
  const stockLabel = status => status === 'out_of_stock' ? 'Non disponible' : status === 'low_stock' ? 'Presque épuisé' : 'En stock';

  function readSavedState() {
    try { return JSON.parse(sessionStorage.getItem(FILTER_KEY) || 'null'); }
    catch { return null; }
  }
  function saveState() {
    if (!isCatalogue) return;
    const state = {
      category: selectedCategory,
      subs: [...selectedSubs],
      brands: [...selectedBrands],
      stocks: [...document.querySelectorAll('[data-stock-filter]:checked')].map(input => input.value),
      min: $('products-min-price')?.value || '',
      max: $('products-max-price')?.value || '',
      sort: $('products-sort')?.value || 'newest',
      scrollY: window.scrollY
    };
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(state));
  }
  function clearStateInMemory() {
    selectedCategory = '';
    selectedSubs.clear();
    selectedBrands.clear();
    document.querySelectorAll('[data-stock-filter]').forEach(input => { input.checked = false; });
    if ($('products-min-price')) $('products-min-price').value = '';
    if ($('products-max-price')) $('products-max-price').value = '';
    if ($('products-sort')) $('products-sort').value = 'newest';
  }
  function restoreState(state) {
    if (!state) return clearStateInMemory();
    selectedCategory = String(state.category || '');
    selectedSubs = new Set((state.subs || []).map(String));
    selectedBrands = new Set(state.brands || []);
    if ($('products-min-price')) $('products-min-price').value = state.min || '';
    if ($('products-max-price')) $('products-max-price').value = state.max || '';
    if ($('products-sort')) $('products-sort').value = state.sort || 'newest';
    document.querySelectorAll('[data-stock-filter]').forEach(input => {
      input.checked = (state.stocks || []).includes(input.value);
    });
  }

  function renderCategoryBar() {
    const host = $('products-category-nav')?.querySelector('.products-category-nav-inner');
    if (!host) return;
    host.innerHTML = `<button type="button" class="category-bubble ${selectedCategory ? '' : 'is-active'}" data-category-id=""><strong>Tous les produits</strong></button>` +
      roots().map(category => `
        <button type="button" class="category-bubble ${selectedCategory === String(category.id) ? 'is-active' : ''}" data-category-id="${category.id}">
          <span class="category-picture">${category.image_url ? `<img src="${esc(category.image_url)}" alt="${esc(category.name)}">` : `<span>${esc(category.name?.charAt(0) || 'C')}</span>`}</span>
          <strong>${esc(category.name)}</strong>
        </button>`).join('');
    host.querySelectorAll('[data-category-id]').forEach(button => {
      button.addEventListener('click', () => {
        selectedCategory = String(button.dataset.categoryId || '');
        selectedSubs.clear();
        renderCatalogueFilters();
        renderCatalogue();
      });
    });
  }

  function renderCatalogueFilters() {
    renderCategoryBar();
    const subHost = $('products-subcategory-filters');
    if (subHost) {
      const subcategories = selectedCategory ? children(selectedCategory) : [];
      subHost.innerHTML = subcategories.length ? subcategories.map(category => {
        const count = products.filter(product => String(product.category_id) === String(category.id)).length;
        return `<label><input type="checkbox" data-sub-filter value="${category.id}" ${selectedSubs.has(String(category.id)) ? 'checked' : ''}><i></i><span>${esc(category.name)}</span><b>(${count})</b></label>`;
      }).join('') : '<p class="products-filter-hint">Choisissez une catégorie dans la barre supérieure.</p>';
      subHost.querySelectorAll('[data-sub-filter]').forEach(input => {
        input.addEventListener('change', () => {
          input.checked ? selectedSubs.add(String(input.value)) : selectedSubs.delete(String(input.value));
          renderCatalogue();
        });
      });
    }

    const brandHost = $('products-brand-filters');
    if (brandHost) {
      const brands = [...new Set(products.map(product => String(product.brand || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
      brandHost.innerHTML = brands.length ? brands.map(brand => {
        const count = products.filter(product => String(product.brand || '').trim() === brand).length;
        return `<label><input type="checkbox" data-brand-filter value="${esc(brand)}" ${selectedBrands.has(brand) ? 'checked' : ''}><i></i><span>${esc(brand)}</span><b>(${count})</b></label>`;
      }).join('') : '<p class="products-filter-hint">Aucune marque renseignée.</p>';
      brandHost.querySelectorAll('[data-brand-filter]').forEach(input => {
        input.addEventListener('change', () => {
          input.checked ? selectedBrands.add(input.value) : selectedBrands.delete(input.value);
          renderCatalogue();
        });
      });
    }

    const inCount = products.filter(product => productStock(product) !== 'out_of_stock').length;
    const outCount = products.filter(product => productStock(product) === 'out_of_stock').length;
    if ($('products-stock-count')) $('products-stock-count').textContent = `(${inCount})`;
    if ($('products-out-count')) $('products-out-count').textContent = `(${outCount})`;
  }

  function catalogueResults() {
    const selectedStocks = [...document.querySelectorAll('[data-stock-filter]:checked')].map(input => input.value);
    const minimum = $('products-min-price')?.value === '' ? -Infinity : Number($('products-min-price').value);
    const maximum = $('products-max-price')?.value === '' ? Infinity : Number($('products-max-price').value);
    let list = products.filter(product => {
      const category = categories.find(item => String(item.id) === String(product.category_id));
      const matchesCategory = !selectedCategory || String(product.category_id) === selectedCategory || String(category?.parent_id || '') === selectedCategory;
      const matchesSub = !selectedSubs.size || selectedSubs.has(String(product.category_id));
      const matchesBrand = !selectedBrands.size || selectedBrands.has(String(product.brand || '').trim());
      const price = productPrice(product);
      const matchesPrice = price >= minimum && price <= maximum;
      const status = productStock(product);
      const matchesStock = !selectedStocks.length || selectedStocks.some(value => value === 'in_stock' ? status !== 'out_of_stock' : status === 'out_of_stock');
      return matchesCategory && matchesSub && matchesBrand && matchesPrice && matchesStock;
    });

    const sort = $('products-sort')?.value || 'newest';
    return list.sort((a, b) => sort === 'price_asc' ? productPrice(a) - productPrice(b)
      : sort === 'price_desc' ? productPrice(b) - productPrice(a)
      : sort === 'title' ? String(a.title).localeCompare(String(b.title), 'fr')
      : new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function renderCatalogue() {
    const host = $('products-grid');
    if (!host) return;
    const list = catalogueResults();
    $('products-results-count').textContent = `${list.length} produit${list.length > 1 ? 's' : ''}`;
    const activeCount = Number(Boolean(selectedCategory)) + selectedSubs.size + selectedBrands.size + document.querySelectorAll('[data-stock-filter]:checked').length + Number(Boolean($('products-min-price')?.value)) + Number(Boolean($('products-max-price')?.value));
    if ($('products-filter-count')) $('products-filter-count').textContent = activeCount;
    host.innerHTML = list.length ? list.map(product => {
      const status = productStock(product);
      return `<article class="product-card" data-product-id="${product.id}" tabindex="0" role="link">
        <div class="product-card-media"><img src="${esc(product.image_url)}" alt="${esc(product.title)}"></div>
        <div class="product-card-body">${product.brand ? `<span class="product-card-brand">${esc(product.brand)}</span>` : ''}<h3>${esc(product.title)}</h3><div class="product-card-price">${productPrice(product).toFixed(2).replace('.', ',')} MAD</div><div class="product-card-stock ${status === 'low_stock' ? 'low' : status === 'out_of_stock' ? 'out' : ''}"><i></i><span>${stockLabel(status)}</span></div><button type="button" ${status === 'out_of_stock' ? 'disabled' : ''}>${status === 'out_of_stock' ? 'INDISPONIBLE' : '+ AJOUTER'}</button></div>
      </article>`;
    }).join('') : '<p class="products-empty">Aucun produit ne correspond aux filtres sélectionnés.</p>';

    host.querySelectorAll('.product-card[data-product-id]').forEach(card => {
      const open = event => {
        if (event?.target?.closest('button')) return;
        saveState();
        location.href = `produit.html?id=${encodeURIComponent(card.dataset.productId)}`;
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(event); }
      });
    });
  }

  function renderProductPage() {
    const root = $('product-page-root');
    const id = new URLSearchParams(location.search).get('id');
    const product = products.find(item => String(item.id) === String(id));
    if (!product) { root.innerHTML = '<div class="product-page-error">Produit introuvable.</div>'; return; }
    const list = productVariants(product.id);
    const status = productStock(product);
    document.title = `${product.title} - Librairie El Qods`;
    root.innerHTML = `<div class="product-page-toolbar"><button class="product-page-back" id="product-page-back" type="button"><span>‹</span><b>Retour aux produits</b></button><button id="product-add-cart" class="product-add-cart product-add-cart-top" type="button" ${status === 'out_of_stock' ? 'disabled' : ''}><span>🛒</span>${status === 'out_of_stock' ? 'INDISPONIBLE' : 'AJOUTER AU PANIER'}</button></div>
      <div class="product-page-layout"><section class="product-gallery"><div class="product-main-image"><img src="${esc(product.image_url)}" alt="${esc(product.title)}"></div><div class="product-thumbnails"><button class="is-active"><img src="${esc(product.image_url)}" alt=""></button></div></section>
      <section class="product-purchase"><span class="product-page-brand">${esc(product.brand || 'Librairie El Qods')}</span><h1>${esc(product.title)}</h1><div class="product-page-price-line"><span class="product-page-stock ${status === 'out_of_stock' ? 'is-out' : ''}"><i>${status === 'out_of_stock' ? '×' : '✓'}</i>${stockLabel(status)}</span><strong id="product-page-price">${productPrice(product).toFixed(2).replace('.', ',')} MAD</strong></div><label class="product-quantity"><b>Quantité</b><input id="product-quantity" type="number" min="1" value="1"></label><div class="product-page-variants"><h3>Variantes</h3><div>${list.map((item, index) => `<button type="button" class="product-page-variant ${index === 0 ? 'is-selected' : ''}" data-price="${Number(item.price || 0)}"><span>${esc(item.title || `Variante ${index + 1}`)}</span><small>${Number(item.price || 0).toFixed(2).replace('.', ',')} MAD</small></button>`).join('') || '<p>Aucune variante disponible.</p>'}</div></div></section>
      <aside class="product-details-card"><nav><button class="is-active" data-detail-tab="description">Description</button><button data-detail-tab="details">Détails du produit</button></nav><div class="product-detail-pane is-active" data-detail-pane="description"><p>${esc(product.description || product.short_description || 'Aucune description disponible.')}</p></div><div class="product-detail-pane" data-detail-pane="details"><dl><div><dt>Marque</dt><dd>${esc(product.brand || '-')}</dd></div><div><dt>Référence</dt><dd>${esc(product.sku || '-')}</dd></div><div><dt>Catégorie</dt><dd>${esc(categories.find(item => String(item.id) === String(product.category_id))?.name || '-')}</dd></div></dl></div></aside></div>`;

    $('product-page-back').addEventListener('click', () => {
      sessionStorage.setItem(RETURN_KEY, '1');
      location.href = 'index.html?tab=section-autres&return=product';
    });
    document.querySelectorAll('[data-detail-tab]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('[data-detail-tab]').forEach(item => item.classList.toggle('is-active', item === button));
      document.querySelectorAll('[data-detail-pane]').forEach(item => item.classList.toggle('is-active', item.dataset.detailPane === button.dataset.detailTab));
    }));
    document.querySelectorAll('.product-page-variant').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('.product-page-variant').forEach(item => item.classList.toggle('is-selected', item === button));
      $('product-page-price').textContent = `${Number(button.dataset.price).toFixed(2).replace('.', ',')} MAD`;
    }));
  }

  Promise.all([
    db.from('product_categories').select('*').eq('is_active', true).order('sort_order'),
    db.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    db.from('product_variants').select('*').eq('is_active', true).order('sort_order')
  ]).then(([categoryResult, productResult, variantResult]) => {
    if (categoryResult.error || productResult.error || variantResult.error) {
      console.error(categoryResult.error || productResult.error || variantResult.error);
      if (isCatalogue) $('products-grid').innerHTML = '<p class="products-empty">Le catalogue est momentanément indisponible.</p>';
      return;
    }
    categories = categoryResult.data || [];
    products = productResult.data || [];
    variants = variantResult.data || [];
    if (isProductPage) return renderProductPage();

    const returning = sessionStorage.getItem(RETURN_KEY) === '1';
    const state = returning ? readSavedState() : null;
    returning ? restoreState(state) : clearStateInMemory();
    renderCatalogueFilters();
    renderCatalogue();
    if (returning) {
      sessionStorage.removeItem(RETURN_KEY);
      requestAnimationFrame(() => window.scrollTo({ top: Number(state?.scrollY || 0), behavior: 'auto' }));
    }
  });

  if (isCatalogue) {
    $('products-sort')?.addEventListener('change', renderCatalogue);
    document.querySelectorAll('[data-stock-filter]').forEach(input => input.addEventListener('change', renderCatalogue));
    ['products-min-price', 'products-max-price'].forEach(id => $(id)?.addEventListener('input', renderCatalogue));
    $('products-clear-filters')?.addEventListener('click', () => { clearStateInMemory(); renderCatalogueFilters(); renderCatalogue(); });
    $('products-open-filters')?.addEventListener('click', () => $('products-filters')?.classList.add('is-open'));
  }
});
