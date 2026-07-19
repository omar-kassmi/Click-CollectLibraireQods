document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. CONFIGURATION & MONTEUR SUPABASE
    // ==========================================
    const SUPABASE_URL = "https://jgfkshsizrtwzqsdrhhp.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_Rdn2yMULDq05BGBV-X-zCA_S934mdEh";
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const RESERVATION_DAYS = 5;
    // Déployez le fichier Apps Script Web App puis collez ici son URL /exec.
    const APP_SCRIPT_UPLOAD_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzZXUQniWcbNXy9t6C9eRZH2BFST42vunh1t6VjDJF6LTUm-7w_F4eivLtB-OY7RMY/exec";

    let allSchoolData = []; 
    let selectedPackItems = []; 
    let isPhotoOrder = false; 
    let selectedPhotoFile = null;
    let selectedSchoolName = null;
    let selectedSchoolLevel = null;
    let selectedListType = null;
    let allSupplyItems = [];
    let selectedSupplyRange = 'standard';

    // Masquage progressif de la Splash Page après 5 secondes
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('opacity-0');
            setTimeout(() => splash.classList.add('hidden'), 500);
        }
    }, 5000);

    // ==========================================
    // 1. GESTION DES ETAPES DE LA TIMELINE (STEPPER)
    // ==========================================
    function updateStepper(step) {
        const dot1 = document.getElementById('step-dot-1');
        const dot2 = document.getElementById('step-dot-2');
        const dot3 = document.getElementById('step-dot-3');
        const txt1 = document.getElementById('step-txt-1');
        const txt2 = document.getElementById('step-txt-2');
        const txt3 = document.getElementById('step-txt-3');

        const activeDot = "w-9 h-9 rounded-full bg-[#E75C25] text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-[#E75C25] transition-all duration-300";
        const inactiveDot = "w-9 h-9 rounded-full bg-white border-2 border-stone-200 text-stone-400 flex items-center justify-center font-bold text-xs transition-all duration-300";

        if(dot1) dot1.className = step >= 1 ? activeDot : inactiveDot;
        if(dot2) dot2.className = step >= 2 ? activeDot : inactiveDot;
        if(dot3) dot3.className = step >= 3 ? activeDot : inactiveDot;

        if(txt1) txt1.className = `text-[11px] font-bold ${step >= 1 ? 'text-[#E75C25]' : 'text-stone-400'} mt-2 font-header`;
        if(txt2) txt2.className = `text-[11px] font-bold ${step >= 2 ? 'text-[#E75C25]' : 'text-stone-400'} mt-2 font-header`;
        if(txt3) txt3.className = `text-[11px] font-bold ${step >= 3 ? 'text-[#E75C25]' : 'text-stone-400'} mt-2 font-header`;
    }

    // ==========================================
    // 2. ROUTAGE DES ONGLETS (TABS)
    // ==========================================
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    const sections = document.querySelectorAll('.content-section');

    window.switchTab = function(targetId) {
        sections.forEach(s => s.classList.add('hidden'));
        const targetSection = document.getElementById(targetId);
        if(targetSection) targetSection.classList.remove('hidden');

        navButtons.forEach(btn => {
            if(btn.getAttribute('data-target') === targetId) {
                btn.className = "nav-tab-btn font-bold text-[#E75C25] px-2";
            } else {
                btn.className = "nav-tab-btn font-medium hover:opacity-80 text-[#E75C25] px-2";
            }
        });
        document.body.classList.toggle('school-order-active', targetId === 'section-rentree');
        requestAnimationFrame(syncSchoolProgressWithHeader);
        if(targetId==='section-rentree'){
            selectedListType=null;isPhotoOrder=false;selectedSchoolName=null;selectedSchoolLevel=null;
            document.querySelectorAll('input[name="fulfillment-method"]').forEach(input=>input.checked=false);
            document.getElementById('choose-official-list')?.classList.remove('is-selected');document.getElementById('choose-official-list')?.setAttribute('aria-pressed','false');
            document.getElementById('btn-custom-list')?.classList.remove('is-selected');document.getElementById('btn-custom-list')?.setAttribute('aria-pressed','false');
            lockFollowingSteps();setOrderFlowStep?setOrderFlowStep(1):updateStepper(1);
        }
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    navButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.getAttribute('data-target'))));

    function syncSchoolProgressWithHeader() {
        const header = document.getElementById('main-header');
        if (!header) return;
        const bottom = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
        document.documentElement.style.setProperty('--main-header-bottom', `${bottom}px`);
    }
    syncSchoolProgressWithHeader();
    window.addEventListener('resize', syncSchoolProgressWithHeader);
    window.addEventListener('scroll', syncSchoolProgressWithHeader, { passive: true });


    // ==========================================
    // 3. RÉCUPÉRATION DES PARAMÈTRES ET DU FOOTER
    // ==========================================
    function applySiteSettings(settings) {
        const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
        const rentreeEnabled = settingsMap.rentree_enabled !== 'false';
        const rentreeTitle = settingsMap.rentree_title || 'Rentrée scolaire';

        document.querySelectorAll('[data-target="section-rentree"]').forEach(btn => {
            btn.classList.toggle('hidden', !rentreeEnabled);
            btn.textContent = rentreeTitle;
        });

        document.querySelectorAll('[onclick*="section-rentree"]').forEach(btn => {
            btn.classList.toggle('hidden', !rentreeEnabled);
        });
    }

    async function initClientData() {
        try {
            const { data: settings } = await supabaseClient.from('site_settings').select('*');
            if (settings) {
                applySiteSettings(settings);
                settings.forEach(s => {
                    if (s.key === 'contact_address') document.querySelectorAll('#info-address, [data-contact-address]').forEach(el => el.innerText = s.value);
                    if (s.key === 'contact_phone') document.querySelectorAll('#info-phone, [data-contact-phone]').forEach(el => el.innerText = s.value);
                    if (s.key === 'contact_email') document.querySelectorAll('#info-email, [data-contact-email]').forEach(el => el.innerText = s.value);
                    if (s.key === 'contact_whatsapp') document.querySelectorAll('#link-whatsapp, [data-contact-whatsapp]').forEach(el => el.href = `https://wa.me/${s.value}`);
                });
            }
        } catch (err) {}

        try {
            const { data: lists } = await supabaseClient.from('school_lists').select('*');
            if (lists) {
                allSchoolData = lists;
                populateSchoolsDropdown();
            }
        } catch (err) {}
        await loadIndependentSupplyItems();
    }

    async function loadIndependentSupplyItems() {
        const container = document.getElementById('independent-supply-items');
        if (!container) return;
        container.innerHTML = '<p class="flow-muted">Chargement des fournitures…</p>';
        try {
            let response = await supabaseClient.from('supply_items').select('*').order('name', { ascending: true });
            if (response.error) throw response.error;
            allSupplyItems = (response.data || []).filter(item => item.is_active !== false);
            renderIndependentSupplyItems();
        } catch (error) {
            console.error('Chargement de la liste fourniture impossible :', error);
            container.innerHTML = '<p class="flow-muted">La liste fourniture est momentanément indisponible.</p>';
        }
    }

    function getSupplyUnitPrice(item) {
        const raw = selectedSupplyRange === 'quality' ? item.quality_price : item.standard_price;
        return Number.parseFloat(raw) || 0;
    }

    function renderIndependentSupplyItems() {
        const container = document.getElementById('independent-supply-items');
        if (!container) return;
        if (!allSupplyItems.length) {
            container.innerHTML = '<p class="flow-muted">Aucune fourniture active configurée dans l’administration.</p>';
            updateSupplyTotal();
            return;
        }
        container.innerHTML = allSupplyItems.map(item => {
            const price = getSupplyUnitPrice(item);
            return `<label class="supply-item-row">
                <input type="checkbox" class="supply-item-checkbox" data-id="${item.id}" data-name="${String(item.name || '').replace(/"/g, '&quot;')}">
                <span class="supply-item-name">${item.name || 'Fourniture'}</span>
                <span class="item-price-chip">${price.toFixed(2)} DH</span>
            </label>`;
        }).join('');
        container.querySelectorAll('.supply-item-checkbox').forEach(input => input.addEventListener('change', () => {
            updateSupplyTotal();
            updateFinalSummary();
        }));
        updateSupplyTotal();
    }

    function updateSupplyTotal() {
        const totalBox = document.getElementById('supply-total-price');
        if (!totalBox) return;
        let total = 0;
        document.querySelectorAll('.supply-item-checkbox:checked').forEach(input => {
            const item = allSupplyItems.find(entry => String(entry.id) === String(input.dataset.id));
            if (item) total += getSupplyUnitPrice(item);
        });
        totalBox.innerText = `${total.toFixed(2)} DH`;
    }

    document.querySelectorAll('input[name="supply-range"]').forEach(input => {
        input.addEventListener('change', () => {
            selectedSupplyRange = input.value;
            const checkedIds = new Set(Array.from(document.querySelectorAll('.supply-item-checkbox:checked')).map(box => String(box.dataset.id)));
            renderIndependentSupplyItems();
            document.querySelectorAll('.supply-item-checkbox').forEach(box => box.checked = checkedIds.has(String(box.dataset.id)));
            updateSupplyTotal();
            updateFinalSummary();
        });
    });

    function populateSchoolsDropdown() {
        const selectEcole = document.getElementById('select-ecole');
        const buttonsBox = document.getElementById('school-logo-buttons');
        if (!selectEcole) return;
        selectEcole.innerHTML = '<option value="">-- Choisir une école --</option>';
        const schoolMap = new Map();
        allSchoolData.forEach(item => {
            if (!item.school_name) return;
            if (!schoolMap.has(item.school_name)) schoolMap.set(item.school_name, item.school_logo_url || '');
            if (!schoolMap.get(item.school_name) && item.school_logo_url) schoolMap.set(item.school_name, item.school_logo_url);
        });
        [...schoolMap.keys()].forEach(school => {
            const opt = document.createElement('option');
            opt.value = school; opt.innerText = school;
            selectEcole.appendChild(opt);
        });
        if (!buttonsBox) return;
        buttonsBox.innerHTML = [...schoolMap.entries()].map(([school, logo]) => `
            <button type="button" class="school-logo-button" data-school="${school.replace(/"/g, '&quot;')}">
                <span class="school-logo-visual">${logo ? `<img src="${logo}" alt="Logo ${school}" onerror="this.parentElement.innerHTML='<span class=school-logo-fallback>${school.charAt(0).toUpperCase()}</span>'">` : `<span class="school-logo-fallback">${school.charAt(0).toUpperCase()}</span>`}</span>
                <strong>${school}</strong>
            </button>`).join('') || '<p class="flow-muted">Aucun établissement configuré.</p>';
        buttonsBox.querySelectorAll('.school-logo-button').forEach(button => {
            button.addEventListener('click', () => selectSchoolFromButton(button.dataset.school));
        });
    }

    function selectSchoolFromButton(schoolName) {
        const selectEcole = document.getElementById('select-ecole');
        const selectNiveau = document.getElementById('select-niveau');
        const levelBox = document.getElementById('school-level-buttons');
        const levelBlock = document.getElementById('school-level-block');
        const btnLoadPack = document.getElementById('btn-load-pack');
        if (!selectEcole || !selectNiveau || !levelBox) return;
        selectEcole.value = schoolName;
        selectedSchoolName = schoolName;
        selectedSchoolLevel = null;
        document.querySelectorAll('.school-logo-button').forEach(btn => btn.classList.toggle('is-selected', btn.dataset.school === schoolName));
        selectNiveau.innerHTML = '<option value="">-- Choisir le niveau --</option>';
        const lists = allSchoolData.filter(item => item.school_name === schoolName && item.level);
        lists.forEach(list => {
            const opt = document.createElement('option');
            opt.value = list.id; opt.innerText = list.level;
            selectNiveau.appendChild(opt);
        });
        selectNiveau.disabled = false;
        levelBox.innerHTML = lists.map(list => `<button type="button" class="school-level-button" data-list-id="${list.id}" data-level="${list.level.replace(/"/g, '&quot;')}">${list.level}</button>`).join('');
        levelBox.querySelectorAll('.school-level-button').forEach(button => button.addEventListener('click', () => {
            const listId = button.dataset.listId;
            selectNiveau.value = listId;
            selectedSchoolLevel = button.dataset.level;
            levelBox.querySelectorAll('.school-level-button').forEach(btn => btn.classList.toggle('is-selected', btn === button));
            btnLoadPack?.classList.remove('hidden');
            setTimeout(() => btnLoadPack?.click(), 180);
        }));
        levelBlock?.classList.remove('hidden');
        btnLoadPack?.classList.add('hidden');
    }

    document.getElementById('select-ecole').addEventListener('change', (e) => {
        const schoolName = e.target.value;
        if (schoolName && !document.querySelector('.school-logo-button.is-selected')) { selectSchoolFromButton(schoolName); return; }
        const selectNiveau = document.getElementById('select-niveau');
        const btnLoadPack = document.getElementById('btn-load-pack');
        if (!selectNiveau) return;
        selectNiveau.innerHTML = '<option value="">-- Choisir le niveau --</option>';
        if (btnLoadPack) btnLoadPack.classList.add('hidden');
        if (!schoolName) { selectNiveau.disabled = true; return; }

        const filteredLevels = allSchoolData.filter(item => item.school_name === schoolName);
        filteredLevels.forEach(list => {
            if (list.level) {
                const opt = document.createElement('option');
                opt.value = list.id; opt.innerText = list.level;
                selectNiveau.appendChild(opt);
            }
        });
        selectNiveau.disabled = false;
    });

    document.getElementById('select-niveau').addEventListener('change', (e) => {
        const packId = e.target.value;
        document.querySelectorAll('.school-level-button').forEach(btn => btn.classList.toggle('is-selected', String(btn.dataset.listId) === String(packId)));
        const btnLoadPack = document.getElementById('btn-load-pack');
        if (btnLoadPack) {
            if (packId) btnLoadPack.classList.remove('hidden');
            else btnLoadPack.classList.add('hidden');
        }
    });

    function selectedFulfillment() {
        return document.querySelector('input[name="fulfillment-method"]:checked')?.value || null;
    }
    function updateDeliveryFields() {
        const delivery = selectedFulfillment() === 'delivery';
        const fields = document.getElementById('delivery-address-fields');
        if (!fields) return;
        fields.classList.toggle('hidden', !delivery);
        fields.querySelectorAll('input, textarea').forEach(field => field.required = delivery && ['delivery-address','delivery-city'].includes(field.id));
    }
    function updateFinalSummary() {
        const lines = document.getElementById('summary-lines');
        const total = document.getElementById('summary-total');
        if (!lines || !total) return;

        const fulfillment = selectedFulfillment() === 'delivery' ? 'Livraison' : 'Retrait au magasin';
        const schoolItems = Array.from(document.querySelectorAll('.pack-item-checkbox:checked'));
        const supplyItems = Array.from(document.querySelectorAll('.supply-item-checkbox:checked'));
        const schoolCount = schoolItems.length;
        const supplyCount = supplyItems.length;
        const schoolSubtotal = Number.parseFloat(document.getElementById('pack-total-price')?.innerText || '0') || 0;
        const supplySubtotal = Number.parseFloat(document.getElementById('supply-total-price')?.innerText || '0') || 0;
        const grandTotal = schoolSubtotal + supplySubtotal;

        const countLabel = (count) => `${count} article${count > 1 ? 's' : ''}`;
        const details = isPhotoOrder
            ? ''
            : `<div class="summary-row"><span>École</span><b>${selectedSchoolName || '-'}</b></div>
               <div class="summary-row"><span>Niveau</span><b>${selectedSchoolLevel || '-'}</b></div>`;
        const quantities = isPhotoOrder
            ? `<div class="summary-row summary-count-row"><span>Liste personnelle</span><b>Image à importer</b></div>`
            : `<div class="summary-row summary-count-row"><span>Articles de la liste</span><b>${countLabel(schoolCount)}</b></div>
               <div class="summary-row summary-count-row"><span>Fournitures choisies</span><b>${countLabel(supplyCount)}</b></div>`;
        const subtotals = isPhotoOrder
            ? `<div class="summary-row summary-subtotal-row"><span>Montant</span><b>Sur devis</b></div>`
            : `<div class="summary-row summary-subtotal-row"><span>Sous-total liste</span><b>${schoolSubtotal.toFixed(2)} DH</b></div>
               <div class="summary-row summary-subtotal-row"><span>Sous-total fournitures</span><b>${supplySubtotal.toFixed(2)} DH</b></div>`;

        lines.innerHTML = `
            <div class="summary-group summary-order-info">
                <div class="summary-row"><span>Mode de retrait</span><b>${fulfillment}</b></div>
                <div class="summary-row"><span>Type de liste</span><b>${isPhotoOrder ? 'Ma propre liste' : 'Liste officielle du site'}</b></div>
                ${details}
            </div>
            <div class="summary-group summary-quantities">${quantities}</div>
            <div class="summary-group summary-subtotals">${subtotals}</div>
        `;
        total.innerText = isPhotoOrder ? 'Sur devis' : `${grandTotal.toFixed(2)} DH`;
    }
    function unlockAndScroll(id,step){
        const el=document.getElementById(id);if(!el)return;el.classList.remove('hidden');el.setAttribute('aria-hidden','false');setOrderFlowStep(step);el.classList.remove('flow-unlock');void el.offsetWidth;el.classList.add('flow-unlock');setTimeout(()=>{const o=(document.getElementById('main-header')?.offsetHeight||72)+18;window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+window.scrollY-o),behavior:'smooth'});},70);
    }
    function lockFollowingSteps(){['school-selection-view','pack-details-view','checkout-form-container'].forEach(id=>{const el=document.getElementById(id);el?.classList.add('hidden');el?.setAttribute('aria-hidden','true');});}
    function scrollBackTo(element) {
        if (!element) return;
        const offset = (document.getElementById('main-header')?.offsetHeight || 72) + 18;
        window.scrollTo({
            top: Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset),
            behavior: 'smooth'
        });
    }

    document.getElementById('flow-back-step-2')?.addEventListener('click', () => {
        document.getElementById('school-selection-view')?.classList.add('hidden');
        document.getElementById('pack-details-view')?.classList.add('hidden');
        document.getElementById('checkout-form-container')?.classList.add('hidden');
        setOrderFlowStep(1);
        scrollBackTo(document.getElementById('options-container'));
    });

    document.getElementById('flow-back-step-3')?.addEventListener('click', () => {
        document.getElementById('pack-details-view')?.classList.add('hidden');
        document.getElementById('checkout-form-container')?.classList.add('hidden');
        setOrderFlowStep(2);
        scrollBackTo(document.getElementById('school-selection-view'));
    });

    document.getElementById('flow-back-step-4')?.addEventListener('click', () => {
        document.getElementById('checkout-form-container')?.classList.add('hidden');
        if (isPhotoOrder) {
            setOrderFlowStep(1);
            scrollBackTo(document.getElementById('options-container'));
        } else {
            setOrderFlowStep(3);
            scrollBackTo(document.getElementById('pack-details-view'));
        }
    });

    function advanceFirstViewIfComplete(){
        if(!selectedFulfillment()||!selectedListType)return;
        if(selectedListType==='official'){isPhotoOrder=false;unlockAndScroll('school-selection-view',2);}
        else{isPhotoOrder=true;updateDeliveryFields();updateFinalSummary();unlockAndScroll('checkout-form-container',4);}
    }
    document.querySelectorAll('input[name="fulfillment-method"]').forEach(input=>input.addEventListener('change',()=>{updateDeliveryFields();advanceFirstViewIfComplete();}));
    document.getElementById('choose-official-list')?.addEventListener('click',()=>{
        selectedListType='official';isPhotoOrder=false;lockFollowingSteps();
        const official=document.getElementById('choose-official-list'),custom=document.getElementById('btn-custom-list');official?.classList.add('is-selected');official?.setAttribute('aria-pressed','true');custom?.classList.remove('is-selected');custom?.setAttribute('aria-pressed','false');advanceFirstViewIfComplete();
    });
    const statusText=document.getElementById('upload-status-text');
    const btnCustomList=document.getElementById('btn-custom-list');
    btnCustomList?.addEventListener('click',()=>{
        selectedListType='custom';isPhotoOrder=true;selectedPhotoFile=null;lockFollowingSteps();
        const official=document.getElementById('choose-official-list');official?.classList.remove('is-selected');official?.setAttribute('aria-pressed','false');btnCustomList.classList.add('is-selected');btnCustomList.setAttribute('aria-pressed','true');advanceFirstViewIfComplete();
    });
    document.getElementById('btn-back-to-list')?.addEventListener('click',()=>{
        document.getElementById('checkout-form-container')?.classList.add('hidden');
        const target=isPhotoOrder?document.getElementById('options-container'):document.getElementById('pack-details-view');if(target){const o=(document.getElementById('main-header')?.offsetHeight||72)+18;window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-o),behavior:'smooth'});}
    });

    // ==========================================
    // 5. CLIC SUR "SUIVANT"
    // ==========================================
    const btnLoadPackEl = document.getElementById('btn-load-pack');
    if (btnLoadPackEl) {
        btnLoadPackEl.addEventListener('click', () => {
            const packId = document.getElementById('select-niveau').value;
            if (!packId) return;

            const selectedPack = allSchoolData.find(item => String(item.id) === String(packId));
            if (!selectedPack) return;

            const schoolDisplay = document.getElementById('display-school-name');
            const levelDisplay = document.getElementById('display-level-name');
            if (schoolDisplay) schoolDisplay.innerText = selectedPack.school_name;
            if (levelDisplay) levelDisplay.innerText = selectedPack.level;

            isPhotoOrder = false; 
            let parsedItems = [];
            const rawData = selectedPack.items;

            try {
                let rawArray = [];
                if (typeof rawData === 'string') {
                    rawArray = JSON.parse(rawData);
                } else if (Array.isArray(rawData) && rawData.length > 0) {
                    let first = rawData[0];
                    if (typeof first === 'string' && first.trim().startsWith('[')) {
                        rawArray = JSON.parse(first);
                    } else {
                        rawArray = rawData;
                    }
                }

                parsedItems = rawArray.map((item, index) => {
                    if (item && typeof item === 'object' && item.name) {
                        let extractedPrice = 0;
                        if (item.price !== undefined && item.price !== null) {
                            extractedPrice = item.price;
                        } else if (item.Price !== undefined && item.Price !== null) {
                            extractedPrice = item.Price;
                        }

                        return {
                            id: item.id || "item-" + index + "-" + Math.random().toString(36).substr(2, 3),
                            name: item.name,
                            category: item.category || "Fournitures",
                            price: parseFloat(extractedPrice) || 0,
                            availability: item.availability || 'available'
                        };
                    } else if (typeof item === 'string') {
                        const cleanText = item.replace(/<\/?[^>]+(>|$)/g, "").trim();
                        if (cleanText && cleanText !== "undefined") {
                            return { id: "leg-" + index, name: cleanText, category: "Fournitures", price: 0 };
                        }
                    }
                    return null;
                }).filter(Boolean);

            } catch (err) {
                console.error("Échec critique du parsing des fournitures :", err);
            }

            selectedPackItems = parsedItems;

            renderPackChecklist(selectedPackItems);
            calculateTotalOrderPrice(); 
            
            updateFinalSummary();
            unlockAndScroll('pack-details-view',3);
        });
    }

    function renderPackChecklist(items) {
        const container = document.getElementById('liste-officielle-items');
        if (!container) return;
        container.innerHTML = '';

        const grouped = {};
        items.forEach(item => {
            const cat = item.category || "Fournitures";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });

        Object.keys(grouped).forEach(category => {
            const block = document.createElement('div');
            block.className = "space-y-3 pb-5 border-b border-stone-100 last:border-none";
            
            const categoryHeader = document.createElement('div');
            categoryHeader.className = "flex items-center justify-between mb-2.5";
            categoryHeader.innerHTML = `<h5 class="font-header font-black text-sm text-[#E75C25] tracking-tight">${category}</h5>`;
            block.appendChild(categoryHeader);

            const grid = document.createElement('div');
            grid.className = "grid grid-cols-1 gap-2.5";
            block.appendChild(grid);

            grouped[category].forEach(item => {
                const row = document.createElement('label');
                const isOutOfStock = item.availability === 'out_of_stock';
                const isAlmostOut = item.availability === 'almost_out';
                const availabilityText = isOutOfStock ? 'Out of stock' : isAlmostOut ? 'Almost out' : '';
                row.innerHTML = `
                    <div class="flex items-center gap-3 flex-grow min-w-0">
                        <input type="checkbox" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" ${isOutOfStock ? 'disabled' : 'checked'} class="pack-item-checkbox w-4 h-4 rounded text-[#E75C25] accent-[#E75C25] focus:ring-0 cursor-pointer flex-shrink-0">
                        <span class="text-xs font-bold text-stone-800 tracking-tight truncate">${item.name}</span>
                    </div>
                    <span class="item-price-chip ${isOutOfStock ? 'text-red-700 bg-red-50 border-red-100' : 'text-emerald-700 bg-emerald-50 border-emerald-200/50'}">${availabilityText || item.price.toFixed(2) + ' DH'}</span>
                `;

                const box = row.querySelector('input');
                const syncCardStyle = () => {
                    if (isOutOfStock) {
                        row.className = "flex items-center justify-between gap-3 bg-red-50/40 opacity-60 px-4 py-3.5 rounded-xl border border-dashed border-red-100 cursor-not-allowed transition-all duration-300 select-none";
                    } else if (!box.checked) {
                        row.className = "flex items-center justify-between gap-3 bg-stone-50/50 opacity-40 px-4 py-3.5 rounded-xl border border-dashed border-stone-200 cursor-pointer transition-all duration-300 select-none scale-[0.98]";
                    } else {
                        row.className = "flex items-center justify-between gap-3 bg-gradient-to-r from-white to-stone-50/[0.02] px-4 py-3.5 rounded-xl border border-stone-200 hover:border-orange-300 cursor-pointer transition-all duration-200 shadow-sm select-none";
                    }
                    if(!isPhotoOrder) calculateTotalOrderPrice(); 
                };

                box.addEventListener('change', syncCardStyle);
                syncCardStyle();
                grid.appendChild(row);
            });
            container.appendChild(block);
        });
    }

    function calculateTotalOrderPrice() {
        if(isPhotoOrder) return;
        const checkboxes = document.querySelectorAll('.pack-item-checkbox:checked');
        let total = 0;
        checkboxes.forEach(cb => {
            total += parseFloat(cb.getAttribute('data-price')) || 0;
        });
        const totalDisplay = document.getElementById('pack-total-price');
        if (totalDisplay) totalDisplay.innerText = total.toFixed(2);
        updateFinalSummary();
    }

    // NAVIGATION DU PANIER DE COMMANDE
    const btnChangeChoice=document.getElementById('btn-change-choice-top');
    btnChangeChoice?.addEventListener('click',()=>{document.getElementById('pack-details-view')?.classList.add('hidden');const t=document.getElementById('school-selection-view');if(t){const o=(document.getElementById('main-header')?.offsetHeight||72)+18;window.scrollTo({top:Math.max(0,t.getBoundingClientRect().top+window.scrollY-o),behavior:'smooth'});}});
    const btnNextToForm=document.getElementById('btn-next-to-form');
    btnNextToForm?.addEventListener('click',()=>{updateDeliveryFields();updateFinalSummary();unlockAndScroll('checkout-form-container',4);});

    function generateQrCodeValue() {
        return `EQ-QR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    }

    function buildQrPayload(qrCode) {
        const url = new URL('index.html', window.location.href);
        url.searchParams.set('tab', 'section-suivi');
        url.searchParams.set('qr', qrCode);
        return url.toString();
    }

    function buildUploadWebAppUrl(orderData, clientName, clientPhone, clientEmail) {
        if (!APP_SCRIPT_UPLOAD_WEBAPP_URL || APP_SCRIPT_UPLOAD_WEBAPP_URL.includes('PASTE_APPS_SCRIPT')) {
            throw new Error("URL Apps Script Web App non configurée dans app.js.");
        }
        const successUrl = new URL('success.html', window.location.href);
        successUrl.searchParams.set('order', orderData.numero_commande || '');
        successUrl.searchParams.set('name', clientName || '');
        successUrl.searchParams.set('qr', orderData.qr_code || '');

        const url = new URL(APP_SCRIPT_UPLOAD_WEBAPP_URL);
        url.searchParams.set('order_id', orderData.id || '');
        url.searchParams.set('reference', orderData.numero_commande || '');
        url.searchParams.set('name', clientName || '');
        url.searchParams.set('phone', clientPhone || '');
        url.searchParams.set('email', clientEmail || '');
        url.searchParams.set('success_url', successUrl.toString());
        return url.toString();
    }


    function setOrderFlowStep(step, scrollTargetId = null) {
        const rentree = document.getElementById('section-rentree');
        if (rentree) rentree.dataset.flowStep = String(step);
        const progress = document.getElementById('school-flow-progress-fill');
        if (progress) progress.style.width = `${Math.max(1, Math.min(3, step)) / 3 * 100}%`;
        updateStepper(step);
        const title = document.getElementById('flow-guide-title');
        const text = document.getElementById('flow-guide-text');
        const copy = {
            1: ['Étape 1 — choisissez votre parcours', 'Choisissez une liste officielle ou votre propre liste. Ensuite, la page glisse automatiquement vers l’étape suivante.'],
            2: ['Étape 2 — ajustez votre sac', 'Décochez les articles inutiles, vérifiez le montant estimé, puis continuez vers vos coordonnées.'],
            3: ['Étape 3 — validez vos informations', 'Renseignez vos coordonnées. La page vous guidera vers la confirmation ou l’import photo.']
        };
        if (title && copy[step]) title.innerText = copy[step][0];
        if (text && copy[step]) text.innerText = copy[step][1];
        if (scrollTargetId) {
            setTimeout(() => document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 160);
        }
    }

    // ==========================================
    // 6. SOUMISSION DU FORMULAIRE DE COMMANDE
    // ==========================================
    const orderForm = document.getElementById('order-submit-form');
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalButtonText = submitButton ? submitButton.textContent : '🚀 Valider ma commande';
            
            const clientName = document.getElementById('client-name').value.trim();
            const clientPhone = document.getElementById('client-phone').value.trim();
            const clientEmail = document.getElementById('client-email') ? document.getElementById('client-email').value.trim() : '';
            
            let payloadItems = [];

            if (!clientName || normalizePhone(clientPhone).length < 10) {
                alert("Veuillez vérifier le nom complet et renseigner un numéro de téléphone valide.");
                return;
            }

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "⏳ Envoi en cours...";
                submitButton.classList.add('opacity-70', 'cursor-not-allowed');
            }

            try {
                if (isPhotoOrder) {
                    payloadItems = [{
                        name: "Commande par photo",
                        type: "photo_upload",
                        storage_provider: "google_drive_webapp",
                        upload_status: "pending_webapp_upload"
                    }];
                } else {
                    const checkedBoxes = document.querySelectorAll('.pack-item-checkbox:checked');
                    payloadItems = Array.from(checkedBoxes).map(cb => ({
                        id: cb.getAttribute('data-id'),
                        name: cb.getAttribute('data-name'),
                        price: parseFloat(cb.getAttribute('data-price')) || 0,
                        school_name: selectedSchoolName,
                        school_level: selectedSchoolLevel,
                        item_source: 'school_list'
                    }));
                    const selectedSupplies = Array.from(document.querySelectorAll('.supply-item-checkbox:checked')).map(cb => {
                        const item = allSupplyItems.find(entry => String(entry.id) === String(cb.dataset.id));
                        return item ? {
                            id: item.id,
                            name: item.name,
                            category: item.category || 'Fournitures',
                            price: getSupplyUnitPrice(item),
                            supply_range: selectedSupplyRange,
                            item_source: 'independent_supply'
                        } : null;
                    }).filter(Boolean);
                    payloadItems.push(...selectedSupplies);

                    if (payloadItems.length === 0) {
                        alert("Veuillez sélectionner au moins un article de la liste officielle.");
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = originalButtonText;
                            submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
                        }
                        return;
                    }
                }

                const totalAmount = isPhotoOrder ? 0 : payloadItems.reduce((sum, item) => sum + (item.price || 0), 0);
                const qrCodeValue = generateQrCodeValue();
                const qrPayload = buildQrPayload(qrCodeValue);
                const orderPayload = {
                    client_name: clientName,
                    client_phone: clientPhone,
                    client_email: clientEmail || null,
                    items: payloadItems,
                    status: isPhotoOrder ? 'draft_google_form' : 'new',
                    reservation_deadline: getReservationDeadline(),
                    total_amount: totalAmount,
                    payment_method: 'cash_pickup',
                    payment_status: 'unpaid',
                    order_instructions: document.getElementById('order-instructions')?.value.trim() || null,
                    qr_code: qrCodeValue,
                    qr_payload: qrPayload
                };

                // REQUÊTE CORRIGÉE : On extrait explicitement la valeur générée par le trigger SQL
                const { data, error } = await supabaseClient
                    .from('orders')
                    .insert([orderPayload])
                    .select('id, numero_commande, qr_code, qr_payload') 
                    .single();
                
                if (error) throw error;

                if (isPhotoOrder && data && data.numero_commande) {
                    window.location.href = buildUploadWebAppUrl(data, clientName, clientPhone, clientEmail);
                    return;
                }
                if (data && data.id) {
                    await supabaseClient.from('order_history').insert([{ order_id: data.id, status: 'new' }]);
                }
                if (data && data.numero_commande) {
                    const orderReference = data.numero_commande;
                    const encodedName = encodeURIComponent(clientName);
                    const encodedQr = encodeURIComponent(data.qr_code || qrCodeValue);
                    window.location.href = `success.html?order=${orderReference}&name=${encodedName}&qr=${encodedQr}`;
                } else {
                    window.location.href = 'success.html';
                }

            } catch (err) {
                console.error("Erreur lors de la validation :", err);
                alert("Une erreur est survenue lors de l'envoi de la commande : " + err.message);
                
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
                }
            }
        });
    }

    function normalizePhone(phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        if (digits.startsWith('212')) return digits;
        if (digits.startsWith('0')) return `212${digits.slice(1)}`;
        return digits;
    }

    // ==========================================
    // 7. SUIVI DE COMMANDE CLIENT AVANCÉ + QR CODE + TIMELINE HORIZONTALE
    // ==========================================
    function parseTrackingItems(items) {
        if (!items) return [];
        if (Array.isArray(items)) return items;
        try { return JSON.parse(items); } catch { return []; }
    }

    function normalizeTrackingStatus(status) {
        return ({ en_attente: 'new', preparation: 'preparing', prete: 'ready', notifie: 'notified' })[status] || status || 'new';
    }

    function formatTrackingDate(value) {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    async function urlToDataUrl(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    async function makeQrDataUrl(payload) {
        if (!payload) return '';
        if (window.QRCode && typeof QRCode.toCanvas === 'function') {
            const canvas = document.createElement('canvas');
            await QRCode.toCanvas(canvas, payload, { width: 260, margin: 2, color: { dark: '#0D0D0D', light: '#FFFFFF' } });
            return canvas.toDataURL('image/png');
        }
        return await urlToDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(payload)}`);
    }

    async function downloadOrderPdf(order, items, history, qrPayload) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert("La librairie PDF n'est pas chargée. Vérifiez votre connexion internet puis réessayez.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 16;
        const total = Number(order.total_amount ?? items.reduce((sum, item) => sum + (Number(item.price) || 0), 0));
        const statusLabel = ({ new: 'Commande reçue', preparing: 'En préparation', ready: 'Prête au retrait', notified: 'Prête au retrait', notifie: 'Prête au retrait', collected: 'Commande récupérée', cancelled: 'Commande annulée', expired: 'Réservation expirée', preparation: 'En préparation', prete: 'Prête au retrait', en_attente: 'Commande reçue' })[order.status] || order.status || 'Commande reçue';
        let y = 18;

        try {
            const logo = await urlToDataUrl('images/logo.png');
            doc.addImage(logo, 'PNG', margin, 10, 24, 24);
        } catch (_) {}
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(231, 92, 37);
        doc.text('Librairie & Papeterie El Qods', margin + 32, 18);
        doc.setFontSize(10);
        doc.setTextColor(90, 90, 90);
        doc.text('Bon de commande / réservation', margin + 32, 25);
        doc.text('Berkane - Maroc', margin + 32, 31);

        try {
            const qrData = await makeQrDataUrl(qrPayload || order.qr_payload || buildQrPayload(order.qr_code || order.numero_commande));
            doc.addImage(qrData, 'PNG', pageW - margin - 34, 10, 34, 34);
        } catch (_) {}

        y = 52;
        doc.setDrawColor(231, 92, 37);
        doc.line(margin, y, pageW - margin, y);
        y += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(20, 20, 20);
        doc.text(`Commande ${order.numero_commande || '-'}`, margin, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(70, 70, 70);
        doc.text(`Nom : ${order.client_name || '-'}`, margin, y); y += 6;
        doc.text(`Téléphone : ${order.client_phone || '-'}`, margin, y); y += 6;
        doc.text(`E-mail : ${order.client_email || '-'}`, margin, y); y += 6;
        doc.text(`Statut : ${statusLabel}`, margin, y); y += 6;
        doc.text(`Paiement : ${(order.payment_status || 'unpaid') === 'paid' ? 'Payé' : 'Non payé'}`, margin, y); y += 6;
        doc.text(`Code QR : ${order.qr_code || '-'}`, margin, y); y += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(231, 92, 37);
        doc.text('Articles commandés', margin, y); y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        if (!items.length || items.some(i => i.type === 'photo_upload' || i.url || i.photo_url)) {
            doc.text('Commande par photo : la liste sera préparée manuellement par la boutique.', margin, y); y += 7;
        } else {
            items.forEach((item, index) => {
                if (y > 260) { doc.addPage(); y = 20; }
                const name = `${index + 1}. ${item.name || '-'}`;
                const price = `${(Number(item.price) || 0).toFixed(2)} DH`;
                doc.text(name.substring(0, 90), margin, y);
                doc.text(price, pageW - margin - 28, y, { align: 'right' });
                y += 6;
            });
        }
        y += 5;
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, pageW - margin, y); y += 9;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(231, 92, 37);
        doc.text(`Total à payer : ${total > 0 ? total.toFixed(2) + ' DH' : 'Sur devis'}`, margin, y);
        y += 12;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Suivi de progression', margin, y); y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70, 70, 70);
        const labels = { new: 'Commande reçue', preparing: 'Préparation', ready: 'Prête au retrait', notified: 'Prête au retrait', notifie: 'Prête au retrait', collected: 'Récupérée' };
        (history || []).slice(0, 8).forEach(event => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`• ${labels[normalizeTrackingStatus(event.status)] || event.status} - ${formatTrackingDate(event.created_at)}`, margin, y);
            y += 6;
        });

        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Merci de présenter ce document ou votre QR code lors du retrait en boutique.', margin, 287);
        doc.save(`commande-${order.numero_commande || order.qr_code || 'elqods'}.pdf`);
    }

    function renderQrToCanvas(canvasId, payload, filename, orderData) {
        setTimeout(() => {
            const canvas = document.getElementById(canvasId);
            const btn = document.getElementById(`download-${canvasId}`);
            if (!canvas || !payload) return;
            const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=190x190&margin=10&data=${encodeURIComponent(payload)}`;
            if (window.QRCode && typeof QRCode.toCanvas === 'function') {
                QRCode.toCanvas(canvas, payload, { width: 180, margin: 2, color: { dark: '#0D0D0D', light: '#FFFFFF' } });
            } else {
                const img = document.createElement('img');
                img.src = fallbackUrl;
                img.alt = 'QR Code';
                img.className = 'bg-white p-2 rounded-xl shadow-sm w-[190px] h-[190px] object-contain';
                canvas.replaceWith(img);
            }
            if (btn) btn.addEventListener('click', () => downloadOrderPdf(orderData.order, orderData.items, orderData.history, payload));
        }, 100);
    }


    async function inferSchoolFromItems(items) {
        if (!items || !items.length) return { school: '', level: '' };
        const first = items.find(i => i.school_name || i.school_level) || {};
        if (first.school_name || first.school_level) {
            return { school: first.school_name || '', level: first.school_level || '' };
        }
        try {
            const names = new Set(items.map(i => String(i.name || '').trim().toLowerCase()).filter(Boolean));
            if (!names.size) return { school: '', level: '' };
            const { data: lists } = await supabaseClient.from('school_lists').select('*');
            let best = { score: 0, school: '', level: '' };
            (lists || []).forEach(list => {
                const parsed = parseTrackingItems(list.items && Array.isArray(list.items) && list.items.length === 1 ? list.items[0] : list.items);
                const score = parsed.reduce((sum, item) => names.has(String(item.name || item).trim().toLowerCase()) ? sum + 1 : sum, 0);
                if (score > best.score) best = { score, school: list.school_name || '', level: list.level || '' };
            });
            return best.score > 0 ? { school: best.school, level: best.level } : { school: '', level: '' };
        } catch (err) {
            console.warn('Impossible de déduire école/niveau', err);
            return { school: '', level: '' };
        }
    }

    function buildOrderTimeline(order, history = []) {
        const regularSteps = [
            { key: 'new', label: 'Commande' },
            { key: 'preparing', label: 'Préparation' },
            { key: 'ready', label: 'Prête au retrait' },
            { key: 'collected', label: 'Récupérée' }
        ];
        const normalizedStatus = normalizeTrackingStatus(order.status);
        const isCancelled = normalizedStatus === 'cancelled';
        const eventMap = { new: order.created_at || order.inserted_at || null };
        let furthestRegularIndex = 0;
        history.forEach(event => {
            let key = normalizeTrackingStatus(event.status);
            if (key === 'notified') key = 'ready';
            if (!eventMap[key]) eventMap[key] = event.created_at;
            const regularIndex = regularSteps.findIndex(step => step.key === key);
            if (regularIndex > furthestRegularIndex) furthestRegularIndex = regularIndex;
        });
        if (!isCancelled) {
            let currentIndex = regularSteps.findIndex(step => step.key === normalizedStatus);
            if (normalizedStatus === 'notified') currentIndex = 2;
            if (currentIndex < 0) currentIndex = 0;
            currentIndex = Math.max(currentIndex, furthestRegularIndex);
            const fillWidth = (currentIndex / (regularSteps.length - 1)) * 100;
            return `<div class="timeline-line"><div class="tracking-line-base"><div class="tracking-line-fill" style="width:${fillWidth}%"></div></div>${regularSteps.map((step, index) => `<div class="timeline-step ${index < currentIndex ? 'done' : index === currentIndex ? 'active' : ''}"><div class="timeline-dot">✓</div><h5>${step.label}</h5><p>${eventMap[step.key] ? formatTrackingDate(eventMap[step.key]) : '-'}</p></div>`).join('')}</div>`;
        }
        const cancelledAt = order.cancelled_at || eventMap.cancelled || order.updated_at || new Date().toISOString();
        const reachedSteps = regularSteps.slice(0, furthestRegularIndex + 1);
        const cancellationSource = order.cancellation_source || 'store';
        const cancellationMessage = cancellationSource === 'customer'
            ? `Vous avez annulé cette commande le <strong>${formatTrackingDate(cancelledAt)}</strong>. Vous pouvez passer une nouvelle commande à tout moment.`
            : `Cette commande a été annulée par le magasin le <strong>${formatTrackingDate(cancelledAt)}</strong>. Contactez le magasin pour plus d’informations ou passez une nouvelle commande.`;
        const cancelCount = reachedSteps.length + 1;
        return `<div class="timeline-line is-cancelled" style="--cancel-count:${cancelCount}"><div class="tracking-line-base"><div class="tracking-line-fill" style="width:${reachedSteps.length > 1 ? ((reachedSteps.length - 1) / reachedSteps.length) * 100 : 0}%"></div></div><div class="timeline-cancelled-segment"></div>${reachedSteps.map(step => `<div class="timeline-step done"><div class="timeline-dot">✓</div><h5>${step.label}</h5><p>${eventMap[step.key] ? formatTrackingDate(eventMap[step.key]) : '-'}</p></div>`).join('')}<div class="timeline-step cancelled"><div class="timeline-dot">×</div><h5>Annulé</h5><p>${formatTrackingDate(cancelledAt)}</p></div></div><div class="cancellation-message">${cancellationMessage}</div>`;
    }

    function getPhotoUrl(order, items) {
        const photoItem = items.find(i => i.type === 'photo_upload' || i.url || i.photo_url);
        return order.google_drive_url || photoItem?.url || photoItem?.photo_url || null;
    }

    function getDrivePreviewUrl(url) {
        const match = String(url || '').match(/\/d\/([^/]+)/) || String(url || '').match(/[?&]id=([^&]+)/);
        return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200` : url;
    }

    function showTrackingSearchForm() {
        document.getElementById('tracking-search-heading')?.classList.remove('tracking-search-hidden');
        document.getElementById('order-tracking-form')?.classList.remove('tracking-search-hidden');
        const resultBox = document.getElementById('tracking-result');
        if (resultBox) {
            resultBox.className = 'hidden';
            resultBox.innerHTML = '';
        }
        document.getElementById('tracking-search-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.showTrackingSearchForm = showTrackingSearchForm;

    function closeTrackingModal() { document.getElementById('tracking-modal')?.classList.remove('is-open'); }
    window.closeTrackingModal = closeTrackingModal;

    function openTrackingModal(html) {
        let modal = document.getElementById('tracking-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'tracking-modal';
            modal.className = 'tracking-modal';
            modal.innerHTML = `<div class="tracking-modal-card"><div id="tracking-modal-content"></div></div>`;
            modal.addEventListener('click', event => { if (event.target === modal) closeTrackingModal(); });
            document.body.appendChild(modal);
        }
        document.getElementById('tracking-modal-content').innerHTML = html;
        modal.classList.add('is-open');
    }
    window.openTrackingModal = openTrackingModal;

    function closeTrackingDrawer() {
        const drawer = document.getElementById('tracking-details-drawer');
        if (drawer) drawer.classList.remove('is-open');
        document.documentElement.classList.remove('tracking-drawer-open');
        document.body.classList.remove('tracking-drawer-open');
    }
    window.closeTrackingDrawer = closeTrackingDrawer;

    function openTrackingDrawer(html) {
        let drawer = document.getElementById('tracking-details-drawer');
        if (!drawer) {
            drawer = document.createElement('div');
            drawer.id = 'tracking-details-drawer';
            drawer.className = 'tracking-details-drawer';
            drawer.setAttribute('role', 'dialog');
            drawer.setAttribute('aria-modal', 'true');
            drawer.innerHTML = `<aside class="tracking-details-panel"><div id="tracking-details-content"></div></aside>`;
            document.body.appendChild(drawer);
            drawer.addEventListener('click', event => {
                if (event.target === drawer) closeTrackingDrawer();
            });
        } else if (drawer.parentElement !== document.body) {
            document.body.appendChild(drawer);
        }
        const content = drawer.querySelector('#tracking-details-content');
        if (content) content.innerHTML = html;
        document.documentElement.classList.add('tracking-drawer-open');
        document.body.classList.add('tracking-drawer-open');
        drawer.classList.add('is-open');
    }
    window.openTrackingDrawer = openTrackingDrawer;

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeTrackingDrawer();
    });

    function openImagePreview(url) {
        if (!url) return;
        const preview = getDrivePreviewUrl(url);
        openTrackingModal(`<div class="flex items-start justify-between gap-4 mb-4"><h3 class="text-xl font-black text-[#E75C25]">Image de la liste</h3><button onclick="closeTrackingModal()" class="text-stone-400 hover:text-stone-900 text-2xl leading-none">×</button></div><div class="bg-stone-50 rounded-2xl p-3 border border-stone-100"><img src="${preview}" class="tracking-image-preview mx-auto" onerror="this.outerHTML='<div class=\'p-6 text-center text-stone-500\'>Aperçu non disponible. Ouvrez le lien Drive ci-dessous.</div>'"></div><a href="${url}" target="_blank" class="inline-flex mt-4 text-xs font-black text-[#E75C25] hover:underline">Ouvrir l’image dans un nouvel onglet</a>`);
    }
    window.openImagePreview = openImagePreview;

    async function cancelTrackedOrder(orderId, orderRef) {
        openTrackingModal(`<div class="text-center space-y-4"><h3 class="text-xl font-black">Annuler la commande ${orderRef || ''} ?</h3><p class="text-sm text-stone-500">Cette action n’est pas réversible.</p><div class="flex gap-3 justify-center"><button onclick="closeTrackingModal()" class="px-5 py-3 rounded-xl border">Non, garder</button><button id="confirm-cancel-order" class="px-5 py-3 rounded-xl bg-red-600 text-white">Oui, annuler</button></div></div>`);
        setTimeout(() => document.getElementById('confirm-cancel-order')?.addEventListener('click', async () => {
            const cancelledAt = new Date().toISOString();
            let { error } = await supabaseClient.from('orders').update({ status: 'cancelled', cancellation_source: 'customer', cancelled_at: cancelledAt }).eq('id', orderId);
            if (error && /cancellation_source|cancelled_at|column|schema/i.test(error.message || '')) {
                const fallback = await supabaseClient.from('orders').update({ status: 'cancelled' }).eq('id', orderId); error = fallback.error;
            }
            if (error) { alert('Impossible d’annuler la commande : ' + error.message); return; }
            await supabaseClient.from('order_history').insert([{ order_id: orderId, status: 'cancelled', created_at: cancelledAt }]);
            const { data: refreshedOrder } = await supabaseClient.from('orders').select('*').eq('id', orderId).maybeSingle();
            const { data: refreshedHistory } = await supabaseClient.from('order_history').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
            closeTrackingModal();
            document.getElementById('tracking-cancel-button')?.remove();
            const timelineArea = document.getElementById('tracking-timeline-area');
            if (timelineArea) timelineArea.innerHTML = buildOrderTimeline(refreshedOrder || { status:'cancelled', cancellation_source:'customer', cancelled_at:cancelledAt }, refreshedHistory || []);
        }), 80);
    }
    window.cancelTrackedOrder = cancelTrackedOrder;

    function openOrderDetails(order, items, history, qrPayload, schoolInfo = { school: '', level: '' }) {
        const photoUrl = getPhotoUrl(order, items);
        const photoOrder = items.some(i => i.type === 'photo_upload' || i.url || i.photo_url) || !!photoUrl;
        const rows = !photoOrder && items.length
            ? items.map(item => `<div class="tracking-details-row"><span>${item.name || '-'}</span><b>${(Number(item.price) || 0).toFixed(2)} DH</b></div>`).join('')
            : `<div class="p-4 rounded-2xl bg-orange-50 border border-orange-100 text-orange-700 text-sm">Cette commande est passée à partir d’une liste personnalisée importée.${photoUrl ? ` <a href="${photoUrl}" target="_blank" class="font-black underline">Voir l’image</a>` : ''}</div>`;
        openTrackingDrawer(`<div class="flex items-start justify-between gap-4 mb-6"><div><h3 class="text-2xl font-black text-[#E75C25]">Détails de ma commande</h3><p class="text-sm text-stone-500 mt-1">${order.numero_commande || '-'}</p></div><button onclick="closeTrackingDrawer()" class="text-stone-400 hover:text-stone-900 text-2xl leading-none">×</button></div><div class="grid gap-3 text-sm"><div class="tracking-details-row"><span>Type de commande</span><b>${photoOrder ? 'Liste personnalisée importée' : 'Liste officielle'}</b></div>${!photoOrder ? `<div class="tracking-details-row"><span>École / niveau</span><b>${[schoolInfo.school, schoolInfo.level].filter(Boolean).join(' · ') || '-'}</b></div>` : ''}${photoUrl ? `<div class="tracking-details-row"><span>Image importée</span><b><a href="${photoUrl}" target="_blank" class="text-[#E75C25] hover:underline">Ouvrir l’image</a></b></div>` : ''}<div class="grid gap-2 mt-2">${rows}</div></div>`);
    }
    window.openOrderDetails = openOrderDetails;

    const trackingForm = document.getElementById('order-tracking-form');
    if (trackingForm) {
        trackingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const resultBox = document.getElementById('tracking-result');
            const orderId = document.getElementById('tracking-order-id').value.trim().toUpperCase().replace('#', '');
            const phone = document.getElementById('tracking-phone').value.trim();
            if (!resultBox) return;
            resultBox.classList.remove('hidden');
            resultBox.className = 'tracking-order-layout';
            resultBox.innerHTML = `<div class="tracking-card p-8 text-center text-stone-500">🔎 Recherche de votre commande...</div>`;
            if (!orderId) { resultBox.innerHTML = `<div class="tracking-card p-8 text-center text-red-700">Veuillez saisir votre numéro de commande ou votre code QR.</div>`; return; }
            const isQrSearch = orderId.startsWith('EQ-QR-');
            if (!isQrSearch && !phone) { resultBox.innerHTML = `<div class="tracking-card p-8 text-center text-red-700">Veuillez saisir le numéro de commande et le téléphone.</div>`; return; }
            const { data, error } = await supabaseClient.from('orders').select('*').eq(isQrSearch ? 'qr_code' : 'numero_commande', orderId).maybeSingle();
            if (error || !data || (!isQrSearch && normalizePhone(data.client_phone) !== normalizePhone(phone))) { resultBox.innerHTML = `<div class="tracking-card p-8 text-center text-red-700">Aucune commande active trouvée. Vérifiez les informations saisies.</div>`; return; }
            const { data: historyData } = await supabaseClient.from('order_history').select('*').eq('order_id', data.id).order('created_at', { ascending: true });
            const history = historyData || [];
            const items = parseTrackingItems(data.items);
            const photoUrl = getPhotoUrl(data, items);
            const photoOrder = items.some(i => i.type === 'photo_upload' || i.url || i.photo_url) || !!photoUrl;
            const school = await inferSchoolFromItems(items);
            const totalAmount = Number(data.total_amount ?? items.reduce((sum, item) => sum + (Number(item.price) || 0), 0));
            const amountText = photoOrder ? 'Sur devis' : (totalAmount > 0 ? totalAmount.toFixed(2) + ' DH' : '0.00 DH');
            const qrCode = data.qr_code || '';
            const qrPayload = data.qr_payload || (qrCode ? buildQrPayload(qrCode) : buildQrPayload(data.numero_commande));
            const qrCanvasId = `tracking-qr-${data.id}`;
            const firstName = (data.client_name || '').trim().split(/\s+/)[0] || 'cher client';
            const schoolChip = school.school || 'École';
            const levelChip = school.level || 'Niveau';
            const chips = photoOrder
                ? `<span class="tracking-chip-outline">Commande personnalisée</span>${photoUrl ? `<button type="button" onclick="openImagePreview('${photoUrl}')" class="tracking-chip-outline clickable">Image de la liste</button>` : `<span class="tracking-chip-outline">Image en attente</span>`}`
                : `<span class="tracking-chip-outline">${schoolChip}</span><span class="tracking-chip-outline">${levelChip}</span><span class="tracking-chip-outline">${items.length} articles</span>`;
            document.getElementById('tracking-search-heading')?.classList.add('tracking-search-hidden');
            document.getElementById('order-tracking-form')?.classList.add('tracking-search-hidden');
            resultBox.className = 'tracking-order-layout';
            resultBox.innerHTML = `<div class="tracking-left"><div class="tracking-hello"><button type="button" class="tracking-back-btn" onclick="showTrackingSearchForm()">‹</button><h3>Bonjour ${firstName}</h3><p>Merci pour votre confiance ! Retrouvez les détails de votre commande</p></div><div class="tracking-field"><small>Téléphone</small><strong>${data.client_phone || '-'}</strong></div><div class="tracking-field"><small>Adresse e-mail</small><strong>${data.client_email || '-'}</strong></div><div class="tracking-recap-title">Ma commande</div><div class="tracking-chips">${chips}</div><div class="tracking-status-zone"><small>Status de ma commande</small><div id="tracking-timeline-area">${buildOrderTimeline(data, history)}</div></div></div><aside class="tracking-side"><div class="tracking-qr-card"><div class="tracking-ref-side">${data.numero_commande || '-'}</div><div class="tracking-qr-box"><canvas id="${qrCanvasId}" class="bg-white"></canvas></div><p class="tracking-qr-note">Présentez ce QR code lors de la récupération de votre commande. Télécharger la facture pour le retrait !</p><div class="grid gap-2"><button type="button" class="tracking-btn tracking-btn-orange" onclick='openOrderDetails(${JSON.stringify(data)}, ${JSON.stringify(items)}, ${JSON.stringify(history)}, ${JSON.stringify(qrPayload)}, ${JSON.stringify(school)})'>Détails de ma commande</button><button type="button" id="download-${qrCanvasId}" class="tracking-btn tracking-btn-green">Télécharger ma commande</button>${normalizeTrackingStatus(data.status) === 'cancelled' ? '' : `<button type="button" id="tracking-cancel-button" class="tracking-btn tracking-btn-cancel" onclick="cancelTrackedOrder('${data.id}', '${data.numero_commande || ''}')">Annuler ma commande</button>`}</div></div><div class="tracking-pay-box"><small>Prix à payer</small><strong>${amountText}</strong></div></aside>`;
            renderQrToCanvas(qrCanvasId, qrPayload, `commande-${data.numero_commande || qrCode}.pdf`, { order: data, items, history });
            setTimeout(() => resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        });
    }

    function getReservationDeadline() {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + RESERVATION_DAYS);
        return deadline.toISOString();
    }

    // ==========================================
    // 8. ANIMATIONS ET COMPORTEMENT DE LA NAVBAR
    // ==========================================
    const mainHeader = document.getElementById('main-header');
    const scrollBtn = document.getElementById('scroll-to-top');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    window.addEventListener('scroll', () => {
        if (mainHeader) {
            if (window.scrollY > 40) {
                mainHeader.classList.remove('bg-transparent', 'border-transparent', 'py-4');
                mainHeader.classList.add('bg-white', 'shadow-md', 'border-b', 'border-gray-100', 'py-2.5');
            } else {
                mainHeader.classList.remove('bg-white', 'shadow-md', 'border-b', 'border-gray-100', 'py-2.5');
                mainHeader.classList.add('bg-transparent', 'border-transparent', 'py-4');
            }
        }

        if (scrollBtn) {
            if (window.scrollY > 300) {
                scrollBtn.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
                scrollBtn.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
            } else {
                scrollBtn.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
                scrollBtn.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
            }
        }
    });

    // MENU CHANGER LA LANGUE
    const langBtn = document.getElementById('lang-btn');
    const langDropdown = document.getElementById('lang-dropdown');
    const langOptions = {
        'FR': document.getElementById('lang-opt-fr'),
        'EN': document.getElementById('lang-opt-en'),
        'AR': document.getElementById('lang-opt-ar')
    };

    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (langDropdown) langDropdown.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', (e) => {
        if (langDropdown && !langDropdown.contains(e.target) && e.target !== langBtn) {
            langDropdown.classList.add('hidden');
        }
    });

    window.switchLanguage = function(lang) {
        if (langBtn) langBtn.innerText = lang;
        Object.keys(langOptions).forEach(key => {
            if (langOptions[key]) langOptions[key].className = "text-[#E75C25] hover:bg-orange-50 rounded-full w-[34px] h-[34px] flex items-center justify-center font-black text-xs font-header focus:outline-none";
        });
        if (langOptions[lang]) langOptions[lang].className = "bg-[#E75C25] text-white rounded-full w-[34px] h-[34px] flex items-center justify-center font-black text-xs font-header focus:outline-none";
        if (langDropdown) langDropdown.classList.add('hidden');
    };

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const qrParam = urlParams.get('qr');
    if (tabParam && document.getElementById(tabParam)) switchTab(tabParam);
    if (qrParam) {
        const trackingInput = document.getElementById('tracking-order-id');
        if (trackingInput) trackingInput.value = qrParam;
    }

    // ==========================================
    // PLAN & RAYONS - INTERACTIONS
    // ==========================================
    function setStoreZone(zone) {
        document.querySelectorAll('.store-zone-btn').forEach(btn => btn.classList.toggle('is-active', btn.dataset.zone === zone));
        document.querySelectorAll('.store-zone-panel').forEach(panel => panel.classList.toggle('is-active', panel.dataset.zonePanel === zone));
        document.querySelectorAll('.store-map-zone').forEach(block => {
            const active = block.dataset.zoneMap === zone;
            block.classList.toggle('border-[#E75C25]', active);
            block.classList.toggle('bg-orange-50', active);
            block.classList.toggle('text-[#E75C25]', active);
            block.classList.toggle('scale-[1.02]', active);
            block.classList.toggle('shadow-md', active);
        });
    }
    document.querySelectorAll('.store-zone-btn').forEach(btn => btn.addEventListener('click', () => setStoreZone(btn.dataset.zone)));
    setStoreZone('accueil');

    initClientData();
    updateStepper(1);
});