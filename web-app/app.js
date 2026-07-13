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
        if(targetId === 'section-rentree') updateStepper(1);
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    navButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.getAttribute('data-target'))));

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
                    const addr = document.getElementById('info-address');
                    const phone = document.getElementById('info-phone');
                    const email = document.getElementById('info-email');
                    const wa = document.getElementById('link-whatsapp');
                    if (s.key === 'contact_address' && addr) addr.innerText = s.value;
                    if (s.key === 'contact_phone' && phone) phone.innerText = s.value;
                    if (s.key === 'contact_email' && email) email.innerText = s.value;
                    if (s.key === 'contact_whatsapp' && wa) wa.href = `https://wa.me/${s.value}`;
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
    }

    function populateSchoolsDropdown() {
        const selectEcole = document.getElementById('select-ecole');
        if (!selectEcole) return;
        selectEcole.innerHTML = '<option value="">-- Choisir une école --</option>';
        const uniqueSchools = [...new Set(allSchoolData.map(item => item.school_name).filter(Boolean))];
        uniqueSchools.forEach(school => {
            const opt = document.createElement('option');
            opt.value = school; opt.innerText = school;
            selectEcole.appendChild(opt);
        });
    }

    document.getElementById('select-ecole').addEventListener('change', (e) => {
        const schoolName = e.target.value;
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
        const btnLoadPack = document.getElementById('btn-load-pack');
        if (btnLoadPack) {
            if (packId) btnLoadPack.classList.remove('hidden');
            else btnLoadPack.classList.add('hidden');
        }
    });

    // ==========================================
    // 4. GESTION DU CHOIX LISTE PERSONNALISEE
    // ==========================================
    const statusText = document.getElementById('upload-status-text');
    const btnCustomList = document.getElementById('btn-custom-list');

    if (btnCustomList) {
        btnCustomList.addEventListener('click', () => {
            isPhotoOrder = true;
            selectedPhotoFile = null;

            const schoolLabel = document.getElementById('display-school-name');
            const levelLabel = document.getElementById('display-level-name');
            if (schoolLabel) schoolLabel.innerText = "Liste personnalisée";
            if (levelLabel) levelLabel.innerText = "Import photo via page sécurisée";

            const itemsContainer = document.getElementById('liste-officielle-items');
            if (itemsContainer) {
                itemsContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center p-8 bg-orange-50/50 border border-dashed border-orange-200 rounded-2xl text-center">
                        <span class="text-4xl mb-2">📸</span>
                        <h5 class="text-sm font-black text-orange-800 font-header">Votre propre liste</h5>
                        <p class="text-xs text-stone-500 max-w-xs mt-1">Renseignez vos coordonnées. Après validation, vous serez redirigé vers la page d'import photo.</p>
                    </div>
                `;
            }

            const totalPriceEl = document.getElementById('pack-total-price');
            if (totalPriceEl) totalPriceEl.innerText = "Sur devis";

            updateStepper(3);
            document.getElementById('options-container')?.classList.add('hidden');
            document.getElementById('pack-details-view')?.classList.remove('hidden');
            document.getElementById('checkout-form-container')?.classList.remove('hidden');
            document.getElementById('btn-next-to-form')?.classList.add('hidden');
            document.getElementById('checkout-form-container')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

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
            
            updateStepper(2);
            document.getElementById('options-container').classList.add('hidden');
            document.getElementById('pack-details-view').classList.remove('hidden');
            window.scrollTo({top: 0, behavior: 'smooth'});
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
                    <span class="text-[11px] font-black ${isOutOfStock ? 'text-red-700 bg-red-50 border-red-100' : 'text-emerald-700 bg-emerald-50 border-emerald-200/50'} border px-2.5 py-0.5 rounded-lg flex-shrink-0">${availabilityText || item.price.toFixed(2) + ' DH'}</span>
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
    }

    // NAVIGATION DU PANIER DE COMMANDE
    const btnChangeChoice = document.getElementById('btn-change-choice-top');
    if (btnChangeChoice) {
        btnChangeChoice.addEventListener('click', () => {
            updateStepper(1);
            selectedPhotoFile = null;
            isPhotoOrder = false;
            if (statusText) statusText.innerText = "Fournir ma propre liste";
            document.getElementById('btn-next-to-form')?.classList.remove('hidden');
            document.getElementById('pack-details-view').classList.add('hidden');
            document.getElementById('checkout-form-container').classList.add('hidden');
            document.getElementById('options-container').classList.remove('hidden');
        });
    }

    const btnNextToForm = document.getElementById('btn-next-to-form');
    if (btnNextToForm) {
        btnNextToForm.addEventListener('click', () => {
            updateStepper(3);
            const formContainer = document.getElementById('checkout-form-container');
            if (formContainer) {
                formContainer.classList.remove('hidden');
                formContainer.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }


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
                        price: parseFloat(cb.getAttribute('data-price')) || 0
                    }));

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
        const statusLabel = ({ new: 'Commande reçue', preparing: 'En préparation', ready: 'Prête au retrait', notified: 'Notification envoyée', notifie: 'Notification envoyée', collected: 'Commande récupérée', cancelled: 'Commande annulée', expired: 'Réservation expirée', preparation: 'En préparation', prete: 'Prête au retrait', en_attente: 'Commande reçue' })[order.status] || order.status || 'Commande reçue';
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
        const labels = { new: 'Commande reçue', preparing: 'Préparation', ready: 'Prête au retrait', notified: 'Notification', notifie: 'Notification', collected: 'Récupérée' };
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

    function buildOrderTimeline(order, history = []) {
        const steps = [{ key: 'new', label: 'Commande' }, { key: 'preparing', label: 'Préparation' }, { key: 'ready', label: 'Prête au retrait' }, { key: 'notified', label: 'Notification' }, { key: 'collected', label: 'Récupérée' }];
        const currentStatus = normalizeTrackingStatus(order.status);
        const currentIndex = steps.findIndex(step => step.key === currentStatus);
        const eventMap = { new: order.created_at || order.inserted_at || null };
        history.forEach(event => { const key = normalizeTrackingStatus(event.status); if (!eventMap[key]) eventMap[key] = event.created_at; });
        const items = steps.map(step => {
            const index = steps.findIndex(s => s.key === step.key);
            const done = (currentIndex >= 0 && index <= currentIndex) || !!eventMap[step.key];
            return `<div class="relative flex flex-col items-center text-center min-w-[118px] flex-1 z-10"><div class="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm shadow-sm border-4 border-white ${done ? 'bg-emerald-400 text-white' : 'bg-stone-200 text-stone-400'}">✓</div><div class="font-black text-stone-800 text-xs sm:text-sm mt-3 leading-tight">${step.label}</div><div class="text-[11px] text-stone-500 mt-1 whitespace-nowrap">${done ? formatTrackingDate(eventMap[step.key]) : '-'}</div></div>`;
        }).join('');
        const progressIndex = Math.max(currentIndex, 0);
        const progressWidth = steps.length > 1 ? Math.min(100, Math.max(0, (progressIndex / (steps.length - 1)) * 100)) : 0;
        return `<div class="w-full overflow-x-auto pb-2 hide-scrollbar"><div class="relative min-w-[620px] px-2 pt-2"><div class="absolute top-[24px] left-[60px] right-[60px] h-1 bg-stone-200 rounded-full"></div><div class="absolute top-[24px] left-[60px] h-1 bg-emerald-400 rounded-full" style="width: calc((100% - 120px) * ${progressWidth / 100});"></div><div class="relative flex items-start justify-between gap-2">${items}</div></div></div>`;
    }

    const trackingForm = document.getElementById('order-tracking-form');
    if (trackingForm) {
        trackingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const resultBox = document.getElementById('tracking-result');
            const orderId = document.getElementById('tracking-order-id').value.trim().toUpperCase().replace('#', '');
            const phone = document.getElementById('tracking-phone').value.trim();
            if (!resultBox) return;
            resultBox.classList.remove('hidden');
            resultBox.className = "text-sm rounded-3xl border border-stone-200 p-5 bg-white shadow-sm";
            resultBox.innerHTML = "🔎 Recherche de votre commande...";
            if (!orderId) { resultBox.className = "text-sm rounded-2xl border p-4 bg-red-50 text-red-700 border-red-100"; resultBox.innerHTML = "Veuillez saisir votre numéro de commande ou votre code QR."; return; }
            const isQrSearch = orderId.startsWith('EQ-QR-');
            if (!isQrSearch && !phone) { resultBox.className = "text-sm rounded-2xl border p-4 bg-red-50 text-red-700 border-red-100"; resultBox.innerHTML = "Veuillez saisir le numéro de commande et le téléphone."; return; }
            const { data, error } = await supabaseClient.from('orders').select('*').eq(isQrSearch ? 'qr_code' : 'numero_commande', orderId).maybeSingle();
            if (error || !data || (!isQrSearch && normalizePhone(data.client_phone) !== normalizePhone(phone))) { resultBox.className = "text-sm rounded-2xl border p-4 bg-red-50 text-red-700 border-red-100"; resultBox.innerHTML = "Aucune commande trouvée. Vérifiez les informations saisies."; return; }
            const { data: historyData } = await supabaseClient.from('order_history').select('*').eq('order_id', data.id).order('created_at', { ascending: true });
            const history = historyData || [];
            const items = parseTrackingItems(data.items);
            const totalAmount = Number(data.total_amount ?? items.reduce((sum, item) => sum + (Number(item.price) || 0), 0));
            const paymentStatus = data.payment_status || 'unpaid';
            const qrCode = data.qr_code || '';
            const qrPayload = data.qr_payload || (qrCode ? buildQrPayload(qrCode) : buildQrPayload(data.numero_commande));
            const qrCanvasId = `tracking-qr-${data.id}`;
            const statusMap = { en_attente: '🟠 Commande reçue', new: '🟠 Commande reçue', preparation: '🔵 En préparation', preparing: '🔵 En préparation', prete: '🟢 Prête au retrait', ready: '🟢 Prête au retrait', notifie: '✅ Notification envoyée', notified: '✅ Notification envoyée', collected: '✅ Commande récupérée', cancelled: '❌ Commande annulée', expired: '⚫ Réservation expirée' };
            const readableStatus = statusMap[data.status] || data.status || 'Commande reçue';
            const photoOrder = items.some(i => i.type === 'photo_upload' || i.url || i.photo_url);
            const itemsHtml = !photoOrder && items.length > 0 ? items.map(item => `<div class="flex justify-between items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100"><span class="font-medium text-stone-700 truncate">${item.name || '-'}</span><span class="font-bold text-[#E75C25] flex-shrink-0">${(Number(item.price) || 0).toFixed(2)} DH</span></div>`).join('') : `<div class="bg-orange-50 border border-orange-100 rounded-xl p-4 text-orange-700">📸 Cette commande a été passée par photo. Notre équipe prépare actuellement votre liste.</div>`;
            resultBox.className = "bg-white border border-stone-200 rounded-3xl p-6 shadow-sm";
            resultBox.innerHTML = `<div class="space-y-8"><div class="border-b border-stone-100 pb-4"><h3 class="text-2xl font-black text-[#E75C25]">${data.numero_commande}</h3><p class="text-sm text-stone-500">Informations détaillées de votre commande</p></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="bg-stone-50 rounded-xl p-4"><div class="text-xs uppercase text-stone-400">Nom du client</div><div class="font-bold text-stone-800 mt-1">${data.client_name || '-'}</div></div><div class="bg-stone-50 rounded-xl p-4"><div class="text-xs uppercase text-stone-400">Téléphone</div><div class="font-bold text-stone-800 mt-1">${data.client_phone || '-'}</div></div><div class="bg-stone-50 rounded-xl p-4"><div class="text-xs uppercase text-stone-400">Adresse e-mail</div><div class="font-bold text-stone-800 mt-1 break-all">${data.client_email || '-'}</div></div><div class="bg-stone-50 rounded-xl p-4"><div class="text-xs uppercase text-stone-400">Nombre d'articles</div><div class="font-bold text-stone-800 mt-1">${items.length}</div></div></div><div><h4 class="font-black text-[#E75C25] mb-4">Liste commandée</h4><div class="space-y-2">${itemsHtml}</div></div><div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div class="bg-orange-50 border border-orange-100 rounded-xl p-4"><div class="text-xs uppercase text-orange-500">Prix à payer</div><div class="text-xl font-black text-[#E75C25] mt-1">${totalAmount > 0 ? totalAmount.toFixed(2) + ' DH' : 'Sur devis'}</div></div><div class="bg-stone-50 rounded-xl p-4"><div class="text-xs uppercase text-stone-400">Paiement</div><div class="font-bold mt-1">${paymentStatus === 'paid' ? '✅ Payé' : '⏳ Non payé'}</div></div><div class="bg-stone-50 rounded-xl p-4"><div class="text-xs uppercase text-stone-400">Statut</div><div class="font-bold mt-1 text-[#E75C25]">${readableStatus}</div></div></div><div class="border-t border-stone-100 pt-6"><h4 class="font-black text-[#E75C25] mb-4">QR Code de la commande</h4><div class="flex flex-col sm:flex-row items-center gap-5 bg-stone-50 border border-stone-100 rounded-2xl p-5"><canvas id="${qrCanvasId}" class="bg-white p-2 rounded-xl shadow-sm"></canvas><div class="flex-1 text-center sm:text-left"><p class="text-sm font-bold text-stone-800">Code QR : ${qrCode || '-'}</p><p class="text-xs text-stone-500 mt-1">Scannez ce QR code pour retrouver rapidement le suivi de cette commande.</p><button type="button" id="download-${qrCanvasId}" class="mt-3 bg-[#E75C25] hover:bg-[#CE4E1D] text-white text-xs font-black px-4 py-2.5 rounded-xl transition">Télécharger ma commande</button></div></div></div><div class="border-t border-stone-100 pt-6"><h4 class="font-black text-[#E75C25] mb-5">Suivi de progression</h4><div class="space-y-0">${buildOrderTimeline(data, history)}</div></div></div>`;
            renderQrToCanvas(qrCanvasId, qrPayload, `commande-${data.numero_commande || qrCode}.pdf`, { order: data, items, history });
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
    initClientData();
    updateStepper(1);
});