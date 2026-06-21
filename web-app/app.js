window.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 0. CONFIGURATION & INITIALISATION SUPABASE
    // ==========================================
    const SUPABASE_URL = "https://jgfkshsizrtwzqsdrhhp.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_Rdn2yMULDq05BGBV-X-zCA_S934mdEh";
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let panierType = ""; 
    let panierContenu = ""; 
    let fichierImageSelectionne = null;

    const mainHeader = document.getElementById('main-header');

    // ==========================================
    // 1. GESTION DE LA SPLASH PAGE
    // ==========================================
    const splash = document.getElementById('splash-screen');
    setTimeout(() => {
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => { splash.remove(); }, 500);
        }
    }, 2500);

    // ==========================================
    // 2. CONFIGURATIONS DYNAMIQUES ET CONTACTS
    // ==========================================
    async function chargerLesParametresDeLaBase() {
        const { data, error } = await supabaseClient.from('site_settings').select('*');
        if (error) { console.error(error); return; }

        let rentreeActive = "true";
        let rentreeTitre = "Rentrée scolaire";

        data.forEach(setting => {
            if (setting.key === 'rentree_enabled') rentreeActive = setting.value;
            if (setting.key === 'rentree_title') rentreeTitre = setting.value;

            if (setting.key === 'contact_address') document.getElementById('info-address').textContent = setting.value;
            if (setting.key === 'contact_email') {
                document.getElementById('info-email').textContent = setting.value;
                document.getElementById('link-email').href = `mailto:${setting.value}`;
            }
            if (setting.key === 'contact_phone') document.getElementById('info-phone').textContent = setting.value;
            if (setting.key === 'contact_whatsapp') document.getElementById('link-whatsapp').href = `https://wa.me/${setting.value}`;
            
            if (setting.key === 'contact_facebook') document.getElementById('link-facebook').href = setting.value;
            if (setting.key === 'contact_instagram') document.getElementById('link-instagram').href = setting.value;
            if (setting.key === 'contact_linkedin') document.getElementById('link-linkedin').href = setting.value;
        });

        const navDesktop = document.getElementById('nav-rentree-desktop');
        const navMobile = document.getElementById('nav-rentree-mobile');
        const h2TitrePage = document.getElementById('display-page-title');

        if(navDesktop) navDesktop.textContent = rentreeTitre;
        if(navMobile) navMobile.textContent = rentreeTitre;
        if(h2TitrePage) h2TitrePage.textContent = rentreeTitre;

        if (rentreeActive === "false") {
            if(navDesktop) navDesktop.classList.add('hidden');
            if(navMobile) navMobile.classList.add('hidden');
            const ctaHeader = document.getElementById('btn-header-cta');
            const ctaHero = document.getElementById('btn-hero-cta');
            if(ctaHeader) ctaHeader.classList.add('hidden');
            if(ctaHero) ctaHero.classList.add('hidden');
        }
    }
    chargerLesParametresDeLaBase();

    // ==========================================
    // 3. TECHNIQUE DU STICKY SCROLL HEADER
    // ==========================================
    function gererEffetHeaderFlottant() {
        const isAccueilActive = !document.getElementById('section-accueil').classList.contains('hidden');

        if (isAccueilActive) {
            if (window.scrollY > 30) {
                mainHeader.classList.remove('bg-transparent', 'border-transparent');
                mainHeader.classList.add('bg-white', 'border-gray-100', 'shadow-sm');
            } else {
                mainHeader.classList.remove('bg-white', 'border-gray-100', 'shadow-sm');
                mainHeader.classList.add('bg-transparent', 'border-transparent');
            }
        } else {
            mainHeader.classList.remove('bg-transparent', 'border-transparent');
            mainHeader.classList.add('bg-white', 'border-gray-100', 'shadow-sm');
        }
    }
    window.addEventListener('scroll', gererEffetHeaderFlottant);

    // ==========================================
    // 4. GESTION DES ONGLETS (TOUS MAINTENUS EN ORANGE)
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const contentSections = document.querySelectorAll('.content-section');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            contentSections.forEach(section => section.classList.add('hidden'));
            
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.remove('hidden');

            // Ajustement : On ne touche plus à la couleur orange, on alterne juste l'épaisseur du texte
            tabButtons.forEach(btn => {
                btn.classList.remove('font-bold', 'font-semibold');
                btn.classList.add('font-medium');
            });
            button.classList.remove('font-medium');
            button.classList.add('font-bold');

            gererEffetHeaderFlottant();
        });
    });

    // ==========================================
    // 5. OPTION A : LOGIQUE DES LISTES ÉCOLES
    // ==========================================
    const selectEcole = document.getElementById('select-ecole');
    const selectNiveau = document.getElementById('select-niveau');
    
    const optionsContainer = document.getElementById('options-container');
    const packDetailsView = document.getElementById('pack-details-view');
    const wrapperListeItems = document.getElementById('wrapper-liste-items');
    const checkoutFormContainer = document.getElementById('checkout-form-container');
    
    const btnNextToForm = document.getElementById('btn-next-to-form');
    const btnChangeChoiceTop = document.getElementById('btn-change-choice-top');
    const btnChangeChoiceBottom = document.getElementById('btn-change-choice-bottom');
    
    const displaySchoolName = document.getElementById('display-school-name');
    const displayLevelName = document.getElementById('display-level-name');
    const listeItemsUl = document.getElementById('liste-officielle-items');

    let toutesLesListesDuServeur = [];

    async function chargerLesListesDepuisSupabase() {
        const { data, error } = await supabaseClient.from('school_lists').select('*');
        if (error) { console.error(error); return; }

        toutesLesListesDuServeur = data;
        const ecolesUniques = [...new Set(data.map(liste => liste.school_name))];

        selectEcole.innerHTML = '<option value="">-- Choisir une école --</option>';
        ecolesUniques.forEach(nomEcole => {
            const option = document.createElement('option');
            option.value = nomEcole;
            option.textContent = nomEcole;
            selectEcole.appendChild(option);
        });
    }
    chargerLesListesDepuisSupabase();

    selectEcole.addEventListener('change', () => {
        const ecoleSelectionnee = selectEcole.value;
        selectNiveau.innerHTML = '<option value="">-- Choisir le niveau --</option>';
        packDetailsView.classList.add('hidden');
        checkoutFormContainer.classList.add('hidden');

        if (ecoleSelectionnee) {
            selectNiveau.disabled = false;
            const niveauxDisponibles = toutesLesListesDuServeur
                .filter(liste => liste.school_name === ecoleSelectionnee)
                .map(liste => liste.level);

            niveauxDisponibles.forEach(niveau => {
                const option = document.createElement('option');
                option.value = niveau;
                option.textContent = niveau;
                selectNiveau.appendChild(option);
            });
        } else {
            selectNiveau.disabled = true;
        }
    });

    selectNiveau.addEventListener('change', () => {
        const ecole = selectEcole.value;
        const niveau = selectNiveau.value;

        if (ecole && niveau) {
            const listeTrouvee = toutesLesListesDuServeur.find(
                liste => liste.school_name === ecole && liste.level === niveau
            );

            if (listeTrouvee && listeTrouvee.items) {
                panierType = "liste-officielle";
                panierContenu = `Pack officiel : ${ecole} (Classe : ${niveau})`;
                fichierImageSelectionne = null;

                displaySchoolName.textContent = ecole;
                displayLevelName.textContent = `Classe : ${niveau}`;
                listeItemsUl.innerHTML = listeTrouvee.items[0];

                optionsContainer.classList.add('hidden');
                packDetailsView.classList.remove('hidden');
                
                wrapperListeItems.className = "md:col-span-12 transition-all duration-300";
                checkoutFormContainer.classList.add('hidden');
                btnNextToForm.classList.remove('hidden');
            }
        }
    });

    btnNextToForm.addEventListener('click', () => {
        wrapperListeItems.className = "md:col-span-7 transition-all duration-300";
        checkoutFormContainer.classList.remove('hidden');
        btnNextToForm.classList.add('hidden'); 
    });

    function restaurerVueOptionsInitiales() {
        selectEcole.value = "";
        selectNiveau.innerHTML = '<option value="">-- Choisir le niveau --</option>';
        selectNiveau.disabled = true;
        document.getElementById('image-file-input').value = "";
        document.getElementById('upload-status-text').textContent = "Prendre en photo / Choisir l'image";
        document.getElementById('image-preview-container').classList.add('hidden');

        packDetailsView.classList.add('hidden');
        checkoutFormContainer.classList.add('hidden');
        optionsContainer.classList.remove('hidden');
    }

    btnChangeChoiceTop.addEventListener('click', restaurerVueOptionsInitiales);
    btnChangeChoiceBottom.addEventListener('click', restaurerVueOptionsInitiales);

    // ==========================================
    // 6. OPTION B : LOGIQUE D'UPLOAD DE PHOTO
    // ==========================================
    const imageInput = document.getElementById('image-file-input');
    const uploadStatusText = document.getElementById('upload-status-text');
    const previewContainer = document.getElementById('image-preview-container');

    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        fichierImageSelectionne = file;
        panierType = "photo-upload";
        panierContenu = `Photo de liste personnalisée`;
        
        uploadStatusText.textContent = `Fichier prêt : ${file.name}`;
        previewContainer.classList.remove('hidden');
        
        packDetailsView.classList.add('hidden');
        checkoutFormContainer.classList.remove('hidden');
        document.getElementById('checkout-form-container').scrollIntoView({ behavior: 'smooth' });
    });

    // ==========================================
    // 7. SOUMISSION ET ENREGISTREMENT À SUPABASE
    // ==========================================
    const orderForm = document.getElementById('order-submit-form');
    const btnSubmit = document.getElementById('btn-submit-order');

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nomClient = document.getElementById('client-name').value;
        const telClient = document.getElementById('client-phone').value;
        const emailClient = document.getElementById('client-email').value;

        btnSubmit.disabled = true;
        btnSubmit.textContent = "Validation en cours...";

        try {
            let finalItemsValue = panierContenu;

            if (panierType === "photo-upload" && fichierImageSelectionne) {
                const nomFichierUnique = `${Date.now()}_${fichierImageSelectionne.name}`;
                const uploadResponse = await supabaseClient.storage
                    .from('listes_scolaires')
                    .upload(nomFichierUnique, fichierImageSelectionne);

                if (uploadResponse.error) throw uploadResponse.error;

                const urlResponse = supabaseClient.storage
                    .from('listes_scolaires')
                    .getPublicUrl(nomFichierUnique);

                finalItemsValue = `Photo liste : ${urlResponse.data.publicUrl}`;
            }

            const insertResponse = await supabaseClient
                .from('orders')
                .insert([
                    { 
                        client_name: nomClient, 
                        client_phone: telClient,
                        client_email: emailClient,
                        items: finalItemsValue, 
                        status: 'en_attente' 
                    }
                ])
                .select();

            if (insertResponse.error) throw insertResponse.error;

            const orderId = insertResponse.data[0].id;
            alert(`🎉 Commande n° ${orderId} enregistrée ! Nous vous contacterons sur WhatsApp (${telClient}) dès que votre pack sera prêt.`);
            
            orderForm.reset();
            restaurerVueOptionsInitiales();
            document.querySelector('[data-target=section-accueil]').click();

        } catch (error) {
            console.error(error);
            alert("Une erreur s'est produite lors de la validation.");
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Confirmer ma commande";
        }
    });

});