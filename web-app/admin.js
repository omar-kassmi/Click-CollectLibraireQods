document.addEventListener('DOMContentLoaded', () => {
   
    // ==========================================
    // 0. SÉCURITÉ SIMPLE & CONFIGURATION
    // ==========================================
    const MOT_DE_PASSE_ADMIN = "Berkane2026";
    const saisie = prompt("Veuillez saisir le mot de passe d'administration :");
   
    if (saisie !== MOT_DE_PASSE_ADMIN) {
        alert("Accès refusé.");
        window.location.href = "index.html";
        return;
    }
    document.getElementById('admin-body').classList.remove('hidden');

    const SUPABASE_URL = "https://jgfkshsizrtwzqsdrhhp.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_Rdn2yMULDq05BGBV-X-zCA_S934mdEh";
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Panier temporaire d'objets saisis par l'admin
    let currentFormItems = [];
    let editingListId = null;
    let editingItemId = null;

    const btnAddItem = document.getElementById('btn-add-item');
    const inputItemName = document.getElementById('admin-item-name');
    const inputItemPrice = document.getElementById('admin-item-price');
    const selectItemCategory = document.getElementById('admin-item-category');
    const previewBox = document.getElementById('admin-items-preview');
    const formAdd = document.getElementById('form-add-list');
    const packFormTitle = document.getElementById('pack-form-title');
    const btnSavePack = document.getElementById('btn-save-pack');
    const btnCancelEditPack = document.getElementById('btn-cancel-edit-pack');

    if (btnAddItem) {
        btnAddItem.addEventListener('click', () => {
            const category = selectItemCategory.value;
            const name = inputItemName.value.trim();
            const price = parseFloat(inputItemPrice.value);

            if (!name) return;
            if (Number.isNaN(price) || price < 0) {
                alert("Veuillez saisir un prix valide.");
                return;
            }

            if (editingItemId) {
                currentFormItems = currentFormItems.map(item => item.id === editingItemId
                    ? { ...item, name: name, category: category, price: price }
                    : item
                );
                editingItemId = null;
                btnAddItem.textContent = "+ Insérer l'article au sac temporaire";
            } else {
                currentFormItems.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: name,
                    category: category,
                    price: price
                });
            }

            inputItemName.value = ''; 
            inputItemPrice.value = '';
            renderAdminPreviewList();
        });
    }

    window.removeSingleItemFromPack = function(id) {
        currentFormItems = currentFormItems.filter(item => item.id !== id);
        if (editingItemId === id) {
            editingItemId = null;
            btnAddItem.textContent = "+ Insérer l'article au sac temporaire";
            inputItemName.value = '';
            inputItemPrice.value = '';
        }
        renderAdminPreviewList();
    };

    window.editSingleItemFromPack = function(id) {
        const item = currentFormItems.find(entry => entry.id === id);
        if (!item) return;

        editingItemId = id;
        selectItemCategory.value = item.category || 'Fournitures';
        inputItemName.value = item.name || '';
        inputItemPrice.value = Number(item.price || 0).toFixed(2);
        btnAddItem.textContent = "Mettre à jour l'article";
        inputItemName.focus();
    };

    function renderAdminPreviewList() {
        if (currentFormItems.length === 0) {
            previewBox.innerHTML = "Aucun article ajouté pour le moment.";
            return;
        }
        previewBox.innerHTML = currentFormItems.map(item => `
            <div class="flex justify-between items-center bg-white p-2 border rounded-lg border-stone-200">
                <span class="text-gray-700 font-medium"><b class="text-[#E75C25] mr-1">[${item.category}]</b> ${item.name} - <b>${Number(item.price || 0).toFixed(2)} DH</b></span>
                <button type="button" onclick="removeSingleItemFromPack('${item.id}')" class="text-red-500 hover:text-red-700 font-bold px-1">✕</button>
            </div>
        `).join('');
    }

    function renderAdminPreviewList() {
        if (currentFormItems.length === 0) {
            previewBox.innerHTML = "Aucun article ajouté pour le moment.";
            return;
        }
        previewBox.innerHTML = currentFormItems.map(item => `
            <div class="flex justify-between items-center gap-3 bg-white p-2 border rounded-lg border-stone-200">
                <span class="text-gray-700 font-medium min-w-0"><b class="text-[#E75C25] mr-1">[${item.category}]</b> ${item.name} - <b>${Number(item.price || 0).toFixed(2)} DH</b></span>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onclick="editSingleItemFromPack('${item.id}')" class="text-gray-500 hover:text-[#E75C25] font-bold px-1" title="Modifier cet article" aria-label="Modifier cet article">
                        <svg class="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button type="button" onclick="removeSingleItemFromPack('${item.id}')" class="text-red-500 hover:text-red-700 font-bold px-1">×</button>
                </div>
            </div>
        `).join('');
    }

    // Navigation Sidebar
    const btnOrders = document.getElementById('nav-orders');
    const btnConfig = document.getElementById('nav-config');
    const btnTabsConfig = document.getElementById('nav-tabs-config');
   
    const paneOrders = document.getElementById('pane-orders');
    const paneConfig = document.getElementById('pane-config');
    const paneTabsConfig = document.getElementById('pane-tabs-config');

    const styleActif = "w-full text-left px-4 py-3 rounded-xl bg-white/10 text-white flex items-center space-x-3 transition";
    const styleInactif = "w-full text-left px-4 py-3 rounded-xl text-orange-100 hover:bg-white/5 hover:text-white flex items-center space-x-3 transition";

    btnOrders.addEventListener('click', () => {
        paneOrders.classList.remove('hidden'); paneConfig.classList.add('hidden'); paneTabsConfig.classList.add('hidden');
        btnOrders.className = styleActif; btnConfig.className = styleInactif; btnTabsConfig.className = styleInactif;
        loadOrders();
    });

    btnConfig.addEventListener('click', () => {
        paneConfig.classList.remove('hidden'); paneOrders.classList.add('hidden'); paneTabsConfig.classList.add('hidden');
        btnConfig.className = styleActif; btnOrders.className = styleInactif; btnTabsConfig.className = styleInactif;
        loadSchoolLists();
    });

    btnTabsConfig.addEventListener('click', () => {
        paneTabsConfig.classList.remove('hidden'); paneOrders.classList.add('hidden'); paneConfig.classList.add('hidden');
        btnTabsConfig.className = styleActif; btnOrders.className = styleInactif; btnConfig.className = styleInactif;
        loadSiteSettings();
    });

    // ==========================================
    // 1. PARAMÈTRES SITE & CONTACTS
    // ==========================================
    async function loadSiteSettings() {
        const { data, error } = await supabaseClient.from('site_settings').select('*');
        if (error) { console.error(error); return; }

        data.forEach(setting => {
            if (setting.key === 'rentree_enabled') document.getElementById('set-rentree-enabled').value = setting.value;
            if (setting.key === 'rentree_title') document.getElementById('set-rentree-title').value = setting.value;
            if (setting.key === 'contact_address') document.getElementById('set-contact-address').value = setting.value;
            if (setting.key === 'contact_email') document.getElementById('set-contact-email').value = setting.value;
            if (setting.key === 'contact_phone') document.getElementById('set-contact-phone').value = setting.value;
            if (setting.key === 'contact_whatsapp') document.getElementById('set-contact-whatsapp').value = setting.value;
            if (setting.key === 'contact_facebook') document.getElementById('set-contact-facebook').value = setting.value;
            if (setting.key === 'contact_instagram') document.getElementById('set-contact-instagram').value = setting.value;
            if (setting.key === 'contact_linkedin') document.getElementById('set-contact-linkedin').value = setting.value;
        });
    }

    document.getElementById('form-site-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        const enabled = document.getElementById('set-rentree-enabled').value;
        const title = document.getElementById('set-rentree-title').value;

        await supabaseClient.from('site_settings').update({ value: enabled }).eq('key', 'rentree_enabled');
        await supabaseClient.from('site_settings').update({ value: title }).eq('key', 'rentree_title');
        alert("Visibilité de l'onglet Rentrée mise à jour !");
    });

    document.getElementById('form-home-contacts').addEventListener('submit', async (e) => {
        e.preventDefault();
        const address = document.getElementById('set-contact-address').value;
        const email = document.getElementById('set-contact-email').value;
        const phone = document.getElementById('set-contact-phone').value;
        const whatsapp = document.getElementById('set-contact-whatsapp').value;
        const facebook = document.getElementById('set-contact-facebook').value;
        const instagram = document.getElementById('set-contact-instagram').value;
        const linkedin = document.getElementById('set-contact-linkedin').value;

        await supabaseClient.from('site_settings').update({ value: address }).eq('key', 'contact_address');
        await supabaseClient.from('site_settings').update({ value: email }).eq('key', 'contact_email');
        await supabaseClient.from('site_settings').update({ value: phone }).eq('key', 'contact_phone');
        await supabaseClient.from('site_settings').update({ value: whatsapp }).eq('key', 'contact_whatsapp');
        await supabaseClient.from('site_settings').update({ value: facebook }).eq('key', 'contact_facebook');
        await supabaseClient.from('site_settings').update({ value: instagram }).eq('key', 'contact_instagram');
        await supabaseClient.from('site_settings').update({ value: linkedin }).eq('key', 'contact_linkedin');

        alert("Les coordonnées de contact modifiées !");
        loadSiteSettings();
    });

    // ==========================================
    // 2. GESTION DU TABLEAU DES COMMANDES
    // ==========================================
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    }

    function formatPhoneForWhatsapp(phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        if (digits.startsWith('212')) return digits;
        if (digits.startsWith('0')) return `212${digits.slice(1)}`;
        return digits;
    }

    async function loadOrders() {
        const tbody = document.getElementById('table-orders-body');
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400">Chargement...</td></tr>`;

        const { data: orders, error } = await supabaseClient.from('orders').select('*').order('id', { ascending: false });
        if (error) { console.error(error); return; }
        tbody.innerHTML = "";

        if(orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400">Aucune commande.</td></tr>`; return;
        }

        orders.forEach(order => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition";
            let contenuFormatte = escapeHtml(order.items);
            
            if(typeof order.items === 'string' && order.items.includes("http")) {
                contenuFormatte = `<a href="${escapeHtml(order.items)}" target="_blank" class="text-blue-600 hover:underline font-medium">Ouvrir la photo</a>`;
            } else if (Array.isArray(order.items) || (typeof order.items === 'string' && order.items.startsWith('['))) {
                const objects = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                const total = objects.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
                contenuFormatte = `<span class="font-bold text-stone-700">${objects.length} fournitures cochées (${total.toFixed(2)} DH)</span>`;
            }
            
            const badgeStatut = order.status === 'en_attente'
                ? `<span class="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">En attente</span>`
                : `<span class="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">Notifié</span>`;

            tr.innerHTML = `<td class="p-4 font-bold text-gray-600">#${order.id}</td><td class="p-4 font-semibold">${escapeHtml(order.client_name)}</td><td class="p-4 text-gray-500">${escapeHtml(order.client_phone)}</td><td class="p-4 text-xs max-w-xs truncate">${contenuFormatte}</td><td class="p-4">${badgeStatut}</td><td class="p-4 text-right"><button class="btn-notify bg-[#E75C25] text-white text-xs font-medium px-3 py-1.5 rounded-lg">Notifier</button></td>`;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-notify').forEach((btn, index) => {
            btn.addEventListener('click', async () => {
                const order = orders[index];
                const message = `Bonjour ${order.client_name}, votre commande n° ${order.id} est prête à la Papeterie Berkane !`;
                window.open(`https://wa.me/${formatPhoneForWhatsapp(order.client_phone)}?text=${encodeURIComponent(message)}`, '_blank');
                await supabaseClient.from('orders').update({ status: 'notifie' }).eq('id', order.id);
                loadOrders();
            });
        });
    }
    document.getElementById('btn-refresh-orders').addEventListener('click', loadOrders);

    // ==========================================
    // 3. LOGIQUE DES CONFIGURATIONS DE FOURNITURES
    // ==========================================
    function parseSchoolListItems(rawItems) {
        if (!rawItems) return [];

        try {
            if (typeof rawItems === 'string') {
                return JSON.parse(rawItems);
            }

            if (Array.isArray(rawItems)) {
                if (rawItems.length === 1 && typeof rawItems[0] === 'string' && rawItems[0].trim().startsWith('[')) {
                    return JSON.parse(rawItems[0]);
                }
                return rawItems;
            }
        } catch (err) {
            console.error("Impossible de lire les articles du pack :", err);
        }

        return [];
    }

    function resetPackForm() {
        editingListId = null;
        editingItemId = null;
        formAdd.reset();
        currentFormItems = [];
        renderAdminPreviewList();
        btnAddItem.textContent = "+ Insérer l'article au sac temporaire";
        if (packFormTitle) packFormTitle.textContent = "📦 Créer un pack d'objets officiel";
        if (btnSavePack) btnSavePack.textContent = "Mettre en ligne le Pack d'objets";
        if (btnCancelEditPack) btnCancelEditPack.classList.add('hidden');
    }

    window.startEditSchoolList = function(id) {
        const list = window.schoolListsCache?.find(item => String(item.id) === String(id));
        if (!list) return;

        editingListId = list.id;
        editingItemId = null;
        document.getElementById('cfg-school').value = list.school_name || '';
        document.getElementById('cfg-level').value = list.level || '';
        currentFormItems = parseSchoolListItems(list.items).map((item, index) => ({
            id: item.id || `item-${Date.now()}-${index}`,
            name: item.name || String(item),
            category: item.category || 'Fournitures',
            price: parseFloat(item.price) || 0
        }));

        renderAdminPreviewList();
        btnAddItem.textContent = "+ Insérer l'article au sac temporaire";
        if (packFormTitle) packFormTitle.textContent = "✏️ Modifier le pack d'objets";
        if (btnSavePack) btnSavePack.textContent = "Enregistrer les modifications";
        if (btnCancelEditPack) btnCancelEditPack.classList.remove('hidden');
        formAdd.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (btnCancelEditPack) {
        btnCancelEditPack.addEventListener('click', resetPackForm);
    }

    formAdd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const school = document.getElementById('cfg-school').value;
        const level = document.getElementById('cfg-level').value;

        if (currentFormItems.length === 0) {
            alert("Veuillez insérer des fournitures avant de sauvegarder.");
            return;
        }

        // 👑 SÉRIALISATION SÉCURISÉE EN CHAÎNE JSON (Évite d'écraser la colonne text[])
        const jsonString = JSON.stringify(currentFormItems);

        if (editingListId) {
            const { error } = await supabaseClient
                .from('school_lists')
                .update({
                    school_name: school,
                    level: level,
                    items: [jsonString]
                })
                .eq('id', editingListId);

            if (error) {
                alert("Erreur lors de la modification.");
            } else {
                resetPackForm();
                loadSchoolLists();
            }
            return;
        }

        const { error } = await supabaseClient.from('school_lists').insert([{ 
            school_name: school, 
            level: level, 
            items: [jsonString] // Injecté sous forme de chaîne de caractères unique
        }]);
        
        if (error) { 
            alert("Erreur lors du dépôt."); 
        } else { 
            formAdd.reset(); 
            currentFormItems = []; 
            renderAdminPreviewList();
            loadSchoolLists(); 
        }
    });

    async function loadSchoolLists() {
        const container = document.getElementById('config-lists-container');
        container.innerHTML = `<p class="text-gray-400 text-xs">Chargement...</p>`;
        const { data: lists, error } = await supabaseClient.from('school_lists').select('*');
        if (error) return;
        window.schoolListsCache = lists || [];
        container.innerHTML = "";

        lists.forEach(list => {
            const div = document.createElement('div');
            div.className = "bg-white p-5 rounded-2xl border flex flex-col justify-between shadow-sm";
            
            let articleCount = 0;
            try {
                if (list.items && list.items.length > 0) {
                    const first = list.items[0];
                    if (typeof first === 'string' && first.startsWith('[')) {
                        articleCount = JSON.parse(first).length;
                    } else {
                        articleCount = list.items.length;
                    }
                }
            } catch(e) { articleCount = 0; }

            div.innerHTML = `
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <span class="text-xs font-bold text-[#E75C25] uppercase">${list.school_name}</span>
                        <h4 class="text-base font-bold text-gray-900">Classe : ${list.level}</h4>
                        <p class="text-xs text-stone-400 mt-1">${articleCount} articles configurés</p>
                    </div>
                    <button type="button" class="btn-edit-list text-gray-400 hover:text-[#E75C25] transition" data-id="${list.id}" title="Modifier ce pack" aria-label="Modifier ce pack">
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-4 mt-4">
                    <button class="btn-edit-list text-left text-xs font-semibold text-[#E75C25]" data-id="${list.id}">Modifier</button>
                    <button class="btn-delete-list text-left text-xs font-semibold text-red-600" data-id="${list.id}">Supprimer</button>
                </div>`;
            container.appendChild(div);
        });

        document.querySelectorAll('.btn-delete-list').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(confirm("Supprimer ce pack ?")) {
                    await supabaseClient.from('school_lists').delete().eq('id', btn.getAttribute('data-id'));
                    if (String(editingListId) === String(btn.getAttribute('data-id'))) {
                        resetPackForm();
                    }
                    loadSchoolLists();
                }
            });
        });

        document.querySelectorAll('.btn-edit-list').forEach(btn => {
            btn.addEventListener('click', () => {
                startEditSchoolList(btn.getAttribute('data-id'));
            });
        });
    }

    loadOrders();
});
