document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. CONFIGURATION & MONTEUR SUPABASE
    // ==========================================
    const SUPABASE_URL = "https://plctxriaczdmjwwhfwny.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_h7UcqRKK-nqchzlzwoALaQ_7N4RGR-R";
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const RESERVATION_DAYS = 5;

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
    // 4. GESTION DE L'UPLOAD PHOTO
    // ==========================================
    const fileInput = document.getElementById('image-file-input');
    const statusText = document.getElementById('upload-status-text');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length === 0) return;
            
            const file = e.target.files[0];
            isPhotoOrder = true; 
            selectedPhotoFile = file;
            if (statusText) statusText.innerText = "✓ Fichier joint : " + file.name;

            const schoolLabel = document.getElementById('display-school-name');
            const levelLabel = document.getElementById('display-level-name');
            if (schoolLabel) schoolLabel.innerText = "Liste personnalisée (Par Photo)";
            if (levelLabel) levelLabel.innerText = "Analyse manuelle par l'équipe El Qods";
            
            const itemsContainer = document.getElementById('liste-officielle-items');
            if (itemsContainer) {
                itemsContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center p-8 bg-emerald-50/40 border border-dashed border-emerald-200 rounded-2xl text-center">
                        <span class="text-4xl mb-2">📸</span>
                        <h5 class="text-sm font-black text-emerald-800 font-header">Votre liste a été enregistrée !</h5>
                        <p class="text-xs text-stone-500 max-w-xs mt-1">Nos préparateurs vont décoder l'image pour préparer votre panier au prix le plus juste.</p>
                    </div>
                `;
            }

            const totalPriceEl = document.getElementById('pack-total-price');
            if (totalPriceEl) totalPriceEl.innerText = "Sur devis";

            updateStepper(2);
            document.getElementById('options-container').classList.add('hidden');
            document.getElementById('pack-details-view').classList.remove('hidden');
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
    }

    // ==========================================
    // 5. CLIC SUR "SUIVANT" (👑 EXTRACTEUR ROBUSTE ANTI-0 DH)
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

                // Parcours et conversion stricte pour chaque objet trouvé
                parsedItems = rawArray.map((item, index) => {
                    if (item && typeof item === 'object' && item.name) {
                        
                        // Extraction sécurisée du prix (parcours des clés en cas d'insensibilité à la casse)
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

    // INTERFACE DES COMPOSANTS (CHIPS VERTES POUR LES PRIX)
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
                        <input type="checkbox" data-id="${item.id}" data-price="${item.price}" ${isOutOfStock ? 'disabled' : 'checked'} class="pack-item-checkbox w-4 h-4 rounded text-[#E75C25] accent-[#E75C25] focus:ring-0 cursor-pointer flex-shrink-0">
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

    async function uploadSelectedPhoto() {
        if (!selectedPhotoFile) {
            throw new Error("Aucune photo n'a été sélectionnée.");
        }

        const safeName = selectedPhotoFile.name
            .toLowerCase()
            .replace(/[^a-z0-9.]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const filePath = `school-lists/${Date.now()}-${safeName}`;

        const { error } = await supabaseClient.storage
            .from('lists')
            .upload(filePath, selectedPhotoFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data } = supabaseClient.storage.from('lists').getPublicUrl(filePath);
        return data.publicUrl;
    }

    // NAVIGATION DU PANIER DE COMMANDE
    document.getElementById('btn-change-choice-top').addEventListener('click', () => {
        updateStepper(1);
        selectedPhotoFile = null;
        isPhotoOrder = false;
        if (statusText) statusText.innerText = "Prendre en photo / Charger l'image";
        document.getElementById('pack-details-view').classList.add('hidden');
        document.getElementById('checkout-form-container').classList.add('hidden');
        document.getElementById('options-container').classList.remove('hidden');
    });

    document.getElementById('btn-next-to-form').addEventListener('click', () => {
        updateStepper(3);
        const formContainer = document.getElementById('checkout-form-container');
        if (formContainer) {
            formContainer.classList.remove('hidden');
            formContainer.scrollIntoView({ behavior: 'smooth' });
        }
    });

    document.getElementById('order-submit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : '';
        const clientName = document.getElementById('client-name').value.trim();
        const clientPhone = document.getElementById('client-phone').value.trim();
        const clientEmail = document.getElementById('client-email').value.trim();
        let payloadItems = [];

        if (!clientName || normalizePhone(clientPhone).length < 10 || !clientEmail.includes('@')) {
            alert("Veuillez vérifier le nom, le téléphone et l'adresse e-mail.");
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Envoi en cours...";
            submitButton.classList.add('opacity-70', 'cursor-not-allowed');
        }

        if (isPhotoOrder) {
            try {
                payloadItems = await uploadSelectedPhoto();
            } catch (err) {
                console.error("Erreur upload photo :", err);
                alert("Impossible d'envoyer la photo. Vérifiez la configuration Supabase Storage.");
                return;
            }
        } else {
            const checkedBoxes = document.querySelectorAll('.pack-item-checkbox:checked');
            const activeIds = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));
            payloadItems = selectedPackItems.filter(item => activeIds.includes(item.id));
        }

        const totalAmount = Array.isArray(payloadItems)
            ? payloadItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)
            : 0;

        const orderPayload = {
            client_name: clientName,
            client_phone: clientPhone,
            client_email: clientEmail,
            items: payloadItems, 
            status: 'new',
            reservation_deadline: getReservationDeadline(),
            total_amount: totalAmount,
            payment_method: 'cash_pickup'
        };

        const { data, error } = await supabaseClient.from('orders').insert([orderPayload]).select('id').single();
        if (!error) { 
            alert(`Parfait ! Votre commande a été reçue. Numéro de commande : #${data.id}`);
            window.location.reload();
            return;
            alert("Parfait ! Votre commande a été reçue."); 
            window.location.reload(); 
        } else {
            console.error("Erreur validation commande :", error);
            alert("Erreur lors de la validation.");
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
                submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
            }
        }
    });

    function normalizePhone(phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        if (digits.startsWith('212')) return digits;
        if (digits.startsWith('0')) return `212${digits.slice(1)}`;
        return digits;
    }

    function getReservationDeadline() {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + RESERVATION_DAYS);
        return deadline.toISOString();
    }

    const trackingForm = document.getElementById('order-tracking-form');
    if (trackingForm) {
        trackingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const resultBox = document.getElementById('tracking-result');
            const orderId = document.getElementById('tracking-order-id').value.trim().replace('#', '');
            const phone = document.getElementById('tracking-phone').value.trim();

            resultBox.className = "text-sm rounded-xl border p-4 bg-stone-50 text-stone-600";
            resultBox.textContent = "Recherche en cours...";

            if (!orderId || !phone) {
                resultBox.className = "text-sm rounded-xl border p-4 bg-red-50 text-red-700 border-red-100";
                resultBox.textContent = "Veuillez saisir le numéro de commande et le téléphone.";
                return;
            }

            const { data, error } = await supabaseClient
                .from('orders')
                .select('id, client_phone, status')
                .eq('id', orderId)
                .maybeSingle();

            if (error || !data || normalizePhone(data.client_phone) !== normalizePhone(phone)) {
                resultBox.className = "text-sm rounded-xl border p-4 bg-red-50 text-red-700 border-red-100";
                resultBox.textContent = "Aucune commande trouvée avec ces informations.";
                return;
            }

            let readableStatus = data.status === 'notifie'
                ? "Votre commande est prête. Vous pouvez contacter ou visiter la boutique."
                : "Votre commande est bien reçue et en cours de préparation.";

            readableStatus = ({
                en_attente: "Votre commande est bien reçue et sera traitée bientôt.",
                new: "Votre commande est bien reçue et sera traitée bientôt.",
                preparation: "Votre commande est en cours de préparation.",
                preparing: "Votre commande est en cours de préparation.",
                prete: "Votre commande est prête. Vous pouvez passer à la boutique.",
                ready: "Votre commande est prête. Vous pouvez passer à la boutique.",
                notifie: "Votre commande est prête et une notification a été envoyée.",
                collected: "Votre commande a été récupérée. Merci pour votre visite.",
                cancelled: "Cette commande a été annulée.",
                expired: "Cette réservation a expiré. Veuillez contacter la boutique."
            })[data.status] || "Votre commande est bien reçue.";

            resultBox.className = "text-sm rounded-xl border p-4 bg-emerald-50 text-emerald-800 border-emerald-100";
            resultBox.textContent = `Commande #${data.id} : ${readableStatus}`;
        });
    }

    // ==========================================
    // 6. ANIMATIONS ET COMPORTEMENT DE LA NAVBAR
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

    initClientData();
    updateStepper(1);
});
