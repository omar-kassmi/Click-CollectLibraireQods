/* Fiche produit autonome — sans splash, header identique aux autres pages */
(() => {
  'use strict';

  // Exécuté immédiatement, sans attendre DOMContentLoaded.
  const removeSplash = () => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
  };
  removeSplash();

  document.addEventListener('DOMContentLoaded', async () => {
    removeSplash();

    const $ = (id) => document.getElementById(id);
    const section = $('section-fiche-produit');
    const content = $('fiche-produit-contenu');
    if (!section || !content || !window.supabase) return;

    document.querySelectorAll('main > .content-section').forEach((item) => {
      item.classList.toggle('hidden', item !== section);
    });
    section.classList.remove('hidden');
    document.body.classList.remove('product-standalone-loading');

    // Même comportement du header que sur les autres pages.
    const header = $('main-header');
    const syncHeader = () => {
      if (!header) return;
      const scrolled = window.scrollY > 40;
      header.classList.toggle('header-is-scrolled', scrolled);
      header.classList.toggle('header-is-top', !scrolled);
      header.classList.toggle('bg-transparent', !scrolled);
      header.classList.toggle('border-transparent', !scrolled);
      header.classList.toggle('py-4', !scrolled);
      header.classList.toggle('bg-white', scrolled);
      header.classList.toggle('shadow-md', scrolled);
      header.classList.toggle('border-b', scrolled);
      header.classList.toggle('border-gray-100', scrolled);
      header.classList.toggle('py-2.5', scrolled);
    };
    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
    window.addEventListener('pageshow', syncHeader);

    const db = supabase.createClient(
      'https://jgfkshsizrtwzqsdrhhp.supabase.co',
      'sb_publishable_Rdn2yMULDq05BGBV-X-zCA_S934mdEh'
    );

    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const money = (value) => `${Number(value || 0).toFixed(2).replace('.', ',')} MAD`;
    const productId = new URLSearchParams(location.search).get('id');

    $('fiche-produit-retour').onclick = () => {
      // Le paramètre est destiné à index.html pour supprimer le splash au retour.
      sessionStorage.setItem('elqods_skip_splash_once', '1');
      location.replace('index.html?skipSplash=1&open=products#section-autres');
    };

    if (!productId) {
      content.innerHTML = '<p class="fiche-produit-error">Produit introuvable.</p>';
      return;
    }

    const [productResult, variantResult] = await Promise.all([
      db.from('products').select('*').eq('id', productId).single(),
      db.from('product_variants').select('*,product_variant_options(*)')
        .eq('product_id', productId).eq('is_active', true).order('sort_order')
    ]);

    if (productResult.error || !productResult.data || variantResult.error) {
      console.error(productResult.error || variantResult.error);
      content.innerHTML = '<p class="fiche-produit-error">Le produit est momentanément indisponible.</p>';
      return;
    }

    const product = productResult.data;
    const variants = variantResult.data || [];
    let selectedVariant = variants.find((item) => item.availability !== 'out_of_stock') || variants[0] || null;
    let quantity = 1;
    const selectedOptions = new Map();

    const optionList = (variant) => Array.isArray(variant?.product_variant_options)
      ? variant.product_variant_options.map((item) => ({
          name: item.option_name || item.name,
          value: item.option_value || item.value
        }))
      : Array.isArray(variant?.options) ? variant.options : [];

    const optionGroups = () => {
      const groups = new Map();
      variants.forEach((variant) => optionList(variant).forEach((option) => {
        if (!option?.name || option.value == null) return;
        if (!groups.has(option.name)) groups.set(option.name, new Set());
        groups.get(option.name).add(String(option.value));
      }));
      return groups;
    };

    const stockText = (state) => state === 'in_stock'
      ? 'En stock'
      : state === 'low_stock' ? 'Presque épuisé' : 'Rupture de stock';

    const images = [product.image_url].filter(Boolean);
    if (Array.isArray(product.images)) {
      product.images.forEach((image) => {
        const url = typeof image === 'string' ? image : image?.url;
        if (url && !images.includes(url)) images.push(url);
      });
    }

    function render() {
      const groups = optionGroups();
      const state = selectedVariant?.availability || 'out_of_stock';

      content.innerHTML = `
        <div class="fiche-produit-layout">
          <section class="fiche-produit-gallery">
            <div class="fiche-produit-image-principale">
              <img id="fiche-produit-image" src="${esc(images[0] || '')}" alt="${esc(product.title)}">
            </div>
            <div class="fiche-produit-miniatures">
              ${(images.length ? images : ['']).map((image, index) => `
                <button type="button" class="${index === 0 ? 'is-active' : ''}" data-image="${esc(image)}">
                  <img src="${esc(image)}" alt="">
                </button>`).join('')}
            </div>
          </section>

          <section class="fiche-produit-informations">
            <div class="fiche-produit-entete">
              <div>
                <h1>${esc(product.title)}</h1>
                <div class="fiche-produit-stock is-${esc(state)}"><i>✓</i><span>${stockText(state)}</span></div>
              </div>
              <aside>
                <strong id="fiche-produit-prix">${money(selectedVariant?.price || 0)}</strong>
                <button id="fiche-produit-panier" type="button" ${state === 'out_of_stock' ? 'disabled' : ''}>
                  <span aria-hidden="true">🛒</span> AJOUTER AU PANIER
                </button>
              </aside>
            </div>

            <div class="fiche-produit-quantite">
              <label for="fiche-produit-quantite-input">Quantité</label>
              <input id="fiche-produit-quantite-input" type="number" min="1" max="99" value="${quantity}">
            </div>

            <div class="fiche-produit-options">
              ${groups.size ? [...groups.entries()].map(([name, values]) => `
                <section class="fiche-produit-option">
                  <h2>${esc(name)}</h2>
                  <div>${[...values].map((value) => `<button type="button" data-option-name="${esc(name)}" data-option-value="${esc(value)}">${esc(value)}</button>`).join('')}</div>
                </section>`).join('') : variants.length > 1 ? `
                <section class="fiche-produit-option">
                  <h2>Version</h2>
                  <div>${variants.map((variant) => `<button type="button" class="${variant.id === selectedVariant?.id ? 'is-active' : ''}" data-variant-id="${variant.id}">${esc(variant.title)}</button>`).join('')}</div>
                </section>` : ''}
            </div>
          </section>
        </div>`;

      content.querySelectorAll('[data-image]').forEach((button) => {
        button.onclick = () => {
          $('fiche-produit-image').src = button.dataset.image;
          content.querySelectorAll('[data-image]').forEach((item) => item.classList.toggle('is-active', item === button));
        };
      });

      content.querySelectorAll('[data-variant-id]').forEach((button) => {
        button.onclick = () => {
          selectedVariant = variants.find((variant) => String(variant.id) === button.dataset.variantId);
          render();
        };
      });

      content.querySelectorAll('[data-option-name]').forEach((button) => {
        const name = button.dataset.optionName;
        if (selectedOptions.get(name) === button.dataset.optionValue) button.classList.add('is-active');
        button.onclick = () => {
          selectedOptions.set(name, button.dataset.optionValue);
          const match = variants.find((variant) => [...selectedOptions].every(([key, value]) =>
            optionList(variant).some((option) => option.name === key && String(option.value) === value)
          ));
          if (match) selectedVariant = match;
          render();
        };
      });

      $('fiche-produit-quantite-input').onchange = (event) => {
        quantity = Math.max(1, Math.min(99, Number(event.target.value) || 1));
        event.target.value = quantity;
      };

      $('fiche-produit-panier').onclick = () => {
        if (!selectedVariant) return;
        const item = {
          id: `${product.id}:${selectedVariant.id}`,
          product_id: product.id,
          variant_id: selectedVariant.id,
          title: product.title,
          variant_title: selectedVariant.title,
          image_url: product.image_url,
          price: Number(selectedVariant.price || 0),
          quantity
        };
        const cart = JSON.parse(localStorage.getItem('elqods_cart') || '[]');
        const existing = cart.find((entry) => entry.id === item.id);
        existing ? existing.quantity += quantity : cart.push(item);
        localStorage.setItem('elqods_cart', JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent('elqods:add-to-cart', { detail: item }));
        const button = $('fiche-produit-panier');
        button.textContent = '✓ AJOUTÉ AU PANIER';
        setTimeout(() => { button.innerHTML = '<span aria-hidden="true">🛒</span> AJOUTER AU PANIER'; }, 1200);
      };
    }

    render();
  });
})();
