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

    // Initialisation Quill
    const quill = new Quill('#editor-container', {
        modules: { toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'header': [1, 2, 3, false] }], ['clean']] },
        placeholder: 'Rédigez la liste des fournitures ici...',
        theme: 'snow'
    });

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
    // 1. CHARGEMENT & ENVOI DES PARAMÈTRES SITE & CONTACTS
    // ==========================================
    async function loadSiteSettings() {
        const { data, error } = await supabaseClient.from('site_settings').select('*');
        if (error) { console.error(error); return; }

        data.forEach(setting => {
            // Volet Rentrée Scolaire
            if (setting.key === 'rentree_enabled') document.getElementById('set-rentree-enabled').value = setting.value;
            if (setting.key === 'rentree_title') document.getElementById('set-rentree-title').value = setting.value;

            // 🍊 Pré-remplissage des formulaires contacts de l'Accueil depuis la BDD
            if (setting.key === 'contact_address') document.getElementById('set-contact-address').value = setting.value;
            if (setting.key === 'contact_email') document.getElementById('set-contact-email').value = setting.value;
            if (setting.key === 'contact_phone') document.getElementById('set-contact-phone').value = setting.value;
            if (setting.key === 'contact_whatsapp') document.getElementById('set-contact-whatsapp').value = setting.value;
            
            // Réseaux Sociaux
            if (setting.key === 'contact_facebook') document.getElementById('set-contact-facebook').value = setting.value;
            if (setting.key === 'contact_instagram') document.getElementById('set-contact-instagram').value = setting.value;
            if (setting.key === 'contact_linkedin') document.getElementById('set-contact-linkedin').value = setting.value;
        });
    }

    // FORMULAIRE 1 : Sauvegarde État Rentrée Scolaire
    document.getElementById('form-site-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        const enabled = document.getElementById('set-rentree-enabled').value;
        const title = document.getElementById('set-rentree-title').value;

        await supabaseClient.from('site_settings').update({ value: enabled }).eq('key', 'rentree_enabled');
        await supabaseClient.from('site_settings').update({ value: title }).eq('key', 'rentree_title');
        alert("🍊 Visibilité de l'onglet Rentrée mise à jour !");
    });

    // 🍊 FORMULAIRE 2 : Sauvegarde Coordonnées Contacts & Réseaux Sociaux de l'Accueil
    document.getElementById('form-home-contacts').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const address = document.getElementById('set-contact-address').value;
        const email = document.getElementById('set-contact-email').value;
        const phone = document.getElementById('set-contact-phone').value;
        const whatsapp = document.getElementById('set-contact-whatsapp').value;
        const facebook = document.getElementById('set-contact-facebook').value;
        const instagram = document.getElementById('set-contact-instagram').value;
        const linkedin = document.getElementById('set-contact-linkedin').value;

        // Requêtes d'écritures groupées sécurisées vers la BDD
        await supabaseClient.from('site_settings').update({ value: address }).eq('key', 'contact_address');
        await supabaseClient.from('site_settings').update({ value: email }).eq('key', 'contact_email');
        await supabaseClient.from('site_settings').update({ value: phone }).eq('key', 'contact_phone');
        await supabaseClient.from('site_settings').update({ value: whatsapp }).eq('key', 'contact_whatsapp');
        await supabaseClient.from('site_settings').update({ value: facebook }).eq('key', 'contact_facebook');
        await supabaseClient.from('site_settings').update({ value: instagram }).eq('key', 'contact_instagram');
        await supabaseClient.from('site_settings').update({ value: linkedin }).eq('key', 'contact_linkedin');

        alert("✨ Les coordonnées de contact de la page d'accueil ont été modifiées avec succès !");
        loadSiteSettings();
    });

    // ==========================================
    // 2. GESTION DU TABLEAU DES COMMANDES
    // ==========================================
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
            let contenuFormatte = order.items;
            if(order.items && order.items.includes("http")) {
                contenuFormatte = `<a href="${order.items}" target="_blank" class="text-blue-600 hover:underline font-medium">👁️ Ouvrir la photo</a>`;
            }
            const badgeStatut = order.status === 'en_attente' 
                ? `<span class="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">En attente</span>`
                : `<span class="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">Notifié</span>`;

            tr.innerHTML = `<td class="p-4 font-bold text-gray-600">#${order.id}</td><td class="p-4 font-semibold">${order.client_name}</td><td class="p-4 text-gray-500">${order.client_phone}</td><td class="p-4 text-xs max-w-xs truncate">${contenuFormatte}</td><td class="p-4">${badgeStatut}</td><td class="p-4 text-right"><button class="btn-notify bg-[#E75C25] text-white text-xs font-medium px-3 py-1.5 rounded-lg">💬 Notifier</button></td>`;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-notify').forEach((btn, index) => {
            btn.addEventListener('click', async () => {
                const order = orders[index];
                const message = `Bonjour ${order.client_name}, votre commande n° ${order.id} est prête à la Papeterie Berkane !`;
                window.open(`https://wa.me/${order.client_phone}?text=${encodeURIComponent(message)}`, '_blank');
                await supabaseClient.from('orders').update({ status: 'notifie' }).eq('id', order.id);
                loadOrders();
            });
        });
    }
    document.getElementById('btn-refresh-orders').addEventListener('click', loadOrders);

    // ==========================================
    // 3. LOGIQUE DES CONFIGURATIONS DE FOURNITURES
    // ==========================================
    const formAdd = document.getElementById('form-add-list');
    formAdd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const school = document.getElementById('cfg-school').value;
        const level = document.getElementById('cfg-level').value;
        const htmlContent = quill.getSemanticHTML(); 

        const { error } = await supabaseClient.from('school_lists').insert([{ school_name: school, level: level, items: [htmlContent] }]);
        if (error) { alert("Erreur."); } else { formAdd.reset(); quill.setContents([]); loadSchoolLists(); }
    });

    async function loadSchoolLists() {
        const container = document.getElementById('config-lists-container');
        container.innerHTML = `<p class="text-gray-400 text-xs">Chargement...</p>`;
        const { data: lists, error } = await supabaseClient.from('school_lists').select('*');
        if (error) return;
        container.innerHTML = "";

        lists.forEach(list => {
            const div = document.createElement('div');
            div.className = "bg-white p-5 rounded-2xl border flex flex-col justify-between shadow-sm";
            div.innerHTML = `<div><span class="text-xs font-bold text-[#E75C25] uppercase">${list.school_name}</span><h4 class="text-base font-bold text-gray-900">Classe : ${list.level}</h4></div><button class="btn-delete-list text-left text-xs font-semibold text-red-600 mt-4" data-id="${list.id}">🗑️ Supprimer</button>`;
            container.appendChild(div);
        });

        document.querySelectorAll('.btn-delete-list').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(confirm("Supprimer ?")) {
                    await supabaseClient.from('school_lists').delete().eq('id', btn.getAttribute('data-id'));
                    loadSchoolLists();
                }
            });
        });
    }

    loadOrders();
});