document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. CONFIGURATION & SYNCHRONISATION SUPABASE
    // ==========================================
    const SUPABASE_URL = "https://jgfkshsizrtwzqsdrhhp.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_Rdn2yMULDq05BGBV-X-zCA_S934mdEh";
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const RESERVATION_DAYS = 5;
    const COLLECTED_STATUSES = ['collected'];
    const CLOSED_STATUSES = ['collected', 'cancelled', 'expired'];
    const STATUS_ALIASES = {
        en_attente: 'new',
        preparation: 'preparing',
        prete: 'ready',
        notifie: 'ready'
    };
    const STATUS_META = {
        new: ['New', 'bg-amber-50 text-amber-700'],
        preparing: ['Preparing', 'bg-blue-50 text-blue-700'],
        ready: ['Ready', 'bg-emerald-50 text-emerald-700'],
        collected: ['Collected', 'bg-stone-900 text-white'],
        cancelled: ['Cancelled', 'bg-red-50 text-red-700'],
        expired: ['Expired', 'bg-gray-100 text-gray-600']
    };

    let currentOrders = [];
    let currentFormItems = [];
    let editingListId = null;
    let editingItemId = null;

    const loginSection = document.getElementById('admin-login');
    const adminBody = document.getElementById('admin-body');
    const loginForm = document.getElementById('admin-login-form');
    const loginError = document.getElementById('admin-login-error');
    const logoutButton = document.getElementById('btn-admin-logout');

    const btnOrders = document.getElementById('nav-orders');
    const btnConfig = document.getElementById('nav-config');
    const btnTabsConfig = document.getElementById('nav-tabs-config');
    const paneOrders = document.getElementById('pane-orders');
    const paneConfig = document.getElementById('pane-config');
    const paneTabsConfig = document.getElementById('pane-tabs-config');

    const formAdd = document.getElementById('form-add-list');
    const btnAddItem = document.getElementById('btn-add-item');
    const inputItemName = document.getElementById('admin-item-name');
    const inputItemPrice = document.getElementById('admin-item-price');
    const inputItemAvailability = document.getElementById('admin-item-availability');
    const selectItemCategory = document.getElementById('admin-item-category');
    const previewBox = document.getElementById('admin-items-preview');
    const packFormTitle = document.getElementById('pack-form-title');
    const btnSavePack = document.getElementById('btn-save-pack');
    const btnCancelEditPack = document.getElementById('btn-cancel-edit-pack');

    function showLogin(message = '') {
        loginSection.classList.remove('hidden');
        adminBody.classList.add('hidden');
        if (message) {
            loginError.textContent = message;
            loginError.classList.remove('hidden');
        } else {
            loginError.classList.add('hidden');
        }
    }

    function showAdmin() {
        loginSection.classList.add('hidden');
        adminBody.classList.remove('hidden');
        loadOrders();
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.classList.add('hidden');

        const email = document.getElementById('admin-login-email').value.trim();
        const password = document.getElementById('admin-login-password').value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            console.error("Supabase login error:", error);
            showLogin(`Connexion impossible : ${error.message}`);
            return;
        }

        showAdmin();
    });

    logoutButton?.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        showLogin();
    });

    async function initAuth() {
        const { data } = await supabaseClient.auth.getSession();
        if (data.session) showAdmin();
        else showLogin();

        supabaseClient.auth.onAuthStateChange((_event, session) => {
            if (session) showAdmin();
            else showLogin();
        });
    }

    function switchAdminPane(target) {
        paneOrders.classList.toggle('hidden', target !== 'orders');
        paneConfig.classList.toggle('hidden', target !== 'config');
        paneTabsConfig.classList.toggle('hidden', target !== 'settings');

        const active = "w-full text-left px-4 py-3 rounded-xl bg-white/10 text-white flex items-center space-x-3 transition";
        const inactive = "w-full text-left px-4 py-3 rounded-xl text-orange-100 hover:bg-white/5 hover:text-white flex items-center space-x-3 transition";
        btnOrders.className = target === 'orders' ? active : inactive;
        btnConfig.className = target === 'config' ? active : inactive;
        btnTabsConfig.className = target === 'settings' ? active : inactive;

        if (target === 'orders') loadOrders();
        if (target === 'config') loadSchoolLists();
        if (target === 'settings') loadSiteSettings();
    }

    btnOrders.addEventListener('click', () => switchAdminPane('orders'));
    btnConfig.addEventListener('click', () => switchAdminPane('config'));
    btnTabsConfig.addEventListener('click', () => switchAdminPane('settings'));

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[char]));
    }

    function money(value) {
        return `${(Number(value) || 0).toFixed(2)} DH`;
    }

    function normalizeStatus(status) {
        return STATUS_ALIASES[status] || status || 'new';
    }

    function getStatusBadge(status) {
        const normalized = normalizeStatus(status);
        const [label, classes] = STATUS_META[normalized] || STATUS_META.new;
        return `<span class="${classes} px-2.5 py-1 rounded-full text-xs font-semibold">${label}</span>`;
    }

    function formatPhoneForWhatsapp(phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        if (digits.startsWith('212')) return digits;
        if (digits.startsWith('0')) return `212${digits.slice(1)}`;
        return digits;
    }

    function parseItems(rawItems) {
        if (!rawItems) return [];
        if (Array.isArray(rawItems)) return rawItems;
        if (typeof rawItems === 'string' && rawItems.startsWith('http')) {
            return [{ name: 'Liste par photo', category: 'Photo', price: 0, photo_url: rawItems }];
        }
        try {
            return JSON.parse(rawItems);
        } catch (_err) {
            return [];
        }
    }

    function orderTotal(order) {
        if (order.total_amount !== undefined && order.total_amount !== null) return Number(order.total_amount) || 0;
        return parseItems(order.items).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    }

    function toDate(value) {
        return value ? new Date(value) : null;
    }

    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function getCreatedDate(order) {
        return toDate(order.created_at) || toDate(order.inserted_at) || new Date();
    }

    function getDeadline(order) {
        return toDate(order.reservation_deadline) || addDays(getCreatedDate(order), RESERVATION_DAYS);
    }

    // Recherche prenant en compte le numéro de commande généré par Supabase
    function getFilteredOrders() {
        const searchTerm = document.getElementById('orders-search')?.value.trim().toLowerCase() || '';
        const statusFilter = document.getElementById('orders-status-filter')?.value || '';
        const dateFilter = document.getElementById('orders-date-filter')?.value || '';

        return currentOrders.filter(order => {
            const status = normalizeStatus(order.status);
            const created = getCreatedDate(order);
            
            // Inclusion de numero_commande et id pour maximiser la recherche
            const orderRef = order.numero_commande || order.id;
            const haystack = `#${orderRef} #${order.id} ${order.client_name || ''} ${order.client_phone || ''} ${order.client_email || ''}`.toLowerCase();
            
            const matchesSearch = !searchTerm || haystack.includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter;
            const matchesDate = !dateFilter || created.toISOString().slice(0, 10) === dateFilter;
            return matchesSearch && matchesStatus && matchesDate;
        });
    }

    function isSameDay(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function isSameMonth(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    }

    function daysUntil(date) {
        return Math.ceil((date.getTime() - Date.now()) / 86400000);
    }

    async function expireOverdueOrders(orders) {
        const now = new Date();
        const overdue = orders.filter(order => {
            const status = normalizeStatus(order.status);
            return !CLOSED_STATUSES.includes(status) && getDeadline(order) < now;
        });

        for (const order of overdue) {
            await supabaseClient.from('orders').update({ status: 'expired' }).eq('id', order.id);
            order.status = 'expired';
        }
    }

    function renderDashboard() {
        const today = new Date();
        const collected = currentOrders.filter(order => normalizeStatus(order.status) === 'collected');
        const revenueToday = collected
            .filter(order => isSameDay(getCreatedDate(order), today))
            .reduce((sum, order) => sum + orderTotal(order), 0);
        const revenueMonth = collected
            .filter(order => isSameMonth(getCreatedDate(order), today))
            .reduce((sum, order) => sum + orderTotal(order), 0);

        const cards = [
            ['Orders today', currentOrders.filter(order => isSameDay(getCreatedDate(order), today)).length],
            ['Pending/New', currentOrders.filter(order => normalizeStatus(order.status) === 'new').length],
            ['Ready', currentOrders.filter(order => normalizeStatus(order.status) === 'ready').length],
            ['Collected', currentOrders.filter(order => normalizeStatus(order.status) === 'collected').length],
            ['Cancelled', currentOrders.filter(order => normalizeStatus(order.status) === 'cancelled').length],
            ['Expired', currentOrders.filter(order => normalizeStatus(order.status) === 'expired').length],
            ['Revenue today', money(revenueToday)],
            ['Revenue month', money(revenueMonth)]
        ];

        document.getElementById('dashboard-cards').innerHTML = cards.map(([label, value]) => `
            <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div class="text-[11px] text-gray-400 font-bold uppercase">${label}</div>
                <div class="text-xl font-black text-gray-900 mt-1">${value}</div>
            </div>
        `).join('');
    }

    function getProductStats() {
        const stats = {};
        const categoryStats = {};

        currentOrders
            .filter(order => COLLECTED_STATUSES.includes(normalizeStatus(order.status)))
            .forEach(order => {
                parseItems(order.items).forEach(item => {
                    const name = item.name || 'Article sans nom';
                    const category = item.category || 'Sans catégorie';
                    const price = Number(item.price) || 0;
                    if (!stats[name]) stats[name] = { name, quantity: 0, revenue: 0 };
                    stats[name].quantity += 1;
                    stats[name].revenue += price;
                    if (!categoryStats[category]) categoryStats[category] = { category, revenue: 0, quantity: 0 };
                    categoryStats[category].quantity += 1;
                    categoryStats[category].revenue += price;
                });
            });

        return {
            products: Object.values(stats).sort((a, b) => b.quantity - a.quantity),
            categories: Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue)
        };
    }

    function renderSalesAndFinance() {
        const collected = currentOrders.filter(order => normalizeStatus(order.status) === 'collected');
        const totalRevenue = collected.reduce((sum, order) => sum + orderTotal(order), 0);
        const today = new Date();
        const dailySales = collected.filter(order => isSameDay(getCreatedDate(order), today)).reduce((sum, order) => sum + orderTotal(order), 0);
        const monthlySales = collected.filter(order => isSameMonth(getCreatedDate(order), today)).reduce((sum, order) => sum + orderTotal(order), 0);
        const avgOrderValue = collected.length ? totalRevenue / collected.length : 0;
        const cashTotal = collected.filter(order => (order.payment_method || 'cash_pickup') === 'cash_pickup').reduce((sum, order) => sum + orderTotal(order), 0);
        const cardTotal = collected.filter(order => order.payment_method === 'card').reduce((sum, order) => sum + orderTotal(order), 0);
        const stats = getProductStats();
        const bestProduct = stats.products[0]?.name || 'Aucune vente';
        const topCategory = stats.categories[0]?.category || 'Aucune catégorie';

        document.getElementById('sales-dashboard').innerHTML = [
            ['Total revenue', money(totalRevenue)],
            ['Monthly revenue', money(monthlySales)],
            ['Average order', money(avgOrderValue)],
            ['Best product', escapeHtml(bestProduct)],
            ['Top category', escapeHtml(topCategory)],
            ['Orders/month', collected.filter(order => isSameMonth(getCreatedDate(order), today)).length]
        ].map(([label, value]) => `<div class="bg-gray-50 rounded-xl p-3"><b>${label}</b><div>${value}</div></div>`).join('');

        document.getElementById('financial-report').innerHTML = [
            ['Daily sales', money(dailySales)],
            ['Monthly sales', money(monthlySales)],
            ['Cash pickup', money(cashTotal)],
            ['Card total', money(cardTotal)]
        ].map(([label, value]) => `<div class="bg-gray-50 rounded-xl p-3"><b>${label}</b><div>${value}</div></div>`).join('');
    }

    function renderOrdersTable() {
        const tbody = document.getElementById('table-orders-body');
        const orders = getFilteredOrders();

        if (!tbody) return;
        if (!orders.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">Aucune commande.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const status = normalizeStatus(order.status);
            const deadline = getDeadline(order);
            const days = daysUntil(deadline);
            const items = parseItems(order.items);
            
            const photoItem = items.find(i => i.type === 'photo_upload' || i.url);
            const content = photoItem
                ? `<a href="${escapeHtml(photoItem.url)}" target="_blank" class="text-blue-600 hover:underline font-bold flex items-center gap-1">📸 Voir l'image</a>`
                : `<span class="font-bold text-stone-700">${items.length} articles (${money(orderTotal(order))})</span>`;
                
            const deadlineText = status === 'expired' ? 'Expired' : `${deadline.toLocaleDateString('fr-FR')} (${days}j)`;
            const displayReference = order.numero_commande || order.id;
            const paymentStatus = order.payment_status || 'unpaid';

            return `
                <tr class="hover:bg-gray-50 transition">
                    <td class="p-4 font-bold text-gray-600">#${displayReference}</td>
                    <td class="p-4 font-semibold">${escapeHtml(order.client_name)}</td>
                    <td class="p-4 text-gray-500">${escapeHtml(order.client_phone)}</td>
                    <td class="p-4 text-xs max-w-xs truncate">${content}</td>
                    <td class="p-4"><div class="space-y-2">${getStatusBadge(status)}${paymentStatus === 'paid' ? `<span class="inline-block bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold">✅ Payé</span>` : `<span class="inline-block bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-xs font-semibold">⏳ Non payé</span>`}</div></td>
                    <td class="p-4 text-xs text-gray-500">${deadlineText}</td>
                    <td class="p-4 text-right">
                        <div class="relative inline-block text-left">
                            <button onclick="window.toggleMenu(this)" class="text-gray-400 hover:text-gray-600 p-2">
                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                            </button>
                            <div class="hidden absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-2 text-left menu-dropdown">
                                <button class="btn-notify w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-blue-600" data-id="${order.id}">WhatsApp</button>
                                <hr class="my-1 border-gray-100">
                                <div class="px-4 py-2">
                                    <span class="text-[10px] font-bold text-gray-400 uppercase">Statut</span>
                                    <select class="order-status-select w-full mt-1 border border-gray-200 rounded text-sm p-1" data-id="${order.id}">
                                        ${Object.keys(STATUS_META).map(key => `<option value="${key}" ${key === status ? 'selected' : ''}>${STATUS_META[key][0]}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="px-4 py-2 border-t border-gray-100 mt-1">
                                    <span class="text-[10px] font-bold text-gray-400 uppercase">Paiement</span>
                                    <select class="order-payment-select w-full mt-1 border border-gray-200 rounded text-sm p-1" data-id="${order.id}">
                                        <option value="unpaid" ${paymentStatus === 'unpaid' ? 'selected' : ''}>Non payé</option>
                                        <option value="paid" ${paymentStatus === 'paid' ? 'selected' : ''}>Payé</option>
                                    </select>
                                </div>
                                <button class="btn-delete w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600" data-id="${order.id}">Supprimer</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attachement des événements
        tbody.querySelectorAll('.order-status-select').forEach(select => {
            select.addEventListener('change', () => updateOrderStatus(select.dataset.id, select.value));
        });
        tbody.querySelectorAll('.order-payment-select').forEach(select => {
            select.addEventListener('change', () => updatePaymentStatus(select.dataset.id, select.value));
        });

        tbody.querySelectorAll('.btn-notify').forEach(button => {
            button.addEventListener('click', () => {
                const order = currentOrders.find(entry => String(entry.id) === String(button.dataset.id));
                const message = `Bonjour ${order.client_name}, votre commande n° ${order.numero_commande || order.id} est prête.`;
                window.open(`https://wa.me/${formatPhoneForWhatsapp(order.client_phone)}?text=${encodeURIComponent(message)}`, '_blank');
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', () => deleteOrder(button.dataset.id));
        });
    }

    async function updateOrderStatus(orderId, status) {
        const payload = { status };
        if (status === 'collected' && currentOrders.find(order => String(order.id) === String(orderId))?.total_amount == null) {
            payload.total_amount = orderTotal(currentOrders.find(order => String(order.id) === String(orderId)));
        }
        const { error } = await supabaseClient.from('orders').update(payload).eq('id', orderId);
        if (error) {
            console.error(error);
            alert("Impossible de mettre à jour le statut.");
            return;
        }
        await supabaseClient.from('order_history').insert([{ order_id: orderId, status }]);
        await loadOrders();
    }

    async function updatePaymentStatus(orderId, paymentStatus) {
        const { error } = await supabaseClient.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
        if (error) {
            console.error(error);
            alert("Impossible de mettre à jour le paiement.");
            return;
        }
        await loadOrders();
    }

    async function loadOrders() {
        const tbody = document.getElementById('table-orders-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">Chargement...</td></tr>`;

        const { data, error } = await supabaseClient.from('orders').select('*').order('id', { ascending: false });
        if (error) {
            console.error(error);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500">Erreur de chargement : ${escapeHtml(error.message)}</td></tr>`;
            return;
        }

        currentOrders = data || [];
        await expireOverdueOrders(currentOrders);
        renderDashboard();
        renderSalesAndFinance();
        renderOrdersTable();
    }

    function toCsv(rows) {
        return rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    }

    function downloadCsv(filename, rows) {
        const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    document.getElementById('btn-refresh-orders')?.addEventListener('click', loadOrders);
    document.getElementById('orders-search')?.addEventListener('input', renderOrdersTable);
    document.getElementById('orders-status-filter')?.addEventListener('change', renderOrdersTable);
    document.getElementById('orders-date-filter')?.addEventListener('change', renderOrdersTable);
    
    document.getElementById('btn-export-orders')?.addEventListener('click', () => {
        const rows = [['id', 'numero_commande', 'client', 'phone', 'email', 'status', 'payment_status', 'qr_code', 'deadline', 'total']];
        getFilteredOrders().forEach(order => rows.push([
            order.id,
            order.numero_commande || '',
            order.client_name,
            order.client_phone,
            order.client_email,
            normalizeStatus(order.status),
            order.payment_status || 'unpaid',
            order.qr_code || '',
            getDeadline(order).toISOString().slice(0, 10),
            orderTotal(order)
        ]));
        downloadCsv('orders.csv', rows);
    });

    document.getElementById('btn-export-financial')?.addEventListener('click', () => {
        const rows = [['period', 'orders', 'revenue']];
        const grouped = {};
        currentOrders.filter(order => normalizeStatus(order.status) === 'collected').forEach(order => {
            const key = getCreatedDate(order).toISOString().slice(0, 7);
            grouped[key] ||= { orders: 0, revenue: 0 };
            grouped[key].orders += 1;
            grouped[key].revenue += orderTotal(order);
        });
        Object.entries(grouped).forEach(([period, value]) => rows.push([period, value.orders, value.revenue]));
        downloadCsv('financial-report.csv', rows);
    });

    document.getElementById('btn-export-best-products')?.addEventListener('click', () => {
        const rows = [['product', 'quantity', 'revenue']];
        getProductStats().products.forEach(item => rows.push([item.name, item.quantity, item.revenue]));
        downloadCsv('best-selling-products.csv', rows);
    });

    async function loadSiteSettings() {
        const { data, error } = await supabaseClient.from('site_settings').select('*');
        if (error) { console.error(error); return; }
        data.forEach(setting => {
            const input = document.getElementById(`set-${setting.key.replace('_', '-')}`);
            if (input) input.value = setting.value;
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

    document.getElementById('form-site-settings')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await supabaseClient.from('site_settings').update({ value: document.getElementById('set-rentree-enabled').value }).eq('key', 'rentree_enabled');
        await supabaseClient.from('site_settings').update({ value: document.getElementById('set-rentree-title').value }).eq('key', 'rentree_title');
        alert("Visibilité de l'onglet Rentrée mise à jour.");
    });

    document.getElementById('form-home-contacts')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const updates = {
            contact_address: document.getElementById('set-contact-address').value,
            contact_email: document.getElementById('set-contact-email').value,
            contact_phone: document.getElementById('set-contact-phone').value,
            contact_whatsapp: document.getElementById('set-contact-whatsapp').value,
            contact_facebook: document.getElementById('set-contact-facebook').value,
            contact_instagram: document.getElementById('set-contact-instagram').value,
            contact_linkedin: document.getElementById('set-contact-linkedin').value
        };
        for (const [key, value] of Object.entries(updates)) {
            await supabaseClient.from('site_settings').update({ value }).eq('key', key);
        }
        alert("Les coordonnées de contact ont été modifiées.");
        loadSiteSettings();
    });

    function renderAdminPreviewList() {
        if (!previewBox) return;
        if (!currentFormItems.length) {
            previewBox.innerHTML = "Aucun article ajouté pour le moment.";
            return;
        }
        previewBox.innerHTML = currentFormItems.map(item => {
            const availabilityLabel = item.availability === 'out_of_stock' ? 'Out of stock' : item.availability === 'almost_out' ? 'Almost out' : 'Available';
            return `
                <div class="flex justify-between items-center gap-3 bg-white p-2 border rounded-lg border-stone-200">
                    <span class="text-gray-700 font-medium min-w-0"><b class="text-[#E75C25] mr-1">[${escapeHtml(item.category)}]</b> ${escapeHtml(item.name)} - <b>${money(item.price)}</b> <em class="text-gray-400">(${availabilityLabel})</em></span>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button type="button" onclick="editSingleItemFromPack('${item.id}')" class="text-gray-500 hover:text-[#E75C25] font-bold px-1">✎</button>
                        <button type="button" onclick="removeSingleItemFromPack('${item.id}')" class="text-red-500 hover:text-red-700 font-bold px-1">×</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    if (btnAddItem) {
        btnAddItem.addEventListener('click', () => {
            const name = inputItemName.value.trim();
            const price = parseFloat(inputItemPrice.value);
            const category = selectItemCategory.value;
            const availability = inputItemAvailability.value || 'available';
            if (!name || Number.isNaN(price) || price < 0) {
                alert("Veuillez saisir un article et un prix valide.");
                return;
            }
            const item = { id: editingItemId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, category, price, availability };
            if (editingItemId) currentFormItems = currentFormItems.map(entry => entry.id === editingItemId ? item : entry);
            else currentFormItems.push(item);
            editingItemId = null;
            btnAddItem.textContent = "+ Insérer l'article au sac temporaire";
            inputItemName.value = '';
            inputItemPrice.value = '';
            inputItemAvailability.value = 'available';
            renderAdminPreviewList();
        });
    }

    window.removeSingleItemFromPack = function(id) {
        currentFormItems = currentFormItems.filter(item => item.id !== id);
        renderAdminPreviewList();
    };

    window.editSingleItemFromPack = function(id) {
        const item = currentFormItems.find(entry => entry.id === id);
        if (!item) return;
        editingItemId = id;
        selectItemCategory.value = item.category || 'Fournitures';
        inputItemName.value = item.name || '';
        inputItemPrice.value = Number(item.price || 0).toFixed(2);
        inputItemAvailability.value = item.availability || 'available';
        btnAddItem.textContent = "Mettre à jour l'article";
        inputItemName.focus();
    };

    function parseSchoolListItems(rawItems) {
        if (!rawItems) return [];
        try {
            if (typeof rawItems === 'string') return JSON.parse(rawItems);
            if (Array.isArray(rawItems)) {
                if (rawItems.length === 1 && typeof rawItems[0] === 'string' && rawItems[0].trim().startsWith('[')) return JSON.parse(rawItems[0]);
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
        if (formAdd) formAdd.reset();
        currentFormItems = [];
        if (inputItemAvailability) inputItemAvailability.value = 'available';
        renderAdminPreviewList();
        if (btnAddItem) btnAddItem.textContent = "+ Insérer l'article au sac temporaire";
        if (packFormTitle) packFormTitle.textContent = "📦 Créer un pack d'objets officiel";
        if (btnSavePack) btnSavePack.textContent = "Mettre en ligne le Pack d'objets";
        if (btnCancelEditPack) btnCancelEditPack.classList.add('hidden');
    }

    window.startEditSchoolList = function(id) {
        const list = window.schoolListsCache?.find(item => String(item.id) === String(id));
        if (!list) return;
        editingListId = list.id;
        document.getElementById('cfg-school').value = list.school_name || '';
        document.getElementById('cfg-level').value = list.level || '';
        currentFormItems = parseSchoolListItems(list.items).map((item, index) => ({
            id: item.id || `item-${Date.now()}-${index}`,
            name: item.name || String(item),
            category: item.category || 'Fournitures',
            price: parseFloat(item.price) || 0,
            availability: item.availability || 'available'
        }));
        renderAdminPreviewList();
        if (packFormTitle) packFormTitle.textContent = "✎ Modifier le pack d'objets";
        if (btnSavePack) btnSavePack.textContent = "Enregistrer les modifications";
        if (btnCancelEditPack) btnCancelEditPack.classList.remove('hidden');
        if (formAdd) formAdd.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    btnCancelEditPack?.addEventListener('click', resetPackForm);

    formAdd?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const school = document.getElementById('cfg-school').value.trim();
        const level = document.getElementById('cfg-level').value.trim();
        if (!school || !level || !currentFormItems.length) {
            alert("Veuillez saisir l'école, le niveau et au moins un article.");
            return;
        }
        const payload = { school_name: school, level, items: [JSON.stringify(currentFormItems)] };
        const { error } = editingListId
            ? await supabaseClient.from('school_lists').update(payload).eq('id', editingListId)
            : await supabaseClient.from('school_lists').insert([payload]);
        if (error) {
            console.error(error);
            alert(`Erreur lors de l'enregistrement : ${error.message}`);
            return;
        }
        resetPackForm();
        loadSchoolLists();
    });

    async function loadSchoolLists() {
        const container = document.getElementById('config-lists-container');
        if (!container) return;
        container.innerHTML = `<p class="text-gray-400 text-xs">Chargement...</p>`;
        const { data, error } = await supabaseClient.from('school_lists').select('*');
        if (error) {
            console.error(error);
            container.innerHTML = `<p class="text-red-500 text-xs">Erreur de chargement : ${escapeHtml(error.message)}</p>`;
            return;
        }
        window.schoolListsCache = data || [];
        container.innerHTML = window.schoolListsCache.map(list => {
            const items = parseSchoolListItems(list.items);
            const out = items.filter(item => item.availability === 'out_of_stock').length;
            return `
                <div class="bg-white p-5 rounded-2xl border flex flex-col justify-between shadow-sm">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <span class="text-xs font-bold text-[#E75C25] uppercase">${escapeHtml(list.school_name)}</span>
                            <h4 class="text-base font-bold text-gray-900">Classe : ${escapeHtml(list.level)}</h4>
                            <p class="text-xs text-stone-400 mt-1">${items.length} articles configurés · ${out} rupture</p>
                        </div>
                        <button type="button" class="btn-edit-list text-gray-400 hover:text-[#E75C25] transition" data-id="${list.id}" title="Modifier ce pack">✎</button>
                    </div>
                    <div class="flex items-center gap-4 mt-4">
                        <button class="btn-edit-list text-left text-xs font-semibold text-[#E75C25]" data-id="${list.id}">Modifier</button>
                        <button class="btn-delete-list text-left text-xs font-semibold text-red-600" data-id="${list.id}">Supprimer</button>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.btn-edit-list').forEach(button => button.addEventListener('click', () => startEditSchoolList(button.dataset.id)));
        document.querySelectorAll('.btn-delete-list').forEach(button => {
            button.addEventListener('click', async () => {
                if (!confirm("Supprimer ce pack ?")) return;
                await supabaseClient.from('school_lists').delete().eq('id', button.dataset.id);
                if (String(editingListId) === String(button.dataset.id)) resetPackForm();
                loadSchoolLists();
            });
        });
    }

    // Gestion du menu (Ouvrir/Fermer)
    window.toggleMenu = function(button) {
        const menu = button.nextElementSibling;
        // Ferme les autres menus ouverts
        document.querySelectorAll('.menu-dropdown').forEach(m => {
            if (m !== menu) m.classList.add('hidden');
        });
        menu.classList.toggle('hidden');
    };

    // Ferme le menu si on clique en dehors
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.relative')) {
            document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.add('hidden'));
        }
    });

    // Suppression d'une commande
    async function deleteOrder(orderId) {
        if (!confirm("Voulez-vous vraiment supprimer cette commande ?")) return;
        
        const { error } = await supabaseClient.from('orders').delete().eq('id', orderId);
        if (error) {
            alert("Erreur : " + error.message);
        } else {
            loadOrders();
        }
    }

    initAuth();
});