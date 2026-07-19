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


    const adminV2Style=document.createElement('style');adminV2Style.textContent=`
    #pane-orders{padding-bottom:150px!important}#orders-pagination{position:relative!important;z-index:80!important;margin:15px 0 110px!important;padding:14px 16px!important;background:#fff!important;border:1px solid #eee7df!important;border-radius:15px!important;box-shadow:0 12px 30px #1c191714!important}#orders-pagination button{position:relative;z-index:82;pointer-events:auto}
    .admin-orders-v2{width:100%;border-collapse:separate!important;border-spacing:0 9px!important}.admin-orders-v2 thead th{padding:10px 14px!important;color:#8a817a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.09em;white-space:nowrap}.order-v2{cursor:pointer;transition:.18s}.order-v2 td{padding:14px!important;background:#fff;border-top:1px solid #eee7df;border-bottom:1px solid #eee7df;vertical-align:middle}.order-v2 td:first-child{border-left:1px solid #eee7df;border-radius:14px 0 0 14px}.order-v2 td:last-child{border-right:1px solid #eee7df;border-radius:0 14px 14px 0}.order-v2:hover td{background:#fffaf7}.sub{display:block;margin-top:3px;color:#a8a29e;font-size:10px}.chip-btn{position:relative;display:inline-flex}.chip-face{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:88px;padding:8px 11px;border-radius:999px;border:1px solid;font-size:11px;font-weight:900;white-space:nowrap;transition:.17s}.chip-arrow{width:0;opacity:0;overflow:hidden;transition:.17s}.chip-btn:hover .chip-arrow{width:10px;opacity:1}.chip-btn:hover .chip-face{transform:translateY(-1px);box-shadow:0 8px 18px #1c191719}.s-new{background:#fffbeb;color:#b45309;border-color:#fde68a}.s-preparing{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}.s-ready{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.s-collected{background:#1c1917;color:#fff;border-color:#1c1917}.s-cancelled{background:#fef2f2;color:#b91c1c;border-color:#fecaca}.s-expired{background:#f3f4f6;color:#4b5563;border-color:#e5e7eb}.p-paid{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.p-unpaid{background:#fffbeb;color:#b45309;border-color:#fde68a}
    .chip-pop{position:fixed;z-index:2147483600;min-width:176px;padding:7px;border:1px solid #ebe5df;border-radius:14px;background:#fffffff8;box-shadow:0 22px 60px #1c191733;backdrop-filter:blur(14px)}.chip-opt{width:100%;display:flex;justify-content:space-between;padding:9px 10px;border-radius:10px;font-size:12px;font-weight:800;color:#44403c}.chip-opt:hover,.chip-opt.on{background:#fff1e8;color:#E75C25}.chip-opt i{opacity:0}.chip-opt.on i{opacity:1}
    .acts{display:inline-flex;gap:6px}.act{width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid transparent;transition:.16s}.act:hover{transform:translateY(-2px)}.act svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.wa{color:#168b27}.wa:hover{background:#ecfdf3;border-color:#bbf7d0}.pr{color:#1c1917}.pr:hover{background:#f5f5f4;border-color:#d6d3d1}.del{color:#dc2626}.del:hover{background:#fef2f2;border-color:#fecaca}
    .ord-modal{position:fixed;inset:0;z-index:2147483500;display:none;align-items:center;justify-content:center;padding:18px;background:#0c0a0985;backdrop-filter:blur(8px)}.ord-modal.open{display:flex}.ord-card{width:min(920px,100%);max-height:90vh;overflow:hidden;background:#fff;border-radius:24px;box-shadow:0 35px 100px #0005}.ord-head{display:flex;justify-content:space-between;padding:24px;background:linear-gradient(135deg,#fff,#fff6ef);border-bottom:1px solid #eee7df}.ord-body{max-height:calc(90vh - 120px);overflow:auto}.ord-summary{display:grid;grid-template-columns:1.3fr .7fr;gap:14px;padding:20px 24px 0}.customer,.total{padding:18px;border-radius:18px}.customer{background:#fcfbfa;border:1px solid #eee7df}.total{color:#fff;background:linear-gradient(135deg,#E75C25,#f58a56);box-shadow:0 18px 40px #e75c2538}.total strong{display:block;font-size:26px;margin-top:5px}.details{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px 24px}.detail{padding:14px;border:1px solid #eee7df;border-radius:15px;background:#fcfbfa}.lab{display:block;font-size:10px;font-weight:900;text-transform:uppercase;color:#a8a29e}.val{display:block;margin-top:5px;font-size:13px;font-weight:800;overflow-wrap:anywhere}.items{padding:0 24px 24px}.item{display:grid;grid-template-columns:1fr auto;gap:15px;padding:12px;border-bottom:1px solid #eee7df;font-size:12px}.order-instructions-admin{margin:0 24px 20px;padding:16px 18px;border:1px solid #fed7c1;border-radius:16px;background:#fff8f3}.order-instructions-admin p{margin:7px 0 0;color:#44403c;font-size:13px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.close{width:38px;height:38px;border-radius:12px;background:#f5f5f4;font-size:22px}@media(max-width:900px){.admin-orders-v2{min-width:1120px}}@media(max-width:700px){.ord-summary{grid-template-columns:1fr}.details{grid-template-columns:1fr 1fr}}`;
    document.head.appendChild(adminV2Style);
    function closePop(){document.getElementById('chip-pop')?.remove()}
    function chip(id,type,val){const status=type==='status', label=status?(STATUS_META[val]?.[0]||val):(val==='paid'?'Payé':'Non payé'),cls=status?'s-'+val:'p-'+val;return `<button class="chip-btn" data-chip="${type}" data-id="${id}" data-val="${val}"><span class="chip-face ${cls}">${label}<span class="chip-arrow">⌄</span></span></button>`}
    function bindChips(root){root.querySelectorAll('[data-chip]').forEach(x=>x.addEventListener('click',e=>{e.stopPropagation();closePop();const type=x.dataset.chip,val=x.dataset.val,id=x.dataset.id,opts=type==='status'?Object.entries(STATUS_META).map(([v,m])=>[v,m[0]]):[['unpaid','Non payé'],['paid','Payé']],p=document.createElement('div');p.id='chip-pop';p.className='chip-pop';p.innerHTML=opts.map(([v,l])=>`<button class="chip-opt ${v===val?'on':''}" data-v="${v}"><span>${l}</span><i>✓</i></button>`).join('');document.body.appendChild(p);const r=x.getBoundingClientRect();p.style.left=Math.max(10,Math.min(innerWidth-186,r.left))+'px';p.style.top=(r.bottom+8+p.offsetHeight>innerHeight?Math.max(10,r.top-p.offsetHeight-8):r.bottom+8)+'px';p.querySelectorAll('.chip-opt').forEach(o=>o.onclick=async ev=>{ev.stopPropagation();closePop();if(o.dataset.v===val)return;if(type==='status')await updateOrderStatus(id,o.dataset.v);else await updatePaymentStatus(id,o.dataset.v)})}))}
    function printOrder(id){const o=currentOrders.find(x=>String(x.id)===String(id));if(!o)return;const it=parseItems(o.items),w=window.open('','_blank','width=900,height=760');if(!w)return alert('Autorisez les popups pour imprimer.');w.document.write(`<!doctype html><meta charset="utf-8"><title>Commande</title><style>body{font-family:Arial;margin:35px;color:#292524}h1{color:#E75C25}header{display:flex;justify-content:space-between;border-bottom:3px solid #E75C25}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#fff4ec}</style><header><div><h1>Librairie El Qods</h1><p>#${escapeHtml(o.numero_commande||o.id)}</p></div><h2>${money(orderTotal(o))}</h2></header><p><b>${escapeHtml(o.client_name||'-')}</b><br>${escapeHtml(o.client_phone||'-')} · ${escapeHtml(o.client_email||'-')}</p><table><tr><th>#</th><th>Article</th><th>Catégorie</th><th>Prix</th></tr>${it.map((a,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(a.name||'-')}</td><td>${escapeHtml(a.category||'-')}</td><td>${money(a.price)}</td></tr>`).join('')}</table><script>onload=()=>print()</script>`);w.document.close()}
    function closeOrder(){document.getElementById('ord-modal')?.classList.remove('open');document.body.style.overflow=''}
    function openOrder(id){const o=currentOrders.find(x=>String(x.id)===String(id));if(!o)return;const it=parseItems(o.items),st=normalizeStatus(o.status),d=getDeadline(o);let m=document.getElementById('ord-modal');if(!m){m=document.createElement('div');m.id='ord-modal';m.className='ord-modal';m.onclick=e=>{if(e.target===m)closeOrder()};document.body.appendChild(m)}const rows=it.length?it.map((a,i)=>`<div class="item"><span><b>${i+1}.</b> ${escapeHtml(a.name||'-')}<small class="sub">${escapeHtml(a.category||'Fournitures')}</small></span><b>${money(a.price)}</b></div>`).join(''):'<div class="detail">Liste importée ou aucun article détaillé.</div>';m.innerHTML=`<div class="ord-card"><div class="ord-head"><div><span class="lab">Commande client</span><h2 class="text-3xl font-black mt-1">#${escapeHtml(o.numero_commande||o.id)}</h2><div class="flex gap-2 mt-3">${chip(o.id,'status',st)}${chip(o.id,'payment',o.payment_status||'unpaid')}</div></div><button class="close">×</button></div><div class="ord-body"><div class="ord-summary"><div class="customer"><span class="lab">Client</span><b class="block text-lg mt-1">${escapeHtml(o.client_name||'-')}</b><span class="block text-sm text-stone-500 mt-2">${escapeHtml(o.client_phone||'-')}</span><span class="block text-sm text-stone-500">${escapeHtml(o.client_email||'-')}</span></div><div class="total"><span class="lab text-white/70">Total</span><strong>${money(orderTotal(o))}</strong><span class="text-xs text-white/75">Paiement au retrait</span></div></div><div class="details"><div class="detail"><span class="lab">Échéance</span><span class="val">${d.toLocaleDateString('fr-FR')}</span></div><div class="detail"><span class="lab">Créée le</span><span class="val">${getCreatedDate(o).toLocaleString('fr-FR')}</span></div><div class="detail"><span class="lab">Code QR</span><span class="val">${escapeHtml(o.qr_code||'-')}</span></div></div>${o.order_instructions ? `<div class="order-instructions-admin"><span class="lab">Consignes pour la commande</span><p>${escapeHtml(o.order_instructions)}</p></div>` : ''}<div class="items"><div class="flex justify-between mb-2"><h3 class="font-black">Articles commandés</h3><span class="sub">${it.length} article(s)</span></div><div class="border rounded-2xl overflow-hidden">${rows}</div></div></div></div>`;m.querySelector('.close').onclick=closeOrder;bindChips(m);m.classList.add('open');document.body.style.overflow='hidden'}
    window.printAdminOrder=printOrder;window.openAdminOrderModal=openOrder;window.closeAdminOrderModal=closeOrder;

    let currentOrders = [];
    let currentOrdersPage = 1;
    const ORDERS_PER_PAGE = 10;
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
    const paneMetrics = document.getElementById('pane-metrics');
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

    // ==========================================
    // SIDEBAR COLLAPSIBLE
    // ==========================================
    const sidebar = document.getElementById('admin-sidebar');
    const sidebarToggle = document.getElementById('btn-sidebar-toggle');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');

    function setSidebarCollapsed(collapsed) {
        if (!sidebar) return;
        sidebar.classList.toggle('w-56', !collapsed);
        sidebar.classList.toggle('w-24', collapsed);
        sidebar.querySelectorAll('.sidebar-label').forEach(el => el.classList.toggle('hidden', collapsed));
        sidebar.querySelectorAll('.sidebar-icon-only').forEach(el => el.classList.toggle('hidden', !collapsed));
        const brandBlock = sidebar.querySelector('.admin-brand-block');
        const logo = sidebar.querySelector('.admin-sidebar-logo');
        if (brandBlock) {
            brandBlock.classList.toggle('items-center', collapsed);
            brandBlock.classList.toggle('items-start', !collapsed);
        }
        if (logo) logo.classList.toggle('mx-auto', collapsed);
        sidebar.querySelectorAll('nav button').forEach(btn => {
            btn.classList.toggle('justify-center', collapsed);
            btn.classList.toggle('space-x-3', !collapsed);
            btn.classList.toggle('space-x-0', collapsed);
            btn.title = collapsed ? (btn.textContent || '').trim() : '';
        });
        if (sidebarToggleIcon) sidebarToggleIcon.textContent = collapsed ? '›' : '‹';
        localStorage.setItem('elqods-admin-sidebar-collapsed', collapsed ? 'true' : 'false');
    }

    sidebarToggle?.addEventListener('click', () => {
        const collapsed = !sidebar?.classList.contains('w-24');
        setSidebarCollapsed(collapsed);
    });

    document.getElementById('btn-top-refresh')?.addEventListener('click', () => loadOrders());

    setSidebarCollapsed(localStorage.getItem('elqods-admin-sidebar-collapsed') === 'true');


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
    document.getElementById('btn-admin-logout-top')?.addEventListener('click', async () => {
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
        paneOrders?.classList.toggle('hidden', target !== 'orders');
        paneMetrics?.classList.toggle('hidden', target !== 'metrics');
        paneConfig?.classList.toggle('hidden', target !== 'config');
        paneTabsConfig?.classList.toggle('hidden', target !== 'settings');

        document.querySelectorAll('.admin-float-link').forEach(button => {
            const activeFloat = button.dataset.pane === target;
            button.classList.toggle('bg-white/15', activeFloat);
            button.classList.toggle('shadow-inner', activeFloat);
            button.classList.toggle('hover:bg-white/10', !activeFloat);
        });
        if (target === 'orders') loadOrders();
        if (target === 'metrics') loadOrders();
        if (target === 'config') loadSchoolLists();
        if (target === 'settings') loadSiteSettings();
    }

    btnOrders?.addEventListener('click', () => switchAdminPane('orders'));
    btnConfig?.addEventListener('click', () => switchAdminPane('config'));
    btnTabsConfig?.addEventListener('click', () => switchAdminPane('settings'));
    document.querySelectorAll('.admin-float-link').forEach(button => {
        button.addEventListener('click', () => switchAdminPane(button.dataset.pane));
    });

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

        const gradients = [
            'from-sky-400 to-blue-600',
            'from-[#E75C25] to-orange-700',
            'from-emerald-400 to-green-600',
            'from-violet-400 to-indigo-600',
            'from-rose-400 to-red-600',
            'from-slate-500 to-slate-800',
            'from-amber-400 to-orange-500',
            'from-cyan-400 to-blue-500'
        ];
        const icons = ['📦', '⏳', '✅', '🛍️', '✕', '⌛', '💰', '📈'];
        document.getElementById('dashboard-cards').innerHTML = cards.map(([label, value], index) => `
            <div class="relative overflow-hidden rounded-[1.7rem] p-4 min-h-[94px] text-white shadow-lg bg-gradient-to-r ${gradients[index % gradients.length]}">
                <div class="absolute -right-8 -bottom-10 w-32 h-32 bg-white/15 rounded-full"></div>
                <div class="absolute right-8 top-3 w-12 h-12 bg-white/10 rounded-2xl rotate-12"></div>
                <div class="relative flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center text-xl">${icons[index % icons.length]}</div>
                    <div>
                        <div class="text-[11px] text-white/80 font-bold uppercase">${label}</div>
                        <div class="text-2xl font-black mt-0.5">${value}</div>
                    </div>
                </div>
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

    function renderOrdersPagination(totalOrders, totalPages) {
        const container = document.getElementById('orders-pagination');
        if (!container) return;
        if (!totalOrders) {
            container.innerHTML = `<div class="text-xs text-gray-400 font-semibold">Aucune commande à paginer</div>`;
            return;
        }
        const start = (currentOrdersPage - 1) * ORDERS_PER_PAGE + 1;
        const end = Math.min(currentOrdersPage * ORDERS_PER_PAGE, totalOrders);
        container.innerHTML = `
            <div class="text-xs text-gray-500 font-semibold">Affichage ${start}-${end} sur ${totalOrders} commandes</div>
            <div class="flex items-center gap-2">
                <button id="btn-orders-prev" class="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold ${currentOrdersPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}" ${currentOrdersPage <= 1 ? 'disabled' : ''}>Précédent</button>
                <span class="px-3 py-2 rounded-xl bg-[#E75C25] text-white text-xs font-black">${currentOrdersPage} / ${totalPages}</span>
                <button id="btn-orders-next" class="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold ${currentOrdersPage >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}" ${currentOrdersPage >= totalPages ? 'disabled' : ''}>Suivant</button>
            </div>`;
        document.getElementById('btn-orders-prev')?.addEventListener('click', () => { if (currentOrdersPage > 1) { currentOrdersPage -= 1; renderOrdersTable(); document.getElementById('table-orders-body')?.closest('table')?.scrollIntoView({behavior:'smooth'}); } });
        document.getElementById('btn-orders-next')?.addEventListener('click', () => { if (currentOrdersPage < totalPages) { currentOrdersPage += 1; renderOrdersTable(); document.getElementById('table-orders-body')?.closest('table')?.scrollIntoView({behavior:'smooth'}); } });
    }

    function renderOrdersTable(){const tb=document.getElementById('table-orders-body'),f=getFilteredOrders(),pages=Math.max(1,Math.ceil(f.length/ORDERS_PER_PAGE));if(currentOrdersPage>pages)currentOrdersPage=pages;const os=f.slice((currentOrdersPage-1)*ORDERS_PER_PAGE,currentOrdersPage*ORDERS_PER_PAGE);if(!tb)return;const table=tb.closest('table');table?.classList.add('admin-orders-v2');const hr=table?.querySelector('thead tr');if(hr)hr.innerHTML='<th>Commande</th><th>Client</th><th>Téléphone</th><th>Contenu</th><th>Statut</th><th>Paiement</th><th>Échéance</th><th class="text-right">Actions</th>';renderOrdersPagination(f.length,pages);if(!os.length){tb.innerHTML='<tr><td colspan="8" class="p-6 text-center text-gray-400">Aucune commande.</td></tr>';return}tb.innerHTML=os.map(o=>{const st=normalizeStatus(o.status),it=parseItems(o.items),d=getDeadline(o),photo=it.find(a=>a.type==='photo_upload'||a.url||a.photo_url),content=photo?'📸 Liste importée':`${it.length} articles`;return `<tr class="order-v2" data-id="${o.id}" tabindex="0"><td><b class="text-[#E75C25]">#${escapeHtml(o.numero_commande||o.id)}</b></td><td><b>${escapeHtml(o.client_name||'-')}</b><span class="sub">${escapeHtml(o.client_email||'-')}</span></td><td>${escapeHtml(o.client_phone||'-')}</td><td><b>${content}</b><span class="sub">${money(orderTotal(o))}</span></td><td>${chip(o.id,'status',st)}</td><td>${chip(o.id,'payment',o.payment_status||'unpaid')}</td><td class="text-xs text-stone-500">${d.toLocaleDateString('fr-FR')} (${daysUntil(d)}j)</td><td><div class="acts"><button class="act wa notify" data-id="${o.id}" title="WhatsApp"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.45L3 20l1.05-5.25A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8.2 7.9c.3 2.9 2.7 5.3 5.6 5.7l1.4-1.4"/></svg></button><button class="act pr print" data-id="${o.id}" title="Imprimer"><svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/></svg></button><button class="act del delete" data-id="${o.id}" title="Supprimer"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></svg></button></div></td></tr>`}).join('');tb.querySelectorAll('.order-v2').forEach(r=>r.onclick=e=>{if(!e.target.closest('button'))openOrder(r.dataset.id)});bindChips(tb);tb.querySelectorAll('.notify').forEach(x=>x.onclick=e=>{e.stopPropagation();const o=currentOrders.find(a=>String(a.id)===String(x.dataset.id));window.open(`https://wa.me/${formatPhoneForWhatsapp(o.client_phone)}?text=${encodeURIComponent(`Bonjour ${o.client_name}, votre commande n° ${o.numero_commande||o.id} est prête.`)}`,'_blank')});tb.querySelectorAll('.print').forEach(x=>x.onclick=e=>{e.stopPropagation();printOrder(x.dataset.id)});tb.querySelectorAll('.delete').forEach(x=>x.onclick=e=>{e.stopPropagation();deleteOrder(x.dataset.id)})}

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
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400">Chargement...</td></tr>`;

        const { data, error } = await supabaseClient.from('orders').select('*').order('id', { ascending: false });
        if (error) {
            console.error(error);
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-red-500">Erreur de chargement : ${escapeHtml(error.message)}</td></tr>`;
            return;
        }

        currentOrders = (data || []).filter(order => normalizeStatus(order.status) !== 'draft_google_form');
        currentOrdersPage = 1;
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
    document.getElementById('orders-search')?.addEventListener('input', () => { currentOrdersPage = 1; renderOrdersTable(); });
    document.getElementById('orders-status-filter')?.addEventListener('change', () => { currentOrdersPage = 1; renderOrdersTable(); });
    document.getElementById('orders-date-filter')?.addEventListener('change', () => { currentOrdersPage = 1; renderOrdersTable(); });
    
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

    function normalizeDriveImageUrl(url) {
        const value = String(url || '').trim();
        if (!value) return '';
        const driveMatch = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
        return driveMatch ? `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800` : value;
    }

    function updateSchoolLogoPreview() {
        const input = document.getElementById('cfg-school-logo-url');
        const preview = document.getElementById('cfg-school-logo-preview');
        const image = preview?.querySelector('img');
        if (!input || !preview || !image) return;
        const src = normalizeDriveImageUrl(input.value);
        if (!src) {
            preview.classList.add('hidden');
            preview.classList.remove('flex');
            image.removeAttribute('src');
            return;
        }
        image.src = src;
        image.onload = () => { preview.classList.remove('hidden'); preview.classList.add('flex'); };
        image.onerror = () => { preview.classList.add('hidden'); preview.classList.remove('flex'); };
    }

    document.getElementById('cfg-school-logo-url')?.addEventListener('input', updateSchoolLogoPreview);

    function resetPackForm() {
        editingListId = null;
        editingItemId = null;
        if (formAdd) formAdd.reset();
        updateSchoolLogoPreview();
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
        document.getElementById('cfg-school-logo-url').value = list.school_logo_url || '';
        updateSchoolLogoPreview();
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
        const schoolLogoUrl = document.getElementById('cfg-school-logo-url').value.trim();
        const level = document.getElementById('cfg-level').value.trim();
        if (!school || !level || !currentFormItems.length) {
            alert("Veuillez saisir l'école, le niveau et au moins un article.");
            return;
        }
        const payload = { school_name: school, school_logo_url: schoolLogoUrl || null, level, items: [JSON.stringify(currentFormItems)] };
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
                        <div class="flex items-start gap-3">
                            ${list.school_logo_url ? `<span class="shrink-0 w-11 h-11 rounded-xl border border-gray-200 bg-white p-1.5 flex items-center justify-center overflow-hidden"><img src="${escapeHtml(normalizeDriveImageUrl(list.school_logo_url))}" alt="" class="max-w-full max-h-full object-contain" onerror="this.parentElement.style.display='none'"></span>` : ''}
                            <div>
                            <span class="text-xs font-bold text-[#E75C25] uppercase">${escapeHtml(list.school_name)}</span>
                            <h4 class="text-base font-bold text-gray-900">Classe : ${escapeHtml(list.level)}</h4>
                            <p class="text-xs text-stone-400 mt-1">${items.length} articles configurés · ${out} rupture</p>
                            </div>
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
        const menu = button.closest('.relative')?.querySelector('.menu-dropdown');
        if (!menu) return;
        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            if (dropdown !== menu) dropdown.classList.add('hidden');
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


    // FOURNITURES INDÉPENDANTES - PACKS SCOLAIRES
    const supplyAdminForm = document.getElementById('form-supply-item');
    const supplyAdminList = document.getElementById('supply-items-admin-list');
    const supplyEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

    function resetSupplyAdminForm() {
        if (!supplyAdminForm) return;
        supplyAdminForm.reset();
        document.getElementById('supply-item-id').value = '';
        document.getElementById('supply-item-category').value = 'Fournitures';
        document.getElementById('supply-item-active').checked = true;
        document.getElementById('cancel-supply-edit')?.classList.add('hidden');
    }

    async function loadSupplyAdmin() {
        if (!supplyAdminList) return;
        supplyAdminList.innerHTML = '<p class="text-xs text-gray-400">Chargement des fournitures…</p>';
        const { data, error } = await supabaseClient.from('supply_items').select('*').order('name', { ascending: true });
        if (error) {
            supplyAdminList.innerHTML = `<p class="text-xs text-red-600">${supplyEscape(error.message)}</p>`;
            return;
        }
        const supplies = data || [];
        supplyAdminList.innerHTML = supplies.length ? supplies.map(item => `
            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center border border-gray-200 rounded-xl p-3 ${item.is_active === false ? 'opacity-50' : ''}">
                <div class="min-w-0"><b class="block text-sm text-gray-900 truncate">${supplyEscape(item.name)}</b><span class="block text-[11px] text-gray-400 mt-1">${supplyEscape(item.category || 'Fournitures')} · Standard ${Number(item.standard_price || 0).toFixed(2)} DH · Qualité ${Number(item.quality_price || 0).toFixed(2)} DH · ${item.is_active === false ? 'Masquée' : 'Active'}</span></div>
                <div class="flex gap-2"><button type="button" class="edit-supply px-3 py-2 border border-gray-200 rounded-lg text-xs font-black" data-id="${item.id}">Modifier</button><button type="button" class="delete-supply px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-black" data-id="${item.id}">Supprimer</button></div>
            </div>`).join('') : '<p class="text-xs text-gray-400">Aucune fourniture configurée.</p>';
        supplyAdminList.querySelectorAll('.edit-supply').forEach(button => button.addEventListener('click', () => {
            const item = supplies.find(entry => String(entry.id) === String(button.dataset.id));
            if (!item) return;
            document.getElementById('supply-item-id').value = item.id;
            document.getElementById('supply-item-name').value = item.name || '';
            document.getElementById('supply-item-category').value = item.category || 'Fournitures';
            document.getElementById('supply-item-standard').value = item.standard_price || 0;
            document.getElementById('supply-item-quality').value = item.quality_price || 0;
            document.getElementById('supply-item-active').checked = item.is_active !== false;
            document.getElementById('cancel-supply-edit')?.classList.remove('hidden');
        }));
        supplyAdminList.querySelectorAll('.delete-supply').forEach(button => button.addEventListener('click', async () => {
            if (!confirm('Supprimer cette fourniture ?')) return;
            const { error: deleteError } = await supabaseClient.from('supply_items').delete().eq('id', button.dataset.id);
            if (deleteError) return alert(deleteError.message);
            await loadSupplyAdmin();
        }));
    }

    supplyAdminForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const id = document.getElementById('supply-item-id').value;
        const payload = {
            name: document.getElementById('supply-item-name').value.trim(),
            category: document.getElementById('supply-item-category').value.trim() || 'Fournitures',
            standard_price: Number(document.getElementById('supply-item-standard').value) || 0,
            quality_price: Number(document.getElementById('supply-item-quality').value) || 0,
            is_active: document.getElementById('supply-item-active').checked
        };
        const request = id ? supabaseClient.from('supply_items').update(payload).eq('id', id) : supabaseClient.from('supply_items').insert([payload]);
        const { error } = await request;
        if (error) return alert(error.message);
        resetSupplyAdminForm();
        await loadSupplyAdmin();
    });
    document.getElementById('cancel-supply-edit')?.addEventListener('click', resetSupplyAdminForm);
    loadSupplyAdmin();
});