document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. CONFIGURATION & SYNCHRONISATION SUPABASE
    // ==========================================
    const SUPABASE_URL = "https://jgfkshsizrtwzqsdrhhp.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_Rdn2yMULDq05BGBV-X-zCA_S934mdEh";
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const R2_UPLOAD_ENDPOINT = "https://el-qods-media-upload.okassmi78.workers.dev/upload";
    const R2_PUBLIC_BASE_URL = "https://pub-164e33fb32794124816a0089426177e9.r2.dev";
    const R2_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const R2_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
    async function uploadAdminImageToR2(file, category) {
        if (!(file instanceof File)) throw new Error("Sélectionnez une image.");
        if (!R2_IMAGE_TYPES.has(file.type)) throw new Error("Format refusé. Utilisez JPG, PNG, WEBP ou GIF.");
        if (file.size <= 0 || file.size > R2_IMAGE_MAX_SIZE) throw new Error("L’image doit peser au maximum 5 Mo.");
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (sessionError || !accessToken) throw new Error("Votre session administrateur a expiré. Reconnectez-vous.");
        const body = new FormData();
        body.append("file", file, file.name);
        body.append("category", category);
        const response = await fetch(R2_UPLOAD_ENDPOINT, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body
        });
        let result = null;
        try { result = await response.json(); } catch (_) {}
        if (!response.ok || !result?.success || !result?.url) {
            throw new Error(result?.error || `Échec de l’envoi R2 (${response.status}).`);
        }
        if (!String(result.url).startsWith(`${R2_PUBLIC_BASE_URL}/`)) throw new Error("L’URL R2 retournée est invalide.");
        return result;
    }

    const RESERVATION_DAYS = 5;
    const ARCHIVE_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxxpcC4DLvjtgGqkB4T-GvX7by6QpttUuU7XL7_88niWK-HtjfVpVqKzVgp1Kul-AkV/exec";

    const COLLECTED_STATUSES = ['collected'];
    const CLOSED_STATUSES = ['collected', 'cancelled', 'expired'];
    const STATUS_ALIASES = {
        en_attente: 'new', nouveau: 'new',
        preparation: 'preparing', 'préparation': 'preparing',
        prete: 'ready', 'prête': 'ready', pret: 'ready', 'prêt': 'ready',
        notifie: 'ready', 'notifié': 'ready', notified: 'ready',
        recupere: 'collected', 'récupéré': 'collected',
        annule: 'cancelled', 'annulé': 'cancelled',
        expire: 'expired', 'expiré': 'expired'
    };
    const STATUS_META = {
        new: ['Nouveau', 'bg-amber-50 text-amber-700'],
        preparing: ['Préparation', 'bg-blue-50 text-blue-700'],
        ready: ['Prêt au retrait', 'bg-emerald-50 text-emerald-700'],
        collected: ['Récupéré', 'bg-stone-900 text-white'],
        cancelled: ['Annulé', 'bg-red-50 text-red-700'],
        expired: ['Expiré', 'bg-gray-100 text-gray-600']
    };


    const adminV2Style=document.createElement('style');adminV2Style.textContent=`
    #pane-orders{padding-bottom:150px!important}#orders-pagination{position:relative!important;z-index:80!important;margin:15px 0 110px!important;padding:14px 16px!important;background:#fff!important;border:1px solid #eee7df!important;border-radius:15px!important;box-shadow:0 12px 30px #1c191714!important}#orders-pagination button{position:relative;z-index:82;pointer-events:auto}
    .admin-orders-v2{width:100%;border-collapse:separate!important;border-spacing:0 9px!important}.admin-orders-v2 thead th{padding:10px 14px!important;color:#8a817a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.09em;white-space:nowrap}.order-v2{cursor:pointer;transition:.18s}.order-v2 td{padding:14px!important;background:#fff;border-top:1px solid #eee7df;border-bottom:1px solid #eee7df;vertical-align:middle}.order-v2 td:first-child{border-left:1px solid #eee7df;border-radius:14px 0 0 14px}.order-v2 td:last-child{border-right:1px solid #eee7df;border-radius:0 14px 14px 0}.order-v2:hover td{background:#fffaf7}.sub{display:block;margin-top:3px;color:#a8a29e;font-size:10px}.chip-btn{position:relative;display:inline-flex}.chip-face{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:88px;padding:8px 11px;border-radius:999px;border:1px solid;font-size:11px;font-weight:900;white-space:nowrap;transition:.17s}.chip-arrow{width:0;opacity:0;overflow:hidden;transition:.17s}.chip-btn:hover .chip-arrow{width:10px;opacity:1}.chip-btn:hover .chip-face{transform:translateY(-1px);box-shadow:0 8px 18px #1c191719}.s-new{background:#fffbeb;color:#b45309;border-color:#fde68a}.s-preparing{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}.s-ready{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.s-collected{background:#1c1917;color:#fff;border-color:#1c1917}.s-cancelled{background:#fef2f2;color:#b91c1c;border-color:#fecaca}.s-expired{background:#f3f4f6;color:#4b5563;border-color:#e5e7eb}.p-paid{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.p-unpaid{background:#fffbeb;color:#b45309;border-color:#fde68a}
    .chip-pop{position:fixed;z-index:2147483600;min-width:176px;padding:7px;border:1px solid #ebe5df;border-radius:14px;background:#fffffff8;box-shadow:0 22px 60px #1c191733;backdrop-filter:blur(14px)}.chip-opt{width:100%;display:flex;justify-content:space-between;padding:9px 10px;border-radius:10px;font-size:12px;font-weight:800;color:#44403c}.chip-opt:hover,.chip-opt.on{background:#fff1e8;color:#E75C25}.chip-opt i{opacity:0}.chip-opt.on i{opacity:1}
    .acts{display:inline-flex;gap:6px}.act{width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid transparent;transition:.16s}.act:hover{transform:translateY(-2px)}.act svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.act svg.wa-icon{width:22px;height:22px;fill:currentColor;stroke:none}.wa{color:#159447}.wa:hover{background:#ecfdf3;border-color:#bbf7d0}.pr{color:#1c1917}.pr:hover{background:#f5f5f4;border-color:#d6d3d1}.del{color:#dc2626}.del:hover{background:#fef2f2;border-color:#fecaca}
    .ord-modal{position:fixed;inset:0;z-index:2147483500;display:none;align-items:center;justify-content:center;padding:18px;background:#0c0a0985;backdrop-filter:blur(8px)}.ord-modal.open{display:flex}.ord-card{width:min(920px,100%);max-height:90vh;overflow:hidden;background:#fff;border-radius:24px;box-shadow:0 35px 100px #0005}.ord-head{display:flex;justify-content:space-between;padding:24px;background:linear-gradient(135deg,#fff,#fff6ef);border-bottom:1px solid #eee7df}.ord-body{max-height:calc(90vh - 120px);overflow:auto}.ord-summary{display:grid;grid-template-columns:1.3fr .7fr;gap:14px;padding:20px 24px 0}.customer,.total{padding:18px;border-radius:18px}.customer{background:#fcfbfa;border:1px solid #eee7df}.total{color:#fff;background:linear-gradient(135deg,#E75C25,#f58a56);box-shadow:0 18px 40px #e75c2538}.total strong{display:block;font-size:26px;margin-top:5px}.details{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px 24px}.detail{padding:14px;border:1px solid #eee7df;border-radius:15px;background:#fcfbfa}.lab{display:block;font-size:10px;font-weight:900;text-transform:uppercase;color:#a8a29e}.val{display:block;margin-top:5px;font-size:13px;font-weight:800;overflow-wrap:anywhere}.items{padding:0 24px 24px}.item{display:grid;grid-template-columns:1fr auto;gap:15px;padding:12px;border-bottom:1px solid #eee7df;font-size:12px}.order-instructions-admin{margin:0 24px 20px;padding:16px 18px;border:1px solid #fed7c1;border-radius:16px;background:#fff8f3}.order-instructions-admin p{margin:7px 0 0;color:#44403c;font-size:13px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.close{width:38px;height:38px;border-radius:12px;background:#f5f5f4;font-size:22px}
    .ord-modal{padding:12px;background:rgba(18,18,18,.55);backdrop-filter:blur(7px)}
    .ord-card{width:min(900px,calc(100vw - 28px));max-height:calc(100vh - 28px);border-radius:24px;background:#fff;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.30)}
    .ord-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;padding:20px 22px 17px;background:linear-gradient(105deg,#fff,#fff7ef);border-bottom:1px solid #eee7df}
    .ord-head-main{min-width:0}.ord-title{font-size:30px;line-height:1;font-weight:950;letter-spacing:.01em;color:#111827;margin-top:5px}.ord-head-side{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:14px}.ord-head-actions{display:flex;align-items:center;gap:13px}.ord-head-actions .act{width:32px;height:32px}.ord-head-actions .close{width:42px;height:42px;margin-left:6px;display:grid;place-items:center;border:0;color:#111827;font-weight:900}.ord-price{font-size:28px;line-height:1;font-weight:950;color:#126b2b;white-space:nowrap}
    .ord-price.is-editable{cursor:text;border-radius:8px;outline:none;transition:.15s;user-select:text;-webkit-user-select:text}.ord-price.is-editable:hover{background:rgba(22,136,58,.06)}.ord-price.is-editable:focus{background:#fff;border-bottom:2px solid #16883a;padding:3px 5px;margin:-3px -5px}.ord-price.is-saving{opacity:.55;pointer-events:none}.ord-price-save-state{height:12px;margin-top:4px;color:#16883a;font-size:9px;font-weight:800;text-align:right}
    .ord-body{max-height:calc(100vh - 158px);overflow:auto;padding:14px 16px 16px}.ord-overview{display:grid;grid-template-columns:1.15fr .92fr .82fr;gap:10px;align-items:start}.ord-info-column{display:grid;grid-template-rows:50px 50px 50px;gap:8px;align-self:start}.ord-info-column:first-child .ord-customer{grid-row:1 / span 2}.ord-info-column:first-child .ord-mini-card{grid-row:3}.ord-customer,.ord-mini-card,.ord-qr,.order-instructions-admin{border:1px solid #eee7df;border-radius:15px;background:#fcfbfa}.ord-customer{padding:12px 14px;height:108px;overflow:hidden}.ord-customer b{display:block;margin-top:4px;font-size:17px;line-height:1.2;color:#111827}.ord-contact{display:block;margin-top:6px;color:#78716c;font-size:12px;line-height:1.35}.ord-mini-card{padding:9px 12px;height:50px;overflow:hidden}.ord-mini-card .val{margin-top:3px;font-size:12px;line-height:1.2}.ord-qr{display:grid;place-items:center;padding:10px;background:#fff}.ord-qr img{width:150px;height:150px;object-fit:contain}.order-instructions-admin{margin:10px 0 14px;padding:11px 13px;background:#fff8f3;border-color:#fed7c1}.order-instructions-admin p{margin-top:5px;font-size:12px}.items{padding:0}.items-title{display:flex;align-items:center;justify-content:space-between;margin:0 2px 9px}.items-title h3{font-size:18px;font-weight:950;color:#111827}.items-list{border:1px solid #eee7df;border-radius:15px;overflow:hidden}.item{display:grid;grid-template-columns:1fr auto;gap:12px;padding:11px 12px;border-bottom:1px solid #eee7df;font-size:12px}.item:last-child{border-bottom:0}.ord-head .chip-face{min-width:98px;padding:9px 13px}.ord-head .lab{font-size:9px}
    @media(max-width:780px){.ord-info-column{grid-template-rows:auto}.ord-info-column:first-child .ord-customer,.ord-info-column:first-child .ord-mini-card{grid-row:auto}.ord-customer,.ord-mini-card{height:auto;overflow:visible}.ord-head{grid-template-columns:1fr}.ord-head-side{align-items:flex-start}.ord-price{font-size:24px}.ord-overview{grid-template-columns:1fr}.ord-qr{min-height:190px}.ord-body{max-height:calc(100vh - 245px)}.ord-title{font-size:26px}}
    .ord-reference-line{display:flex;align-items:center;gap:12px}.copy-order-reference{width:38px;height:38px;display:grid;place-items:center;border:1px solid transparent;border-radius:10px;background:transparent;color:#292524;cursor:pointer;transition:.15s}.copy-order-reference:hover{background:#f5f5f4;border-color:#d6d3d1}.copy-order-reference.is-copied{background:#ecfdf5;color:#16883a;border-color:#a7f3d0}.copy-order-reference svg{width:25px;height:25px}
    .admin-orders-v2-wrap{overflow-x:auto;padding:0 12px 12px;background:linear-gradient(180deg,#fff,#fcfbfa)}.admin-orders-v2{min-width:1080px!important;border-spacing:0 8px!important}.admin-orders-v2 thead th{padding:12px 14px!important;color:#9a918a!important;font-size:9px!important;letter-spacing:.11em!important}.admin-orders-v2 .order-v2 td{padding:13px 14px!important;background:#fff!important;border-top:1px solid #eee8e2!important;border-bottom:1px solid #eee8e2!important}.admin-orders-v2 .order-v2 td:first-child{border-left:1px solid #eee8e2!important}.admin-orders-v2 .order-v2 td:last-child{border-right:1px solid #eee8e2!important}.admin-orders-v2 .order-v2:hover td{background:#fff8f3!important;border-color:#f3c9b5!important}.admin-orders-v2 .order-v2 b{font-size:12px}.admin-orders-v2 .order-v2 td:first-child b{font-size:13px;font-weight:950}.admin-orders-v2 .sub{font-size:9px;margin-top:4px}.admin-orders-v2 .acts{gap:4px}.admin-orders-v2 .act{width:32px;height:32px;border-radius:9px}.admin-orders-v2 .chip-face{min-width:82px;padding:7px 9px;font-size:10px}.orders-table-card{border-radius:20px!important;border-color:#e9e3dd!important;box-shadow:0 12px 35px rgba(28,25,23,.05)!important;background:#fff!important}.admin-orders-v2 thead{position:relative}.admin-orders-v2 thead tr{background:linear-gradient(90deg,#fff4ec 0%,#fffaf7 55%,#fff 100%)!important;box-shadow:0 5px 16px rgba(231,92,37,.08)}.admin-orders-v2 thead th{height:44px!important;color:#6f625b!important;font-size:9px!important;font-weight:950!important;letter-spacing:.12em!important;border-top:1px solid #f4d7c8!important;border-bottom:1px solid #f4d7c8!important}.admin-orders-v2 thead th:first-child{border-left:1px solid #f4d7c8!important;border-radius:13px 0 0 13px!important;padding-left:18px!important}.admin-orders-v2 thead th:last-child{border-right:1px solid #f4d7c8!important;border-radius:0 13px 13px 0!important;padding-right:18px!important;text-align:center!important}.admin-orders-v2 thead th:nth-child(5),.admin-orders-v2 thead th:nth-child(6),.admin-orders-v2 thead th:nth-child(7){text-align:center!important}.admin-orders-v2 tbody td:nth-child(5),.admin-orders-v2 tbody td:nth-child(6),.admin-orders-v2 tbody td:nth-child(7),.admin-orders-v2 tbody td:last-child{text-align:center!important}.admin-orders-v2-wrap{padding-top:10px!important}
    .orders-multifilter{min-width:0}.orders-filter-option{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;color:#44403c;font-size:12px;font-weight:800;cursor:pointer;transition:.15s}.orders-filter-option:hover{background:#fff4ec;color:#E75C25}.orders-filter-option input{width:16px;height:16px;accent-color:#E75C25;cursor:pointer}.orders-multifilter.is-open #orders-multifilter-toggle{border-color:#E75C25;box-shadow:0 0 0 3px rgba(231,92,37,.09)}
    .imported-list-link{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:#E75C25;font-size:12px;font-weight:900;cursor:pointer;padding:4px 0;text-align:left}.imported-list-link:hover{text-decoration:underline}.imported-list-link svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .list-image-modal{position:fixed;inset:0;z-index:2147483640;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(28,25,23,.62);backdrop-filter:blur(8px)}.list-image-modal.open{display:flex}.list-image-card{width:min(900px,calc(100vw - 28px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden;border-radius:28px;background:#fff;box-shadow:0 35px 100px rgba(0,0,0,.38)}.list-image-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 30px 18px}.list-image-head h2{margin:0;color:#E75C25;font-size:30px;font-weight:950;letter-spacing:-.02em}.list-image-close{width:42px;height:42px;display:grid;place-items:center;border:0;border-radius:13px;background:#f7f7f6;color:#a8a29e;font-size:28px;font-weight:700;cursor:pointer}.list-image-close:hover{background:#f1f1ef;color:#292524}.list-image-body{min-height:0;overflow:auto;padding:8px 36px 22px}.list-image-stage{min-height:520px;display:flex;align-items:flex-start;justify-content:center;padding:18px;border:1px solid #eeeae6;border-radius:22px;background:#fafafa}.list-image-stage img{display:block;max-width:100%;height:auto;max-height:68vh;object-fit:contain;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(28,25,23,.05)}.list-image-loading{padding:38px;color:#a8a29e;font-size:13px;font-weight:800;text-align:center}.list-image-error{display:none;max-width:520px;margin:auto;padding:30px;color:#78716c;font-size:13px;line-height:1.6;text-align:center}.list-image-foot{padding:0 36px 28px}.list-image-open{display:inline-flex;color:#E75C25;font-size:15px;font-weight:900;text-decoration:none}.list-image-open:hover{text-decoration:underline}@media(max-width:700px){.list-image-modal{padding:8px}.list-image-card{max-height:calc(100vh - 16px);border-radius:20px}.list-image-head{padding:18px 18px 12px}.list-image-head h2{font-size:23px}.list-image-body{padding:6px 14px 16px}.list-image-stage{min-height:360px;padding:10px}.list-image-foot{padding:0 18px 20px}}
    @media(max-width:900px){.admin-orders-v2{min-width:1120px}}@media(max-width:700px){.ord-summary{grid-template-columns:1fr}.details{grid-template-columns:1fr 1fr}}
    .ord-modal{position:fixed!important;inset:0!important;z-index:2147483500!important;display:none!important;padding:0!important;background:rgba(12,10,9,.48)!important;backdrop-filter:blur(6px)!important;align-items:stretch!important;justify-content:flex-end!important}.ord-modal.open{display:flex!important}
    .ord-card{width:33.333333vw!important;height:100vh!important;max-height:none!important;border-radius:24px 0 0 24px!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;background:#fff!important;box-shadow:-28px 0 80px rgba(0,0,0,.25)!important;animation:drawerIn .24s ease-out!important}@keyframes drawerIn{from{transform:translateX(100%)}to{transform:none}}
    .ord-head{flex:0 0 auto!important;display:block!important;padding:14px 16px 12px!important;background:linear-gradient(105deg,#fff,#fff7ef)!important;border-bottom:1px solid #eee7df!important}.ord-head-top,.ord-head-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px}.ord-head-bottom{margin-top:11px}.ord-reference-line{min-width:0;flex:1;gap:7px!important;flex-wrap:nowrap!important}.ord-title{min-width:0;margin:0!important;font-size:clamp(18px,1.55vw,24px)!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.copy-order-reference{width:31px!important;height:31px!important;flex:0 0 auto}.copy-order-reference svg{width:19px!important;height:19px!important}.ord-head-actions{display:flex;align-items:center;gap:4px!important;flex:0 0 auto}.ord-head-actions .act{width:31px!important;height:31px!important}.ord-head-actions .close{width:36px!important;height:36px!important;margin-left:2px!important}.ord-head-chips{display:flex;align-items:center;gap:6px;min-width:0}.ord-head-chips .chip-face{min-width:0!important;padding:7px 9px!important;font-size:10px!important}.ord-price-wrap{margin-left:auto;min-width:0;text-align:right}.ord-price{font-size:clamp(16px,1.35vw,21px)!important;line-height:1.05!important;white-space:nowrap!important}.ord-price-save-state{margin-top:2px!important}
    .ord-tabs{flex:0 0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:0;padding:0 18px;background:#fff;border-bottom:1px solid #eee7df}.ord-tab{position:relative;min-height:52px;padding:10px 8px;border:0;border-radius:0;background:transparent;color:#8c827b;font-size:11px;font-weight:850;white-space:nowrap;transition:color .16s ease,background .16s ease}.ord-tab:hover{background:#fffaf7;color:#E75C25}.ord-tab.is-active{background:transparent;color:#E75C25;box-shadow:none}.ord-tab.is-active::after{content:'';position:absolute;left:18%;right:18%;bottom:-1px;height:3px;border-radius:999px 999px 0 0;background:#E75C25}.ord-tab::before{display:inline-block;margin-right:6px;color:#c7bdb6;font-weight:900}.ord-tab[data-order-tab='info']::before{content:'01'}.ord-tab[data-order-tab='list']::before{content:'02'}.ord-tab[data-order-tab='supplies']::before{content:'03'}.ord-tab.is-active::before{color:#E75C25}
    .ord-body{flex:1!important;max-height:none!important;overflow-y:auto!important;padding:16px 18px 26px!important}.ord-tab-panel{display:none}.ord-tab-panel.is-active{display:block;animation:tabIn .17s ease-out}@keyframes tabIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    .drawer-info-grid,.drawer-client{display:grid;grid-template-columns:1fr 1fr;gap:10px}.drawer-info-card{padding:13px 14px;border:1px solid #eee7df;border-radius:15px;background:#fcfbfa}.drawer-info-card.is-wide,.drawer-client .drawer-info-card:first-child{grid-column:1/-1}.drawer-info-card .val{font-size:12px;line-height:1.5}.drawer-qr{display:flex;align-items:center;gap:16px}.drawer-qr img{width:128px;height:128px;border:1px solid #eee7df;border-radius:14px;background:#fff;padding:7px}.drawer-qr-copy{min-width:0}.drawer-qr-copy b{display:block;font-size:12px}.drawer-qr-copy span{display:block;margin-top:5px;font-size:10px;line-height:1.5;color:#a8a29e;overflow-wrap:anywhere}
    .drawer-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.drawer-section-title h3{font-size:17px;font-weight:950}.drawer-section-title span{font-size:10px;font-weight:800;color:#a8a29e}.drawer-list-meta{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:13px}.drawer-meta-chip{padding:6px 9px;border-radius:999px;background:#fff2e9;color:#E75C25;border:1px solid #ffd9c5;font-size:10px;font-weight:900}.drawer-item-list{overflow:hidden;border:1px solid #eee7df;border-radius:15px}.drawer-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 13px;border-bottom:1px solid #eee7df}.drawer-item:last-child{border-bottom:0}.drawer-item b{font-size:12px}.drawer-item small{display:block;margin-top:4px;color:#a8a29e;font-size:9px}.drawer-item-price{font-size:12px;font-weight:950;color:#16883a;white-space:nowrap}.drawer-item-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px}.drawer-item-unselected{background:#fffafa}.drawer-item-unselected b{color:#dc2626!important;text-decoration:line-through;text-decoration-thickness:1px}.drawer-item-unselected small{color:#ef4444!important}.drawer-item-unselected .drawer-item-price{color:#dc2626}.drawer-unselected-chip{display:inline-flex;align-items:center;padding:4px 7px;border-radius:999px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;font-size:8px;font-weight:950;white-space:nowrap}.drawer-empty{padding:28px;border:1px dashed #d6d3d1;border-radius:16px;background:#fafaf9;color:#78716c;font-size:12px;text-align:center}.drawer-image-link{display:flex;justify-content:space-between;gap:12px;padding:15px;border:1px solid #fed7c1;border-radius:16px;background:#fff8f3;color:#E75C25;font-size:12px;font-weight:900}.order-instructions-admin{margin:10px 0 0!important}
    @media(max-width:1100px){.ord-card{width:48vw!important}}@media(max-width:700px){.ord-card{width:100vw!important;border-radius:0!important}.ord-head{padding:12px!important}.ord-title{font-size:18px!important}.ord-head-top{gap:6px}.ord-head-actions{gap:2px!important}.ord-head-actions .act{width:29px!important;height:29px!important}.ord-head-actions .close{width:33px!important;height:33px!important}.ord-head-bottom{align-items:flex-end}.ord-price{font-size:17px!important}.ord-tabs{padding:8px}.ord-tab{font-size:10px;padding:7px 4px}.ord-body{padding:13px!important}.drawer-info-grid,.drawer-client{grid-template-columns:1fr}.drawer-info-card.is-wide,.drawer-client .drawer-info-card:first-child{grid-column:auto}.drawer-qr{align-items:flex-start;flex-direction:column}.ord-price{font-size:21px!important}}

    /* DATA MANAGER V3 */
    .archive-manager-overlay{position:fixed;inset:0;z-index:2147483645;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(18,14,12,.62);backdrop-filter:blur(10px)}.archive-manager-overlay.is-open{display:flex}.data-manager{width:min(1040px,calc(100vw - 32px));height:min(790px,calc(100vh - 32px));display:flex;flex-direction:column;overflow:hidden;border:1px solid #ffffffaa;border-radius:28px;background:#fff;box-shadow:0 40px 120px #0006}.archive-manager-head{display:flex;justify-content:space-between;padding:22px 26px 18px;border-bottom:1px solid #eee7df;background:linear-gradient(125deg,#fff,#fff8f3 72%,#ffede2)}.archive-manager-head h3{font-size:24px;font-weight:950;letter-spacing:-.035em}.archive-manager-head p{margin-top:7px;color:#8c827b;font-size:11px}.archive-manager-close{width:40px;height:40px;border:0;border-radius:13px;background:#f4f2f0;color:#777;font-size:23px}.data-layout{min-height:0;flex:1;display:grid;grid-template-columns:205px minmax(0,1fr)}.data-nav{padding:18px 13px;border-right:1px solid #eae4df;background:linear-gradient(#faf8f6,#f5f2ef)}.data-nav button{width:100%;min-height:49px;display:flex;align-items:center;gap:10px;padding:0 14px;border:0;border-radius:14px;background:transparent;color:#78716c;font-size:12px;font-weight:900;text-align:left}.data-nav button.is-active{background:#fff;color:#E75C25;box-shadow:0 10px 26px #41251617,inset 3px 0 #E75C25}.data-content{min-height:0;overflow:auto;padding:25px 28px 30px}.data-panel{display:none}.data-panel.is-active{display:block}.data-title{margin-bottom:20px}.data-title h4{font-size:20px;font-weight:950;letter-spacing:-.025em}.data-title p{margin-top:6px;color:#8c827b;font-size:11px}.archive-manager-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.archive-field{display:flex;flex-direction:column;gap:7px}.archive-field.is-wide{grid-column:1/-1}.archive-field>span:first-child{color:#8b817b;font-size:9px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.archive-field input,.archive-field select{width:100%;height:47px;padding:0 14px;border:1px solid #e4ded9;border-radius:13px;background:#fbfaf9;color:#292524;font-size:12px;outline:none}.archive-field input:focus,.archive-field select:focus{border-color:#E75C25;background:#fff;box-shadow:0 0 0 4px #e75c2517}.paired-fields{display:grid;grid-template-columns:minmax(120px,.42fr) minmax(190px,.58fr);gap:12px;padding:10px;border:1px solid #eee8e4;border-radius:16px;background:#f7f5f3}.paired-fields input,.paired-fields select{background:#fff}.auto-fields{display:contents}.auto-fields.is-disabled{filter:grayscale(.45);opacity:.4;pointer-events:none;user-select:none}.auto-fields.is-disabled input,.auto-fields.is-disabled select{background:#ebe9e7;color:#aaa}.data-toggle{position:relative;grid-column:1/-1;display:flex;align-items:center;gap:13px;min-height:62px;padding:12px 15px;border:1px solid #f0d9cc;border-radius:16px;background:#fff9f5;cursor:pointer}.data-toggle input{position:absolute;width:1px;height:1px;opacity:0}.data-toggle i{position:relative;width:45px;height:25px;flex:0 0 45px;border-radius:99px;background:#d6d3d1;transition:.2s}.data-toggle i:after{content:'';position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;box-shadow:0 2px 7px #0003;transition:.2s}.data-toggle input:checked+i{background:#E75C25}.data-toggle input:checked+i:after{transform:translateX(20px)}.data-toggle b,.data-toggle small{display:block}.data-toggle b{font-size:12px}.data-toggle small{margin-top:3px;color:#999;font-size:9px}.status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.status-check{position:relative;display:flex;align-items:center;gap:10px;min-height:50px;padding:11px 13px;border:1px solid #e5dfdb;border-radius:14px;background:#fbfaf9;cursor:pointer;transition:.18s}.status-check:hover{border-color:#f3b493;background:#fff7f2;transform:translateY(-1px)}.status-check input{position:absolute;width:1px;height:1px;opacity:0}.status-check i{position:relative;width:21px;height:21px;flex:0 0 21px;border:2px solid #d6d3d1;border-radius:6px;background:#fff}.status-check i:after{content:'';position:absolute;left:5px;top:2px;width:7px;height:12px;border-right:2.5px solid #fff;border-bottom:2.5px solid #fff;transform:rotate(45deg) scale(0)}.status-check input:checked+i{border-color:#E75C25;background:#E75C25}.status-check input:checked+i:after{transform:rotate(45deg) scale(1)}.status-check:has(input:checked){border-color:#f7c8b0;background:#fff2ea;box-shadow:0 7px 18px #e75c2514}.status-check span{font-size:11px;font-weight:850}.archive-manager-last,.cleanup-result{margin-top:15px;padding:14px 16px;border:1px solid #e8e3df;border-radius:15px;background:#f8faf9;color:#625b56;font-size:11px}.archive-manager-status{display:none;margin-top:12px;padding:11px;border-radius:12px;font-size:11px;font-weight:850}.archive-manager-status.is-visible{display:block}.archive-manager-status.is-info{background:#eff6ff;color:#1d4ed8}.archive-manager-status.is-success{background:#ecfdf5;color:#047857}.archive-manager-status.is-error{background:#fef2f2;color:#b91c1c}.archive-manager-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.archive-manager-actions button{min-height:45px;padding:0 18px;border-radius:13px;font-size:11px;font-weight:900;transition:.18s}.archive-manager-actions button:hover{transform:translateY(-1px)}.archive-save,.cleanup-preview{border:1px solid #e4ded9;background:#fff;color:#4b4541}.archive-run{border:0;background:linear-gradient(135deg,#E75C25,#f47c47);color:#fff;box-shadow:0 10px 22px #e75c2533}.cleanup-delete{border:0;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;box-shadow:0 10px 22px #dc262629}@media(max-width:700px){.archive-manager-overlay{padding:7px}.data-manager{height:calc(100vh - 14px);border-radius:20px}.data-layout{grid-template-columns:1fr;grid-template-rows:auto 1fr}.data-nav{display:grid;grid-template-columns:1fr 1fr;padding:8px;border-right:0;border-bottom:1px solid #eee}.data-content{padding:17px}.archive-manager-grid{grid-template-columns:1fr}.archive-field.is-wide,.data-toggle{grid-column:auto}.paired-fields{grid-template-columns:1fr}.status-grid{grid-template-columns:1fr 1fr}}

    /* DATA MANAGER V4 - paired controls */
    .data-manager .paired-fields{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr)!important;gap:14px!important;padding:12px!important;border:1px solid #e7e0db!important;border-radius:17px!important;background:#f7f5f3!important}.data-manager .paired-control{display:flex!important;min-width:0!important;flex-direction:column!important;gap:6px!important}.data-manager .paired-control small{margin-left:2px!important;color:#9f9791!important;font-size:8px!important;font-weight:950!important;letter-spacing:.09em!important;text-transform:uppercase!important}.data-manager .paired-control input,.data-manager .paired-control select{width:100%!important;height:48px!important;min-height:48px!important;margin:0!important;padding:0 14px!important;border:1px solid #ddd6d1!important;border-radius:13px!important;background:#fff!important;color:#292524!important;font-size:12px!important;font-weight:800!important;box-shadow:0 5px 14px rgba(49,32,22,.04)!important;box-sizing:border-box!important}.data-manager .paired-control select{padding-right:38px!important;cursor:pointer!important}.data-manager .paired-control input:focus,.data-manager .paired-control select:focus{border-color:#E75C25!important;box-shadow:0 0 0 4px rgba(231,92,37,.09)!important;outline:none!important}.data-manager #archive-custom-period.hidden{display:none!important}.data-manager #archive-custom-period:not(.hidden){display:flex!important}.data-manager #archive-custom-period .custom-time-fields{width:100%!important}.data-manager .auto-fields.is-disabled .paired-fields{background:#eceae8!important}.data-manager .auto-fields.is-disabled .paired-control input,.data-manager .auto-fields.is-disabled .paired-control select{background:#e7e5e3!important;box-shadow:none!important}@media(max-width:620px){.data-manager .paired-fields{grid-template-columns:minmax(90px,.8fr) minmax(0,1.2fr)!important;gap:9px!important;padding:9px!important}.data-manager .paired-control input,.data-manager .paired-control select{height:44px!important;min-height:44px!important;padding:0 10px!important}}
    /* SCHOOL LIST ITEM LABEL LANGUAGE */
    .pack-item-label-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}.pack-item-label-head>label{margin:0!important;color:#a8a29e;font-size:9px;font-weight:900;text-transform:uppercase}.pack-item-language{display:inline-grid;grid-template-columns:1fr 1fr;gap:2px;padding:2px;border:1px solid #e7e5e4;border-radius:8px;background:#f5f5f4}.pack-item-language button{min-width:34px;height:24px;padding:0 7px;border:0;border-radius:6px;background:transparent;color:#78716c;font-size:8px;font-weight:950}.pack-item-language button.is-active{background:#E75C25;color:#fff;box-shadow:0 3px 8px rgba(231,92,37,.2)}#admin-item-name.is-arabic{font-family:Tahoma,Arial,sans-serif!important;font-size:13px!important;text-align:right!important;direction:rtl!important}
    /* SCHOOL EDIT AND PRINT */
    .r2-upload-field{display:grid;gap:8px}.r2-upload-zone{position:relative;min-height:94px;padding:13px;display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:13px;border:1px dashed #f0b99d;border-radius:14px;background:#fff9f5;cursor:pointer}.r2-upload-zone:hover{border-color:#E75C25;background:#fff4ec}.r2-upload-zone input{position:absolute;width:1px;height:1px;opacity:0}.r2-upload-preview{width:72px;height:66px;display:grid;place-items:center;overflow:hidden;border:1px solid #eee3dc;border-radius:11px;background:#fff;color:#E75C25;font-size:10px;font-weight:900}.r2-upload-preview img{width:100%;height:100%;object-fit:contain}.r2-upload-copy b,.r2-upload-copy small{display:block}.r2-upload-copy b{font-size:11px;color:#292524}.r2-upload-copy small{margin-top:5px;color:#8f8781;font-size:9px;line-height:1.4}.r2-upload-status{min-height:15px;color:#78716c;font-size:9px;font-weight:800}.r2-upload-status.is-error{color:#b91c1c}.r2-upload-status.is-success{color:#047857}
        .school-master-row{grid-template-columns:34px minmax(0,1fr) auto!important}.catalog-row-actions{display:flex;gap:4px}.catalog-school-edit{color:#E75C25!important}.catalog-school-edit svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9}.school-edit-logo-preview{min-height:76px;display:flex;align-items:center;justify-content:center;gap:10px;border:1px dashed #d6d3d1;border-radius:12px;background:#fafaf9}.school-edit-logo-preview img{max-width:120px;max-height:56px}.print-period-card{width:min(540px,calc(100vw - 24px))!important}.print-mode{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:5px;background:#f5f5f4;border-radius:12px}.print-mode button{height:40px;border:0;border-radius:9px;background:transparent;font-size:10px;font-weight:900}.print-mode button.is-active{background:#fff;color:#E75C25}.print-dates{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.print-dates.hidden{display:none!important}.print-dates span{display:block;margin-bottom:5px;font-size:9px;font-weight:900}.print-dates input{width:100%;height:44px;padding:0 12px;border:1px solid #ddd;border-radius:11px}.print-count{margin-top:14px;padding:11px;background:#fff7ed;color:#9a3412;border-radius:11px;font-weight:850}.admin-action-primary:disabled{opacity:.45}@media(max-width:520px){.print-mode,.print-dates{grid-template-columns:1fr}}
    /* ARCHIVE SUMMARY CHIPS */
    .archive-auto-chips{margin-left:auto;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.archive-auto-chips.hidden{display:none!important}.archive-auto-chips span{padding:6px 9px;border:1px solid #f3c8b5;border-radius:999px;background:#fff;color:#b9471d;font-size:8px;font-weight:900;white-space:nowrap}.data-toggle:has(#archive-enabled:not(:checked)) .archive-auto-chips{display:none!important}@media(max-width:650px){.archive-auto-chips{width:100%;margin:8px 0 0;justify-content:flex-start}}
    /* PAGINATION COMMANDES */
    #pane-orders{padding-bottom:24px!important;height:auto!important;min-height:0!important}
    #pane-orders .orders-table-card,#pane-orders .admin-orders-v2-wrap{height:auto!important;min-height:0!important}
    #orders-pagination{position:relative!important;z-index:80!important;margin:14px 0 24px!important;padding:14px 16px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;background:#fff!important;border:1px solid #eee7df!important;border-radius:15px!important;box-shadow:0 12px 30px #1c191714!important}
    .orders-pagination-left{display:flex;align-items:center;gap:18px;color:#6b7280;font-size:11px;font-weight:800}.orders-page-size{display:flex;align-items:center;gap:7px;white-space:nowrap}.orders-page-size select{height:36px;padding:0 30px 0 11px;border:1px solid #ded9d4;border-radius:10px;background:#fff;color:#292524;font-size:11px;font-weight:900;outline:none}.orders-page-size select:focus{border-color:#E75C25;box-shadow:0 0 0 3px rgba(231,92,37,.1)}
    .orders-pagination-nav,.orders-page-numbers{display:flex;align-items:center;gap:7px}.orders-page-direction,.orders-page-number{height:38px;min-width:38px;padding:0 12px;border:1px solid #e4e0dc;border-radius:11px;background:#fff;color:#374151;font-size:11px;font-weight:950;transition:.15s}.orders-page-number{padding:0}.orders-page-direction:hover:not(:disabled),.orders-page-number:hover:not(.is-active){border-color:#E75C25;color:#E75C25;background:#fff8f3}.orders-page-number.is-active{border-color:#E75C25;background:#E75C25;color:#fff;box-shadow:0 8px 18px rgba(231,92,37,.22)}.orders-page-direction:disabled{color:#cbd0d8;background:#fafafa;cursor:not-allowed}.orders-page-ellipsis{min-width:20px;text-align:center;color:#9ca3af;font-weight:900}
    @media(max-width:820px){#orders-pagination{align-items:stretch!important;flex-direction:column!important}.orders-pagination-left{justify-content:space-between;flex-wrap:wrap}.orders-pagination-nav{justify-content:space-between}.orders-page-numbers{max-width:55vw;overflow-x:auto;padding:2px}.orders-page-direction{padding:0 9px}}
    /* IMPRESSION PAR STATUT ET SELECTION MULTIPLE */
    .print-status-field,.bulk-dialog-field{display:flex;flex-direction:column;gap:6px;margin-top:14px}.print-status-field>span,.bulk-dialog-field>span{color:#78716c;font-size:9px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.print-status-field select,.bulk-dialog-field select{width:100%;height:44px;padding:0 12px;border:1px solid #ddd6d1;border-radius:11px;background:#fff;color:#292524;font-size:11px;font-weight:850;outline:none}.print-status-field select:focus,.bulk-dialog-field select:focus{border-color:#E75C25;box-shadow:0 0 0 3px rgba(231,92,37,.1)}
    .orders-bulk-tools{display:flex;align-items:center;gap:7px}.orders-bulk-toggle,.orders-bulk-icon{height:38px;border:1px solid #e7e1dc;border-radius:11px;background:#fff;color:#44403c;font-size:10px;font-weight:900}.orders-bulk-toggle{padding:0 14px}.orders-bulk-toggle.is-active{border-color:#E75C25;background:#fff7ed;color:#E75C25}.orders-bulk-icon{position:relative;width:38px;display:grid;place-items:center;padding:0}.orders-bulk-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.orders-bulk-icon:hover:not(:disabled){border-color:#E75C25;color:#E75C25}.orders-bulk-delete{color:#dc2626}.orders-bulk-delete:hover:not(:disabled){border-color:#dc2626!important;background:#fff5f5!important;color:#dc2626!important}.orders-bulk-icon:disabled{opacity:.4}.orders-bulk-icon span{position:absolute;right:-5px;top:-6px;min-width:17px;height:17px;display:grid;place-items:center;padding:0 4px;border-radius:9px;background:#E75C25;color:#fff;font-size:8px}.orders-bulk-icon.hidden{display:none!important}
    .order-v2.is-bulk-mode{cursor:pointer}.order-v2.is-selected td{background:#fff7ed!important;border-color:#fdba90!important}.order-select-box{display:inline-grid;place-items:center;margin-right:9px;vertical-align:middle;cursor:pointer}.order-select-box input{position:absolute;opacity:0;pointer-events:none}.order-select-box i{width:18px;height:18px;display:block;border:2px solid #d6d3d1;border-radius:6px;background:#fff}.order-select-box input:checked+i{border-color:#E75C25;background:#E75C25;box-shadow:inset 0 0 0 4px #fff}.bulk-edit-card{width:min(500px,calc(100vw - 28px))}.bulk-dialog-field.hidden,#bulk-delete-warning.hidden{display:none!important}

    .bulk-direct-actions{display:grid;gap:16px}.bulk-field-action{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center}.bulk-field-action .admin-action-button{height:44px;min-width:90px}.bulk-delete-zone{margin-top:4px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #fecaca;border-radius:13px;background:#fff7f7}.bulk-delete-zone b{display:block;color:#b91c1c;font-size:11px}.bulk-delete-zone small{display:block;margin-top:4px;color:#8c6d6d;font-size:9px}.admin-action-danger{border:0!important;background:#dc2626!important;color:#fff!important}@media(max-width:560px){.bulk-field-action{grid-template-columns:1fr}.bulk-field-action .admin-action-button{width:100%}.bulk-delete-zone{align-items:stretch;flex-direction:column}.bulk-delete-zone button{width:100%}}
    /* RETOUR A LA LIGNE DES NOMS D ARTICLES */
    .ord-body .item,.ord-body .item>div,.ord-body .item b,.ord-body .item span{min-width:0!important;max-width:100%!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;word-break:break-word!important}
    /* ALIGNEMENT RTL EXACT DES ITEMS ARABES DANS LE PANNEAU COMMANDE */
    #ord-modal .drawer-item-text{display:block!important;min-width:0!important;width:100%!important;max-width:100%!important;overflow-wrap:anywhere!important;word-break:break-word!important}
    #ord-modal .drawer-item-text b,#ord-modal .drawer-item-text small{display:block!important;max-width:100%!important;white-space:normal!important}
    #ord-modal .drawer-item-rtl .drawer-item-text{direction:rtl!important;text-align:right!important;unicode-bidi:plaintext!important;justify-self:stretch!important}
    #ord-modal .drawer-item-rtl .drawer-item-text b,#ord-modal .drawer-item-rtl .drawer-item-text small{direction:rtl!important;text-align:right!important;unicode-bidi:plaintext!important}
    #ord-modal .drawer-item-rtl .drawer-item-text bdi{unicode-bidi:isolate!important}
    #ord-modal .drawer-item-rtl{direction:ltr!important}
    #ord-modal .drawer-item-rtl .drawer-item-price,#ord-modal .drawer-item-rtl .drawer-item-actions{direction:ltr!important}
    /* ADMIN ACTION DIALOGS */
    .admin-action-dialog{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(12,10,9,.58);backdrop-filter:blur(7px)}
    .admin-action-dialog.is-open{display:flex}
    .admin-action-card{width:min(520px,calc(100vw - 28px));overflow:hidden;border:1px solid #eee7df;border-radius:24px;background:#fff;box-shadow:0 30px 100px rgba(0,0,0,.32);animation:adminDialogIn .18s ease-out}
    @keyframes adminDialogIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
    .admin-action-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px 15px;background:linear-gradient(120deg,#fff,#fff8f3);border-bottom:1px solid #eee7df}
    .admin-action-head h3{margin:0;color:#111827;font-size:20px;font-weight:950}.admin-action-head p{margin:5px 0 0;color:#8c827b;font-size:11px;line-height:1.5}.admin-action-close{width:36px;height:36px;display:grid;place-items:center;flex:0 0 auto;border:0;border-radius:11px;background:#f5f5f4;color:#78716c;font-size:22px;cursor:pointer}.admin-action-close:hover{background:#e7e5e4;color:#111827}
    .admin-action-body{padding:18px 22px 22px}.admin-action-alert{padding:13px 14px;border:1px solid #fecaca;border-radius:14px;background:#fef2f2;color:#991b1b;font-size:12px;line-height:1.6}.admin-action-ref{font-weight:950;color:#E75C25}
    .admin-action-buttons{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.admin-action-button{min-height:42px;padding:0 17px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer}.admin-action-cancel{border:1px solid #e7e5e4;background:#fff;color:#57534e}.admin-action-cancel:hover{background:#f5f5f4}.admin-action-danger{border:1px solid #dc2626;background:#dc2626;color:#fff}.admin-action-danger:hover{background:#b91c1c}.admin-action-primary{border:1px solid #159447;background:#159447;color:#fff}.admin-action-primary:hover{background:#117d3c}
    .whatsapp-language{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}.whatsapp-language button{min-height:40px;border:1px solid #e7e5e4;border-radius:12px;background:#fff;color:#78716c;font-size:12px;font-weight:900}.whatsapp-language button.is-active{border-color:#159447;background:#ecfdf3;color:#117d3c;box-shadow:0 0 0 3px rgba(21,148,71,.08)}
    .whatsapp-message-label{display:block;margin-bottom:7px;color:#a8a29e;font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.1em}.whatsapp-message{width:100%;min-height:150px;resize:vertical;padding:13px 14px;border:1px solid #e7e5e4;border-radius:14px;background:#fcfbfa;color:#292524;font-size:12px;line-height:1.6;outline:none}.whatsapp-message:focus{border-color:#159447;box-shadow:0 0 0 3px rgba(21,148,71,.08);background:#fff}
`;
    document.head.appendChild(adminV2Style);
    function closePop(){document.getElementById('chip-pop')?.remove()}
    function isChipPopupInteraction(target) { return target instanceof Element && Boolean(target.closest('#chip-pop, [data-chip]')); }
    document.addEventListener('pointerdown', event => { if (!isChipPopupInteraction(event.target)) closePop(); }, true);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closePop(); closeImportedListPreview(); } });
    window.addEventListener('scroll', closePop, true);
    window.addEventListener('resize', closePop);
    window.addEventListener('blur', closePop);
    function chip(id,type,val){const status=type==='status', label=status?(STATUS_META[val]?.[0]||val):(val==='paid'?'Payé':'Non payé'),cls=status?'s-'+val:'p-'+val;return `<button class="chip-btn" data-chip="${type}" data-id="${id}" data-val="${val}"><span class="chip-face ${cls}">${label}<span class="chip-arrow">⌄</span></span></button>`}
    function bindChips(root){root.querySelectorAll('[data-chip]').forEach(x=>x.addEventListener('click',e=>{e.stopPropagation();closePop();const type=x.dataset.chip,val=x.dataset.val,id=x.dataset.id,opts=type==='status'?Object.entries(STATUS_META).map(([v,m])=>[v,m[0]]):[['unpaid','Non payé'],['paid','Payé']],p=document.createElement('div');p.id='chip-pop';p.className='chip-pop';p.innerHTML=opts.map(([v,l])=>`<button class="chip-opt ${v===val?'on':''}" data-v="${v}"><span>${l}</span><i>✓</i></button>`).join('');document.body.appendChild(p);const r=x.getBoundingClientRect();p.style.left=Math.max(10,Math.min(innerWidth-186,r.left))+'px';p.style.top=(r.bottom+8+p.offsetHeight>innerHeight?Math.max(10,r.top-p.offsetHeight-8):r.bottom+8)+'px';p.querySelectorAll('.chip-opt').forEach(o=>o.onclick=async ev=>{ev.stopPropagation();closePop();if(o.dataset.v===val)return;if(type==='status')await updateOrderStatus(id,o.dataset.v);else await updatePaymentStatus(id,o.dataset.v)})}))}

    function closeAdminActionDialog(){
        const dialog=document.getElementById('admin-action-dialog');
        dialog?.classList.remove('is-open');
        setTimeout(()=>dialog?.remove(),160);
    }
    function openAdminActionDialog(content){
        closeAdminActionDialog();
        const dialog=document.createElement('div');
        dialog.id='admin-action-dialog';
        dialog.className='admin-action-dialog is-open';
        dialog.innerHTML=content;
        dialog.addEventListener('click',event=>{if(event.target===dialog)closeAdminActionDialog()});
        document.body.appendChild(dialog);
        dialog.querySelectorAll('[data-dialog-close]').forEach(button=>button.addEventListener('click',closeAdminActionDialog));
        return dialog;
    }
    function getWhatsappMessages(order){
        const firstName=String(order.client_name||'').trim().split(/\s+/)[0]||'cher client';
        const reference=order.numero_commande||order.id;
        const status=normalizeStatus(order.status);
        const messages={
            new:{
                fr:`Bonjour ${firstName}, nous vous contactons de la Librairie El Qods concernant votre commande n° ${reference}. Merci de nous confirmer la commande par ce message WhatsApp afin que nous puissions commencer sa préparation.`,
                ar:`السلام عليكم ${firstName}، نتواصل معكم من مكتبة القدس بخصوص الطلب رقم ${reference}. المرجو تأكيد الطلب عبر رسالة واتساب حتى نتمكن من بدء تحضيره.`
            },
            ready:{
                fr:`Bonjour ${firstName}, votre commande n° ${reference} est prête. Vous pouvez venir la récupérer à la Librairie El Qods. Merci de présenter votre référence ou votre QR code lors du retrait.`,
                ar:`السلام عليكم ${firstName}، طلبكم رقم ${reference} جاهز. يمكنكم الحضور إلى مكتبة القدس لاستلامه. المرجو تقديم رقم الطلب أو رمز QR عند الاستلام.`
            },
            cancelled:{
                fr:`Bonjour ${firstName}, nous vous informons que votre commande n° ${reference} a été annulée. Pour plus d'informations, vous pouvez répondre directement à ce message ou passer une nouvelle commande.`,
                ar:`السلام عليكم ${firstName}، نخبركم أن الطلب رقم ${reference} قد تم إلغاؤه. للمزيد من المعلومات يمكنكم الرد على هذه الرسالة أو تقديم طلب جديد.`
            }
        };
        return messages[status]||{
            fr:`Bonjour ${firstName}, nous vous contactons de la Librairie El Qods concernant votre commande n° ${reference}.`,
            ar:`السلام عليكم ${firstName}، نتواصل معكم من مكتبة القدس بخصوص الطلب رقم ${reference}.`
        };
    }
    function openWhatsappDialog(orderId){
        const order=currentOrders.find(entry=>String(entry.id)===String(orderId));
        if(!order)return;
        const messages=getWhatsappMessages(order);
        const dialog=openAdminActionDialog(`<div class="admin-action-card"><div class="admin-action-head"><div><h3>Message WhatsApp</h3><p>${escapeHtml(order.client_name||'-')} · #${escapeHtml(order.numero_commande||order.id)}</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><div class="whatsapp-language"><button type="button" class="is-active" data-wa-language="fr">Français</button><button type="button" data-wa-language="ar">العربية</button></div><label class="whatsapp-message-label" for="admin-whatsapp-message">Message pré-écrit</label><textarea id="admin-whatsapp-message" class="whatsapp-message">${escapeHtml(messages.fr)}</textarea><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Annuler</button><button id="admin-whatsapp-send" class="admin-action-button admin-action-primary">Ouvrir WhatsApp</button></div></div></div>`);
        const textarea=dialog.querySelector('#admin-whatsapp-message');
        dialog.querySelectorAll('[data-wa-language]').forEach(button=>button.addEventListener('click',()=>{
            dialog.querySelectorAll('[data-wa-language]').forEach(item=>item.classList.toggle('is-active',item===button));
            const language=button.dataset.waLanguage;
            textarea.value=messages[language];
            textarea.dir=language==='ar'?'rtl':'ltr';
        }));
        dialog.querySelector('#admin-whatsapp-send').addEventListener('click',()=>{
            const phone=formatPhoneForWhatsapp(order.client_phone);
            const message=textarea.value.trim();
            if(!phone)return alert('Le numéro WhatsApp du client est invalide.');
            if(!message)return alert('Le message WhatsApp ne peut pas être vide.');
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,'_blank','noopener');
            closeAdminActionDialog();
        });
    }
    function openDeleteOrderDialog(orderId){
        const order=currentOrders.find(entry=>String(entry.id)===String(orderId));
        if(!order)return;
        const dialog=openAdminActionDialog(`<div class="admin-action-card"><div class="admin-action-head"><div><h3>Supprimer cette commande ?</h3><p>Cette action est définitive.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><div class="admin-action-alert">La commande <span class="admin-action-ref">#${escapeHtml(order.numero_commande||order.id)}</span> de <strong>${escapeHtml(order.client_name||'-')}</strong> sera supprimée définitivement de Supabase. Cette action ne peut pas être annulée.</div><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Conserver</button><button id="admin-delete-confirm" class="admin-action-button admin-action-danger">Supprimer définitivement</button></div></div></div>`);
        dialog.querySelector('#admin-delete-confirm').addEventListener('click',async()=>{
            const button=dialog.querySelector('#admin-delete-confirm');
            button.disabled=true;button.textContent='Suppression…';
            const {error}=await supabaseClient.from('orders').delete().eq('id',orderId);
            if(error){button.disabled=false;button.textContent='Supprimer définitivement';alert('Erreur : '+error.message);return;}
            closeAdminActionDialog();closeOrder();await loadOrders();
        });
    }
    function orderSupplyConfigurationText(item){
        const parts=[];
        if(item?.supply_range)parts.push(String(item.supply_range).toLowerCase()==='quality'?'Qualité':'Standard');
        const configuration=Array.isArray(item?.supply_configuration)?item.supply_configuration:[];
        configuration.forEach(choice=>{const value=choice?.value_label||choice?.value||choice?.label;if(value)parts.push(String(value))});
        return [...new Set(parts.filter(Boolean))].join(', ');
    }
    function orderItemDisplayName(item){const details=orderSupplyConfigurationText(item);return `${item?.name||'Article'}${details?` (${details})`:''}`;}
    function printOrder(id,options={}){
        const order=currentOrders.find(entry=>String(entry.id)===String(id));
        if(!order)return;
        const items=parseItems(order.items).filter(item=>item.type!=='photo_upload');
        const photoOrder=isPhotoListOrder(order,parseItems(order.items));
        const reference=escapeHtml(order.numero_commande||order.id||'-');
        const createdValue=order.created_at||order.inserted_at||new Date().toISOString();
        const created=new Date(createdValue).toLocaleDateString('fr-FR');
        const deadline=getDeadline(order).toLocaleDateString('fr-FR');
        const schoolItem=items.find(item=>item.school_name||item.school_level)||{};
        const school=escapeHtml(schoolItem.school_name||order.school_name||'-');
        const level=escapeHtml(schoolItem.school_level||order.school_level||'-');
        const hasSupplies=items.some(item=>item.item_source==='independent_supply'||item.supply_range);
        const listType=photoOrder?'Ma propre liste':hasSupplies?'Liste officielle du site + fournitures personnalisées':'Liste officielle du site';
        const pickup=orderPickupLabel(order);
        const payment=String(order.payment_status||'unpaid')==='paid'?'Payé':'Non payé';
        const total=orderTotal(order);
        const suppliesTotal=items.filter(item=>item.item_source==='independent_supply'||Boolean(item.supply_range)).reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.quantity)||1),0);
        const photoPrice=photoOrder?Math.max(0,Number(total)-suppliesTotal):0;
        const printableItems=photoOrder?[{name:'Commande par photo',quantity:1,price:photoPrice},...items]:items;
        const itemRows=(printableItems.length?printableItems:[{name:'Commande par photo',quantity:1,price:0}]).map((item,index)=>{
            const quantity=Number(item.quantity)||1;
            const unit=Number(item.price)||0;
            const configuration=orderSupplyConfigurationText(item);return `<tr><td class="check"><span></span></td><td class="num">${index+1}</td><td class="article"><span>${escapeHtml(item.name||'Article')}</span>${configuration?` <em>(${escapeHtml(configuration)})</em>`:''}</td><td class="qty">${quantity}</td><td class="price">${unit.toFixed(2)}</td><td class="line-total">${(unit*quantity).toFixed(2)}</td></tr>`;
        }).join('');
        const qrValue=encodeURIComponent(String(order.qr_payload||order.qr_code||order.numero_commande||order.id||''));
        const printWindow=options.returnHtml?null:window.open('','_blank','width=760,height=900');
        if(!options.returnHtml&&!printWindow)return alert('Autorisez les popups pour imprimer le bon de commande.');
        const exactA5Html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Bon A5 - ${reference}</title><style>
            @page{size:A5 portrait;margin:7mm}
            *{box-sizing:border-box}
            html,body{margin:0;padding:0;background:#fff;color:#1c1917;font-family:Aptos,"Segoe UI",Arial,sans-serif;font-size:9.4pt;line-height:1.25;-webkit-print-color-adjust:exact;print-color-adjust:exact}
            .sheet{width:100%;min-height:196mm;position:relative;padding-bottom:3mm}
            .top{display:grid;grid-template-columns:1fr auto;gap:7mm;align-items:start;border-bottom:2px solid #e75c25;padding-bottom:4mm}
            .brand{display:flex;gap:3mm;align-items:center}.brand img{width:17mm;height:17mm;object-fit:contain}.brand h1{margin:0;color:#e75c25;font-size:15pt;line-height:1}.brand p{margin:1.5mm 0 0;color:#78716c;font-size:7.8pt}
            .ref{text-align:right}.ref small{display:block;color:#a8a29e;font-weight:700;text-transform:uppercase;font-size:6.8pt;letter-spacing:.08em}.ref strong{display:block;color:#e75c25;font-size:13pt;white-space:nowrap}.ref time{display:block;margin-top:1mm;color:#57534e;font-size:7.5pt}
            .info{display:grid;grid-template-columns:1fr 1fr;gap:1.7mm 5mm;padding:3mm;border:1px solid #e7e5e4;border-radius:3mm;background:#fffdfb}.field{display:grid;grid-template-columns:29mm 1fr;gap:2mm}.field b{font-size:7.4pt;color:#78716c}.field span{font-weight:700;overflow-wrap:anywhere}.wide{grid-column:1/-1}
            table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:3mm;break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th{padding:1.7mm 1mm;border-top:1.2px solid #57534e;border-bottom:1.2px solid #57534e;text-align:left;font-size:7.2pt;color:#57534e}td{padding:1.65mm 1mm;border-bottom:.5px solid #d6d3d1;vertical-align:middle;font-size:8pt}.check{width:7mm}.check span{display:block;width:3.6mm;height:3.6mm;border:1px solid #57534e}.num{width:7mm;text-align:center;color:#78716c}.article{width:auto;font-weight:400;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.3}.article span,.article em{white-space:normal;overflow-wrap:anywhere;word-break:break-word}.article span{font-weight:400}.article em{font-weight:400;font-style:italic;color:#57534e}.qty{width:12mm;text-align:center;font-weight:800}.price,.line-total{width:18mm;text-align:right;font-variant-numeric:tabular-nums}.line-total{font-weight:800}
            .total{margin-top:3mm;display:flex;justify-content:space-between;align-items:center;padding:3mm 3.5mm;border-radius:2.5mm;background:#e75c25;color:#fff;break-inside:avoid}.total span{font-weight:800}.total strong{font-size:12pt}
            .control{display:grid;grid-template-columns:1fr 30mm;gap:4mm;margin-top:3mm;align-items:end;break-inside:avoid}.control-lines{display:grid;grid-template-columns:1fr;gap:3mm}.sign{height:12mm;border-bottom:1px solid #78716c;color:#78716c;font-size:7pt;padding-top:1mm}.qr{display:flex;justify-content:flex-end}.qr img{width:24mm;height:24mm;object-fit:contain}
            @media screen{body{background:#eee;padding:12px}.sheet{width:148mm;min-height:210mm;margin:auto;padding:7mm;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.14)}}
            @media print{.sheet{min-height:196mm}.no-print{display:none!important}}
        
    .photo-price-warning-card{width:min(430px,calc(100vw - 24px))!important;max-width:430px!important;overflow:hidden!important;border:1px solid #e7ded7!important;border-radius:20px!important;background:#fff!important;box-shadow:0 22px 58px rgba(28,25,23,.22)!important}.photo-price-warning-head{min-height:76px!important;padding:16px 18px!important;display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:14px!important;background:linear-gradient(135deg,#fffaf7,#fff)!important;border-bottom:1px solid #f0e7e1!important}.photo-price-warning-title{min-width:0}.photo-price-warning-title h3{margin:0;color:#111827;font-size:19px;font-weight:950;line-height:1.15;letter-spacing:-.025em}.photo-price-warning-title p{margin:7px 0 0;color:#8b8580;font-size:9.5px;line-height:1.35}.photo-price-warning-close{width:36px!important;height:36px!important;flex:0 0 auto!important;display:grid!important;place-items:center!important;border:0!important;border-radius:12px!important;background:#f5f5f4!important;color:#78716c!important;font-size:20px!important;line-height:1!important}.photo-price-warning-close:hover{background:#eceae8!important;color:#292524!important}.photo-price-warning-body{padding:16px 18px 18px!important}.photo-price-warning-message{padding:14px 15px;border:1px solid #fecaca;border-radius:14px;background:#fff7f7;color:#b91c1c;font-size:11.5px;line-height:1.5}.photo-price-warning-message strong{font-weight:950}.photo-price-warning-actions{margin-top:16px!important;display:flex!important;justify-content:flex-end!important}.photo-price-warning-confirm{width:auto!important;min-width:82px!important;padding:10px 18px!important;border-radius:12px!important;background:#e62424!important;color:#fff!important;font-size:11.5px!important;font-weight:950!important;box-shadow:none!important}.photo-price-warning-confirm:hover{background:#c91e1e!important}@media(max-width:480px){.photo-price-warning-card{width:calc(100vw - 18px)!important;border-radius:18px!important}.photo-price-warning-head,.photo-price-warning-body{padding:14px!important}.photo-price-warning-title h3{font-size:18px}.photo-price-warning-title p{font-size:9px}}
</style></head><body><main class="sheet">
            <header class="top"><div class="brand"><img src="images/logo.png" alt=""><div><h1>Librairie El Qods</h1><p>50 Bd Chouhada, 60300 Berkane, Maroc<br><span class="nowrap">Téléphone : +212 5 36 23 02 59</span></p></div></div><div class="ref"><small>Bon de préparation A5</small><strong>#${reference}</strong><time>${created}</time></div></header>
            <section class="info"><div class="field"><b>Client</b><span>${escapeHtml(order.client_name||'-')}</span></div><div class="field"><b>WhatsApp</b><span class="nowrap">${escapeHtml(order.client_phone||'-')}</span></div><div class="field"><b>École</b><span>${school}</span></div><div class="field"><b>Niveau</b><span>${level}</span></div><div class="field wide"><b>Type de liste</b><span>${escapeHtml(listType)}</span></div><div class="field"><b>Paiement</b><span>${payment}</span></div><div class="field"><b>Réservation</b><span>jusqu'au ${deadline}</span></div></section>
            <table><thead><tr><th class="check">OK</th><th class="num">#</th><th>Article</th><th class="qty">Qté</th><th class="price">Unitaire</th><th class="line-total">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
            <div class="total"><span>TOTAL DE LA COMMANDE</span><strong>${total>0?Number(total).toFixed(2)+' MAD':'SUR DEVIS'}</strong></div>
            <section class="control"><div class="control-lines"><div class="sign">Préparé par :</div></div><div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=${qrValue}" alt="QR"></div></section>
        </main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script></body></html>`;
        if(options.returnHtml)return exactA5Html;
        printWindow.document.write(exactA5Html);
        printWindow.document.close();
    }
    function closeOrder(){document.getElementById('ord-modal')?.classList.remove('open');document.body.style.overflow=''}
    function isPhotoListOrder(order, items) {
        return Boolean(order.google_drive_url || order.google_drive_file_id || order.upload_completed || (items || []).some(item => item.type === 'photo_upload' || item.url || item.photo_url));
    }
    function orderPickupLabel(order) {
        const value = String(order.fulfillment_method || order.delivery_method || order.delivery_type || '').toLowerCase();
        return value === 'delivery' || value.includes('livraison') ? 'Livraison' : 'Retrait au magasin';
    }
    function photoOrderSuppliesMinimum(order) {
        return parseItems(order?.items).filter(item=>item.item_source==='independent_supply'||Boolean(item.supply_range)).reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.quantity)||1),0);
    }
    async function savePhotoOrderPrice(orderId, value) {
        const amount = Number(value);
        const order = currentOrders.find(entry => String(entry.id) === String(orderId));
        const minimum = photoOrderSuppliesMinimum(order);
        if (!Number.isFinite(amount) || amount < 0) throw new Error('Saisissez un prix valide.');
        if (amount < minimum) throw new Error(`Le prix total ne peut pas être inférieur aux fournitures sélectionnées (${minimum.toFixed(2)} DH).`);
        const { error } = await supabaseClient.from('orders').update({ total_amount: amount }).eq('id', orderId);
        if (error) throw error;
        if (order) order.total_amount = amount;
        return amount;
    }
    function openPhotoPriceMinimumDialog(minimum) {
        const dialog=openAdminActionDialog(`<div class="admin-action-card photo-price-warning-card">
            <div class="admin-action-head photo-price-warning-head">
                <div class="photo-price-warning-title"><h3>Montant insuffisant</h3><p>Le total doit couvrir les fournitures déjà ajoutées à la commande.</p></div>
                <button class="admin-action-close photo-price-warning-close" data-dialog-close aria-label="Fermer">×</button>
            </div>
            <div class="admin-action-body photo-price-warning-body">
                <div class="photo-price-warning-message">Le prix total doit être au minimum de <strong>${Number(minimum||0).toFixed(2)} DH</strong>, correspondant aux fournitures ajoutées.</div>
                <div class="admin-action-buttons photo-price-warning-actions"><button class="admin-action-button photo-price-warning-confirm" data-dialog-close>Fermer</button></div>
            </div>
        </div>`);
        dialog.querySelector('.photo-price-warning-confirm')?.focus();
    }
    function drawerItemArabic_(value){return /[\u0600-\u06FF]/.test(String(value||''));}
    function openOrder(id){
        const o=currentOrders.find(x=>String(x.id)===String(id));if(!o)return;
        const items=parseItems(o.items),status=normalizeStatus(o.status),deadline=getDeadline(o),photoOrder=isPhotoListOrder(o,items),qrValue=String(o.qr_payload||o.qr_code||o.numero_commande||o.id||''),qrSrc=`https://api.qrserver.com/v1/create-qr-code/?size=230x230&margin=8&data=${encodeURIComponent(qrValue)}`,amount=Number(o.total_amount??items.reduce((sum,item)=>sum+(Number(item.price)||0),0));
        const schoolItems=items.filter(item=>item.item_source==='school_list'||(!item.item_source&&!item.supply_range&&item.type!=='photo_upload'));
        const supplyItems=items.filter(item=>item.item_source==='independent_supply'||Boolean(item.supply_range));
        const schoolName=schoolItems.find(item=>item.school_name)?.school_name||o.school_name||'',schoolLevel=schoolItems.find(item=>item.school_level)?.school_level||o.school_level||'',imageUrl=getImportedListUrl(o,items);
        const listMetaItem=schoolItems.find(item=>item.school_list_original_count!==undefined||item.school_list_unselected_count!==undefined||Array.isArray(item.school_list_unselected_items))||{};
        const unselectedSchoolItems=Array.isArray(listMetaItem.school_list_unselected_items)?listMetaItem.school_list_unselected_items:[];
        const originalListCount=Number(listMetaItem.school_list_original_count);
        const selectedListCount=Number(listMetaItem.school_list_selected_count);
        const storedUnselectedCount=Number(listMetaItem.school_list_unselected_count);
        const unselectedListCount=Number.isFinite(storedUnselectedCount)
            ? Math.max(0,storedUnselectedCount)
            : (Number.isFinite(originalListCount)&&Number.isFinite(selectedListCount)
                ? Math.max(0,originalListCount-selectedListCount)
                : 0);
        const listCompletionLabel=unselectedListCount===0
            ? 'Liste complète'
            : `${unselectedListCount} article${unselectedListCount>1?'s':''} non sélectionné${unselectedListCount>1?'s':''}`;
        let drawer=document.getElementById('ord-modal');if(!drawer){drawer=document.createElement('div');drawer.id='ord-modal';drawer.className='ord-modal';drawer.addEventListener('click',e=>{if(e.target===drawer)closeOrder()});document.body.appendChild(drawer)}drawer.dataset.orderId=String(o.id);
        const priceAttrs=photoOrder?' contenteditable="true" role="textbox" aria-label="Modifier le prix final" class="ord-price is-editable"':' class="ord-price"';
        const drawerItemRow_=(item,number,options={})=>{const name=item.name||item.label||options.fallback||'Article',rtl=drawerItemArabic_(name),subtitle=options.subtitle||item.category||'Liste scolaire';return `<div class="drawer-item${options.unselected?' drawer-item-unselected':''}${rtl?' drawer-item-rtl':''}"><span class="drawer-item-text" dir="${rtl?'rtl':'ltr'}"><b>${rtl?`<bdi>${escapeHtml(name)}</bdi> <bdi>${number}.</bdi>`:`${number}. ${escapeHtml(name)}`}</b><small>${escapeHtml(subtitle)}</small></span>${options.unselected?`<span class="drawer-item-actions"><span class="drawer-unselected-chip">Non sélectionné</span><span class="drawer-item-price">${money(item.price)}</span></span>`:`<span class="drawer-item-price">${money(item.price)}</span>`}</div>`};
        const selectedSchoolRows=schoolItems.map((item,i)=>drawerItemRow_(item,i+1)).join('');
        const unselectedSchoolRows=unselectedSchoolItems.map((item,i)=>drawerItemRow_(item,schoolItems.length+i+1,{unselected:true})).join('');
        const schoolRows=(selectedSchoolRows+unselectedSchoolRows)||'<div class="drawer-empty">Aucun article de liste officielle.</div>';
        const supplyRows=supplyItems.length?supplyItems.map((item,i)=>drawerItemRow_(item,i+1,{fallback:'Fourniture',subtitle:orderSupplyConfigurationText(item)||'Standard'})).join(''):'<div class="drawer-empty">Aucune fourniture complémentaire sélectionnée.</div>';
        drawer.innerHTML=`<aside class="ord-card" role="dialog" aria-modal="true">
          <header class="ord-head"><div class="ord-head-top"><div class="ord-reference-line"><h2 class="ord-title" title="#${escapeHtml(o.numero_commande||o.id)}">#${escapeHtml(o.numero_commande||o.id)}</h2><button type="button" class="copy-order-reference" title="Copier la référence"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="11" height="13" rx="2"/><rect x="4" y="3" width="11" height="13" rx="2"/></svg></button></div>
          <div class="ord-head-actions"><button class="act wa drawer-wa" title="WhatsApp"><svg class="wa-icon" viewBox="0 0 24 24"><path d="M12.04 2a9.84 9.84 0 0 0-8.43 14.9L2 22l5.23-1.55A9.98 9.98 0 1 0 12.04 2Zm0 17.98a8.08 8.08 0 0 1-4.12-1.13l-.3-.18-3.1.92.93-3.02-.2-.31A7.86 7.86 0 0 1 4 12.02a8.03 8.03 0 1 1 8.04 7.96Zm4.43-6.03c-.24-.12-1.44-.7-1.66-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.2-.72-.63-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.29-.74-1.77-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.57 4.1 3.6.57.24 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"/></svg></button><button class="act pr drawer-print"><svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/></svg></button><button class="act del drawer-delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></svg></button><button class="close" type="button">×</button></div></div><div class="ord-head-bottom"><div class="ord-head-chips">${chip(o.id,'status',status)}${chip(o.id,'payment',o.payment_status||'unpaid')}</div><div class="ord-price-wrap"><div id="modal-order-price"${priceAttrs}>Prix : ${money(amount)}</div>${photoOrder?'<div id="ord-price-save-state" class="ord-price-save-state"></div>':''}</div></div></header>
          <nav class="ord-tabs"><button class="ord-tab is-active" data-order-tab="info">Info commande</button><button class="ord-tab" data-order-tab="list">Liste</button><button class="ord-tab" data-order-tab="supplies">Fourniture</button></nav>
          <div class="ord-body"><section class="ord-tab-panel is-active" data-order-panel="info"><div class="drawer-client"><div class="drawer-info-card"><span class="lab">Client</span><span class="val">${escapeHtml(o.client_name||'-')}</span></div><div class="drawer-info-card"><span class="lab">Téléphone</span><span class="val">${escapeHtml(o.client_phone||'-')}</span></div><div class="drawer-info-card"><span class="lab">E-mail</span><span class="val">${escapeHtml(o.client_email||'-')}</span></div></div><div class="drawer-info-grid mt-3"><div class="drawer-info-card"><span class="lab">Mode de retrait</span><span class="val">${escapeHtml(orderPickupLabel(o))}</span></div><div class="drawer-info-card"><span class="lab">Nombre d’articles</span><span class="val">${items.length||1}</span></div><div class="drawer-info-card"><span class="lab">Échéance</span><span class="val">${deadline.toLocaleDateString('fr-FR')}</span></div><div class="drawer-info-card"><span class="lab">Créée le</span><span class="val">${getCreatedDate(o).toLocaleString('fr-FR')}</span></div><div class="drawer-info-card is-wide drawer-qr"><img src="${qrSrc}" alt="QR code"><div class="drawer-qr-copy"><b>QR code de la commande</b><span>${escapeHtml(qrValue)}</span></div></div></div>${o.order_instructions?`<div class="order-instructions-admin"><span class="lab">Consignes pour la commande</span><p>${escapeHtml(o.order_instructions)}</p></div>`:''}</section>
          <section class="ord-tab-panel" data-order-panel="list"><div class="drawer-section-title"><h3>${photoOrder?'Liste personnelle importée':'Liste officielle'}</h3><span>${photoOrder?'Image':`${schoolItems.length} article(s)`}</span></div>${photoOrder?(imageUrl?`<a class="drawer-image-link" href="${escapeHtml(imageUrl)}" target="_blank"><span>Ouvrir l’image de la liste</span><span>↗</span></a>`:'<div class="drawer-empty">Le lien de l’image n’est pas disponible.</div>'):`<div class="drawer-list-meta"><span class="drawer-meta-chip">${escapeHtml(schoolName||'École non renseignée')}</span><span class="drawer-meta-chip">${escapeHtml(schoolLevel||'Niveau non renseigné')}</span><span class="drawer-meta-chip">${schoolName?`Liste ${escapeHtml(schoolName)}`:'Liste officielle'} · ${escapeHtml(listCompletionLabel)}</span></div><div class="drawer-item-list">${schoolRows}</div>`}</section>
          <section class="ord-tab-panel" data-order-panel="supplies"><div class="drawer-section-title"><h3>Fournitures complémentaires</h3><span>${supplyItems.length} article(s)</span></div><div class="drawer-item-list">${supplyRows}</div></section></div></aside>`;
        drawer.querySelector('.close').onclick=closeOrder;drawer.querySelectorAll('.ord-tab').forEach(tab=>tab.onclick=()=>{drawer.querySelectorAll('.ord-tab').forEach(b=>b.classList.toggle('is-active',b===tab));drawer.querySelectorAll('.ord-tab-panel').forEach(panel=>panel.classList.toggle('is-active',panel.dataset.orderPanel===tab.dataset.orderTab))});
        drawer.querySelector('.drawer-wa').onclick=()=>openWhatsappDialog(o.id);drawer.querySelector('.drawer-print').onclick=()=>printOrder(o.id);drawer.querySelector('.drawer-delete').onclick=()=>openDeleteOrderDialog(o.id);
        const copy=drawer.querySelector('.copy-order-reference');copy.onclick=async()=>{const ref=String(o.numero_commande||o.id||'').replace(/^#/,'');try{await navigator.clipboard.writeText(ref)}catch(_){const t=document.createElement('textarea');t.value=ref;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}copy.classList.add('is-copied');setTimeout(()=>copy.classList.remove('is-copied'),1100)};
        const price=drawer.querySelector('#modal-order-price.is-editable');if(price){price.dataset.savedAmount=amount.toFixed(2);price.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();price.blur();return}if(e.ctrlKey||e.metaKey||e.altKey||['Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab'].includes(e.key))return;if(!/^[0-9.]$/.test(e.key)||(e.key==='.'&&price.textContent.includes('.')))e.preventDefault()};price.oninput=()=>{let clean=price.textContent.replace(/[^0-9.]/g,''),dot=clean.indexOf('.');if(dot!==-1)clean=clean.slice(0,dot+1)+clean.slice(dot+1).replace(/\./g,'');if(price.textContent!==clean)price.textContent=clean};price.onfocus=()=>{price.textContent=Number(price.dataset.savedAmount||0).toFixed(2);const r=document.createRange();r.selectNodeContents(price);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r)};price.onblur=async()=>{const state=drawer.querySelector('#ord-price-save-state'),next=Number(price.textContent.replace(/[^0-9.]/g,''));const minimum=photoOrderSuppliesMinimum(o);if(!Number.isFinite(next)||next<minimum){price.textContent=`Prix : ${money(Number(price.dataset.savedAmount||0))}`;if(state)state.textContent='';if(Number.isFinite(next)&&next<minimum)openPhotoPriceMinimumDialog(minimum);return}if(next===Number(price.dataset.savedAmount)){price.textContent=`Prix : ${money(next)}`;if(state)state.textContent='';return}price.classList.add('is-saving');if(state)state.textContent='Enregistrement…';try{const saved=await savePhotoOrderPrice(o.id,next);price.dataset.savedAmount=saved.toFixed(2);price.textContent=`Prix : ${money(saved)}`;if(state)state.textContent=''}catch(err){price.textContent=`Prix : ${money(Number(price.dataset.savedAmount||0))}`;alert(err.message)}finally{price.classList.remove('is-saving')}}}
        bindChips(drawer);drawer.classList.add('open');document.body.style.overflow='hidden';
    }
    window.printAdminOrder=printOrder;window.openAdminOrderModal=openOrder;window.closeAdminOrderModal=closeOrder;

    let currentOrders = [];
    let currentOrdersPage = 1;
    let ordersPerPage = 10;
    let bulkSelectionMode = false;
    const selectedOrderIds = new Set();
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
    const itemLanguageControl = document.getElementById('admin-item-language');
    let selectedItemLanguage = 'fr';
    function setItemLabelLanguage(language='fr'){
        selectedItemLanguage=language==='ar'?'ar':'fr';
        itemLanguageControl?.querySelectorAll('[data-item-language]').forEach(button=>{
            const active=button.dataset.itemLanguage===selectedItemLanguage;
            button.classList.toggle('is-active',active);
            button.setAttribute('aria-pressed',active?'true':'false');
        });
        if(inputItemName){
            inputItemName.lang=selectedItemLanguage;
            inputItemName.dir=selectedItemLanguage==='ar'?'rtl':'ltr';
            inputItemName.placeholder=selectedItemLanguage==='ar'?'مثال: دفتر 96 صفحة':'Ex : Cahier 96 pages';
            inputItemName.classList.toggle('is-arabic',selectedItemLanguage==='ar');
        }
    }
    itemLanguageControl?.querySelectorAll('[data-item-language]').forEach(button=>button.addEventListener('click',()=>{setItemLabelLanguage(button.dataset.itemLanguage);inputItemName?.focus();}));
    setItemLabelLanguage('fr');
    const inputItemPrice = document.getElementById('admin-item-price');
    const inputItemAvailability = document.getElementById('admin-item-availability');
    const selectItemCategory = document.getElementById('admin-item-category');
    const previewBox = document.getElementById('admin-items-preview');
    const packFormTitle = document.getElementById('pack-form-title');
    const btnSavePack = document.getElementById('btn-save-pack');
    const btnCancelEditPack = document.getElementById('btn-cancel-edit-pack');

    const packEditorOverlay=document.getElementById('pack-editor-overlay'),packDrawerTitle=document.getElementById('pack-editor-drawer-title'),packDrawerKicker=document.getElementById('pack-editor-drawer-kicker'),packDrawerPrice=document.getElementById('pack-drawer-price'),schoolDrawerTabs=document.getElementById('school-drawer-tabs'),supplyDrawerTabs=document.getElementById('supply-drawer-tabs');
    let activePackDrawerKind=null,packDrawerBaseline='';
    let schoolCatalogCache=[], levelCatalogCache=[], supplyCategoryCache=[];
    function catalogEscape(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
    function setPackDrawerValidationError(message=''){
        const box=document.getElementById('pack-drawer-validation-error');
        if(!box)return;box.textContent=message;box.classList.toggle('is-visible',Boolean(message));
    }
    function normalizeCatalogName(value){return String(value||'').trim().toLocaleLowerCase('fr-FR');}
    function refreshAvailableLevelOptions(selectedLevel=''){
        const school=document.getElementById('cfg-school')?.value||'';
        const levelSelect=document.getElementById('cfg-level');
        if(!levelSelect)return;
        const editingId=editingListId==null?'':String(editingListId);
        const usedLevels=new Set((window.schoolListsCache||[]).filter(list=>normalizeCatalogName(list.school_name)===normalizeCatalogName(school)&&String(list.id)!==editingId).map(list=>normalizeCatalogName(list.level)));
        [...levelSelect.options].forEach(option=>{
            if(!option.value)return;
            const used=usedLevels.has(normalizeCatalogName(option.value));
            option.disabled=used;
            option.textContent=used?`${option.value} — déjà ajouté`:option.value;
        });
        if(selectedLevel)levelSelect.value=selectedLevel;
        if(levelSelect.selectedOptions[0]?.disabled)levelSelect.value='';
    }
    function validateSchoolListDrawer(){
        const school=document.getElementById('cfg-school')?.value||'';
        const level=document.getElementById('cfg-level')?.value||'';
        let message='';
        if(!school&&!level)message="Sélectionnez une école et un niveau.";
        else if(!school)message="Sélectionnez une école.";
        else if(!level)message="Sélectionnez un niveau disponible.";
        else if(!currentFormItems.length)message="Ajoutez au moins un élément à la liste scolaire.";
        setPackDrawerValidationError(message);
        return !message;
    }
    function fillSchoolAndLevelDropdowns(selectedSchool='',selectedLevel=''){
        const schoolSelect=document.getElementById('cfg-school'),levelSelect=document.getElementById('cfg-level');
        if(schoolSelect){schoolSelect.innerHTML='<option value="">Sélectionner une école</option>'+schoolCatalogCache.filter(x=>x.is_active!==false).map(x=>`<option value="${catalogEscape(x.name)}" data-id="${x.id}" data-logo="${catalogEscape(x.logo_url||'')}">${catalogEscape(x.name)}</option>`).join('');if(selectedSchool)schoolSelect.value=selectedSchool;}
        if(levelSelect){levelSelect.innerHTML='<option value="">Sélectionner un niveau</option>'+levelCatalogCache.filter(x=>x.is_active!==false).map(x=>`<option value="${catalogEscape(x.name)}" data-id="${x.id}">${catalogEscape(x.name)}</option>`).join('');if(selectedLevel)levelSelect.value=selectedLevel;}
        syncSelectedSchoolLogo();
        refreshAvailableLevelOptions(selectedLevel);
    }
    async function loadSchoolAndLevelCatalogs(selectedSchool='',selectedLevel=''){
        const [schoolsResult,levelsResult]=await Promise.all([supabaseClient.from('schools').select('*').order('name',{ascending:true}),supabaseClient.from('school_levels').select('*').order('name',{ascending:true})]);
        if(schoolsResult.error||levelsResult.error){console.error('Chargement des catalogues impossible',schoolsResult.error||levelsResult.error);return;}
        schoolCatalogCache=schoolsResult.data||[];levelCatalogCache=levelsResult.data||[];fillSchoolAndLevelDropdowns(selectedSchool,selectedLevel);renderMasterCatalogs();
    }
    function syncSelectedSchoolLogo(){const select=document.getElementById('cfg-school'),logo=document.getElementById('cfg-school-logo-url');if(!select||!logo)return;logo.value=select.selectedOptions[0]?.dataset.logo||'';updateSchoolLogoPreview();}
    function openCreateSchoolDialog(){
        const dialog=openAdminActionDialog(`<div class="admin-action-card catalog-create-dialog"><div class="admin-action-head"><div><h3>Ajouter une école</h3><p>Le logo sera stocké dans Cloudflare R2.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><label class="catalog-dialog-field"><span>Nom de l'école</span><input id="catalog-school-name" type="text" placeholder="Ex : École Al Anouar"></label><div class="r2-upload-field"><span class="text-[9px] font-black uppercase text-stone-500">Logo de l’école</span><label class="r2-upload-zone" for="catalog-school-logo-file"><input id="catalog-school-logo-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><span id="catalog-school-logo-preview" class="r2-upload-preview">R2</span><span class="r2-upload-copy"><b>Choisir un logo</b><small>JPG, PNG, WEBP ou GIF · 5 Mo maximum</small></span></label><div id="catalog-school-logo-status" class="r2-upload-status"></div></div><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Annuler</button><button id="catalog-school-save" class="admin-action-button admin-action-primary">Ajouter</button></div></div></div>`);
        const nameInput=dialog.querySelector('#catalog-school-name'),fileInput=dialog.querySelector('#catalog-school-logo-file'),preview=dialog.querySelector('#catalog-school-logo-preview'),status=dialog.querySelector('#catalog-school-logo-status'),save=dialog.querySelector('#catalog-school-save');
        let previewUrl='';
        fileInput.onchange=()=>{const file=fileInput.files?.[0];if(previewUrl)URL.revokeObjectURL(previewUrl);preview.innerHTML='R2';status.textContent='';status.className='r2-upload-status';if(file){previewUrl=URL.createObjectURL(file);preview.innerHTML=`<img src="${previewUrl}" alt="Aperçu">`;}};
        save.onclick=async()=>{const name=nameInput.value.trim(),file=fileInput.files?.[0];if(!name)return alert("Saisissez le nom de l'école.");if(!file)return alert("Sélectionnez le logo de l’école.");save.disabled=true;save.textContent='Envoi vers R2…';try{const uploaded=await uploadAdminImageToR2(file,'school_logo');status.textContent='Logo envoyé dans Cloudflare R2.';status.className='r2-upload-status is-success';const {data,error}=await supabaseClient.from('schools').insert([{name,logo_url:uploaded.url,is_active:true}]).select().single();if(error)throw error;closeAdminActionDialog();await loadSchoolAndLevelCatalogs(data.name,document.getElementById('cfg-level')?.value||'');}catch(error){status.textContent=error.message;status.className='r2-upload-status is-error';save.disabled=false;save.textContent='Ajouter';}};
        nameInput?.focus();
    }
    function openCreateLevelDialog(){
        const dialog=openAdminActionDialog(`<div class="admin-action-card catalog-create-dialog"><div class="admin-action-head"><div><h3>Ajouter un niveau</h3><p>Le niveau sera disponible pour toutes les écoles.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><label class="catalog-dialog-field"><span>Nom du niveau</span><input id="catalog-level-name" type="text" placeholder="Ex : CE1"></label><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Annuler</button><button id="catalog-level-save" class="admin-action-button admin-action-primary">Ajouter</button></div></div></div>`);
        dialog.querySelector('#catalog-level-save').onclick=async()=>{const name=dialog.querySelector('#catalog-level-name').value.trim();if(!name)return alert('Saisissez le nom du niveau.');const {data,error}=await supabaseClient.from('school_levels').insert([{name,is_active:true}]).select().single();if(error)return alert(error.message);closeAdminActionDialog();await loadSchoolAndLevelCatalogs(document.getElementById('cfg-school')?.value||'',data.name);};
        dialog.querySelector('#catalog-level-name')?.focus();
    }
    async function loadSupplyCategories(selectedId=''){
        const {data,error}=await supabaseClient.from('supply_categories').select('*').order('name',{ascending:true});
        if(error){console.error(error);return;}
        supplyCategoryCache=data||[];
        const select=document.getElementById('supply-item-category-id');if(select){select.innerHTML='<option value="">Sélectionner une catégorie</option>'+supplyCategoryCache.map(c=>`<option value="${c.id}">${catalogEscape(c.name)}</option>`).join('');if(selectedId)select.value=String(selectedId);}
        const filter=document.getElementById('filter-supply-category');if(filter){const value=filter.value;filter.innerHTML='<option value="">Toutes les catégories</option>'+supplyCategoryCache.map(c=>`<option value="${c.id}">${catalogEscape(c.name)}</option>`).join('');filter.value=value;syncAdminMultiSelect('filter-supply-category');}
        renderMasterCatalogs();
    }
    function masterMinusIcon(){return '<span aria-hidden="true">−</span>'}
    function openEditSchoolDialog(id){
        const school=schoolCatalogCache.find(x=>String(x.id)===String(id));if(!school)return;
        const oldName=String(school.name||'');
        const d=openAdminActionDialog(`<div class="admin-action-card catalog-create-dialog"><div class="admin-action-head"><div><h3>Modifier l’école</h3><p>Remplacez le logo par une nouvelle image R2 si nécessaire.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><label class="catalog-dialog-field"><span>Nom</span><input id="school-edit-name" value="${catalogEscape(oldName)}"></label><div class="r2-upload-field"><span class="text-[9px] font-black uppercase text-stone-500">Logo de l’école</span><label class="r2-upload-zone" for="school-edit-logo-file"><input id="school-edit-logo-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><span id="school-edit-r2-preview" class="r2-upload-preview">${school.logo_url?`<img src="${catalogEscape(school.logo_url)}" alt="Logo actuel">`:'R2'}</span><span class="r2-upload-copy"><b>${school.logo_url?'Remplacer le logo':'Choisir un logo'}</b><small>Laissez vide pour conserver le logo actuel.</small></span></label><div id="school-edit-r2-status" class="r2-upload-status"></div></div><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Annuler</button><button id="school-edit-save" class="admin-action-button admin-action-primary">Enregistrer</button></div></div></div>`);
        const name=d.querySelector('#school-edit-name'),file=d.querySelector('#school-edit-logo-file'),preview=d.querySelector('#school-edit-r2-preview'),status=d.querySelector('#school-edit-r2-status'),save=d.querySelector('#school-edit-save');
        let previewUrl='';
        file.onchange=()=>{const selected=file.files?.[0];if(previewUrl)URL.revokeObjectURL(previewUrl);if(selected){previewUrl=URL.createObjectURL(selected);preview.innerHTML=`<img src="${previewUrl}" alt="Nouveau logo">`;status.textContent='';status.className='r2-upload-status';}};
        save.onclick=async()=>{const next=name.value.trim(),selected=file.files?.[0];if(!next)return alert('Saisissez le nom de l’école.');save.disabled=true;save.textContent=selected?'Envoi vers R2…':'Enregistrement…';try{let logo_url=school.logo_url||null;if(selected){const uploaded=await uploadAdminImageToR2(selected,'school_logo');logo_url=uploaded.url;status.textContent='Nouveau logo envoyé dans Cloudflare R2.';status.className='r2-upload-status is-success';}const {error}=await supabaseClient.from('schools').update({name:next,logo_url}).eq('id',school.id);if(error)throw error;const {error:e2}=await supabaseClient.from('school_lists').update({school_name:next,school_logo_url:logo_url}).eq('school_name',oldName);if(e2)throw e2;school.name=next;school.logo_url=logo_url;closeAdminActionDialog();await loadSchoolAndLevelCatalogs();await loadSchoolLists();}catch(error){status.textContent=error.message;status.className='r2-upload-status is-error';save.disabled=false;save.textContent='Enregistrer';}};
        name.focus();
    }
    function renderMasterCatalogs(){
        const schools=document.getElementById('catalog-schools-list'),levels=document.getElementById('catalog-levels-list'),cats=document.getElementById('catalog-supply-categories-list');
        if(schools)schools.innerHTML=schoolCatalogCache.map(x=>`<div class="catalog-master-row school-master-row"><span class="catalog-school-mini">${x.logo_url?`<img src="${catalogEscape(normalizeDriveImageUrl(x.logo_url))}" alt="">`:'🏫'}</span><b>${catalogEscape(x.name)}</b><span class="catalog-row-actions"><button type="button" class="catalog-school-edit" data-school-edit="${x.id}" title="Modifier"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg></button><button data-master-delete="school" data-id="${x.id}" data-name="${catalogEscape(x.name)}">${masterMinusIcon()}</button></span></div>`).join('')||'<p>Aucune école</p>';
        if(levels)levels.innerHTML=levelCatalogCache.map(x=>`<div class="catalog-master-row"><span class="catalog-row-placeholder"></span><b>${catalogEscape(x.name)}</b><button data-master-delete="level" data-id="${x.id}" data-name="${catalogEscape(x.name)}">${masterMinusIcon()}</button></div>`).join('')||'<p>Aucun niveau</p>';
        if(cats)cats.innerHTML=supplyCategoryCache.map(x=>`<div class="catalog-master-row"><span class="catalog-row-placeholder"></span><b>${catalogEscape(x.name)}</b><button data-master-delete="category" data-id="${x.id}" data-name="${catalogEscape(x.name)}">${masterMinusIcon()}</button></div>`).join('')||'<p>Aucune catégorie</p>';
        document.querySelectorAll('[data-school-edit]').forEach(button=>button.onclick=()=>openEditSchoolDialog(button.dataset.schoolEdit));
        document.querySelectorAll('[data-master-delete]').forEach(button=>button.onclick=()=>openMasterDeleteDialog(button.dataset.masterDelete,button.dataset.id,button.dataset.name));
    }
    function openMasterDeleteDialog(kind,id,name){
        const labels={school:'école',level:'niveau',category:'catégorie',supply:'fourniture'};
        const dialog=openAdminActionDialog(`<div class="admin-action-card"><div class="admin-action-head"><div><h3>Supprimer ${labels[kind]} ?</h3><p>Les éléments liés seront également supprimés.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><div class="admin-action-alert"><strong>${catalogEscape(name)}</strong> et tous les éléments associés seront supprimés définitivement.</div><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Annuler</button><button id="master-delete-confirm" class="admin-action-button admin-action-danger">Supprimer</button></div></div></div>`);
        dialog.querySelector('#master-delete-confirm').onclick=async()=>{let error=null;if(kind==='school'){({error}=await supabaseClient.from('school_lists').delete().eq('school_name',name));if(!error)({error}=await supabaseClient.from('schools').delete().eq('id',id));}else if(kind==='level'){({error}=await supabaseClient.from('school_lists').delete().eq('level',name));if(!error)({error}=await supabaseClient.from('school_levels').delete().eq('id',id));}else if(kind==='category'){({error}=await supabaseClient.from('supply_items').delete().eq('category_id',id));if(!error)({error}=await supabaseClient.from('supply_categories').delete().eq('id',id));}else({error}=await supabaseClient.from('supply_items').delete().eq('id',id));if(error)return alert(error.message);closeAdminActionDialog();if(kind==='school'||kind==='level'){await loadSchoolAndLevelCatalogs();await loadSchoolLists();}else{await loadSupplyCategories();await loadSupplyAdmin();}};
    }
    function openCreateSupplyCategoryDialog(){const dialog=openAdminActionDialog(`<div class="admin-action-card catalog-create-dialog"><div class="admin-action-head"><div><h3>Ajouter une catégorie</h3><p>La catégorie sera disponible dans la Right Panel Fourniture.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><label class="catalog-dialog-field"><span>Nom de la catégorie</span><input id="catalog-supply-category-name" placeholder="Ex : Règles"></label><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Annuler</button><button id="catalog-supply-category-save" class="admin-action-button admin-action-primary">Ajouter</button></div></div></div>`);dialog.querySelector('#catalog-supply-category-save').onclick=async()=>{const name=dialog.querySelector('#catalog-supply-category-name').value.trim();if(!name)return;const {error}=await supabaseClient.from('supply_categories').insert([{name,is_active:true}]);if(error)return alert(error.message);closeAdminActionDialog();await loadSupplyCategories();};dialog.querySelector('input').focus();}
    function packFormSnapshot(kind=activePackDrawerKind){if(kind==='school')return JSON.stringify({school:document.getElementById('cfg-school')?.value||'',logo:document.getElementById('cfg-school-logo-url')?.value||'',level:document.getElementById('cfg-level')?.value||'',items:currentFormItems});if(kind==='supply')return JSON.stringify({id:document.getElementById('supply-item-id')?.value||'',name:document.getElementById('supply-item-name')?.value||'',categoryId:document.getElementById('supply-item-category-id')?.value||'',standard:document.getElementById('supply-item-standard')?.value||'',quality:document.getElementById('supply-item-quality')?.value||'',active:document.getElementById('supply-item-active')?.checked!==false});return ''}
    function isPackDrawerDirty(){return Boolean(activePackDrawerKind)&&packFormSnapshot()!==packDrawerBaseline}
    function updatePackDrawerPrice(){let amount=0;if(activePackDrawerKind==='school')amount=currentFormItems.reduce((sum,item)=>sum+(Number(item.price)||0),0);else if(activePackDrawerKind==='supply')amount=Number(document.getElementById('supply-item-standard')?.value)||0;if(packDrawerPrice)packDrawerPrice.textContent=`Prix : ${amount.toFixed(2)} DH`;const count=document.getElementById('school-items-tab-count');if(count)count.textContent=String(currentFormItems.length)}
    function setSchoolDrawerTab(tab){document.querySelectorAll('[data-school-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.schoolTab===tab));document.querySelectorAll('[data-school-panel]').forEach(panel=>panel.hidden=panel.dataset.schoolPanel!==tab)}
    function setSupplyTab(tab){document.querySelectorAll('[data-supply-tab]').forEach(b=>b.classList.toggle('is-active',b.dataset.supplyTab===tab));document.querySelectorAll('[data-supply-panel]').forEach(p=>p.hidden=p.dataset.supplyPanel!==tab);document.getElementById('pack-drawer-body').scrollTop=0;}
    function prepareSchoolDrawerForm(){if(!formAdd||formAdd.dataset.drawerReady)return;formAdd.dataset.drawerReady='true';const children=[...formAdd.children],info=document.createElement('section'),items=document.createElement('section');info.className='pack-drawer-form-section';info.dataset.schoolPanel='info';items.className='pack-drawer-form-section';items.dataset.schoolPanel='items';items.hidden=true;children.slice(0,3).forEach(node=>{node.className='pack-drawer-field';node.querySelector('p')?.remove();info.appendChild(node)});const builder=children[3],preview=children[4];if(builder){builder.className='pack-drawer-items-builder';items.appendChild(builder)}if(preview){preview.className='pack-drawer-items-list';items.appendChild(preview)}[btnSavePack,btnCancelEditPack].forEach(node=>node?.remove());formAdd.innerHTML='';formAdd.append(info,items);document.getElementById('school-form-host')?.appendChild(formAdd)}
    function prepareSupplyDrawerForm(){if(!supplyAdminForm||supplyAdminForm.dataset.drawerReady)return;supplyAdminForm.dataset.drawerReady='true';supplyAdminForm.className='pack-drawer-supply-form';const editor=document.getElementById('supply-spec-editor'),info=document.createElement('section'),spec=document.createElement('section');info.dataset.supplyPanel='info';info.className='supply-info-pane';spec.dataset.supplyPanel='spec';spec.className='supply-spec-pane';spec.hidden=true;[...supplyAdminForm.children].forEach(n=>{if(n===editor)spec.appendChild(n);else if(n.matches?.('div.flex.gap-2'))n.remove();else info.appendChild(n)});supplyAdminForm.innerHTML='';supplyAdminForm.append(info,spec);document.getElementById('supply-form-host')?.appendChild(supplyAdminForm)}
    function openPackDrawer(kind,{editing=false}={}){setPackDrawerValidationError('');prepareSchoolDrawerForm();prepareSupplyDrawerForm();if(kind==='supply'&&!supplyCategoryCache.length)loadSupplyCategories();if(kind==='school'&&(!schoolCatalogCache.length||!levelCatalogCache.length))loadSchoolAndLevelCatalogs(document.getElementById('cfg-school')?.value||'',document.getElementById('cfg-level')?.value||'');activePackDrawerKind=kind;document.getElementById('school-form-host').hidden=kind!=='school';document.getElementById('supply-form-host').hidden=kind!=='supply';schoolDrawerTabs?.classList.toggle('is-hidden',kind!=='school');supplyDrawerTabs?.classList.toggle('is-hidden',kind!=='supply');packDrawerTitle.textContent=kind==='school'?'Liste scolaire':'Fourniture';packDrawerKicker.textContent=editing?'MODIFICATION':'NOUVEL ÉLÉMENT';if(kind==='school')setSchoolDrawerTab('info');if(kind==='supply')setSupplyTab('info');document.getElementById('pack-drawer-delete').hidden=!(kind==='supply'&&editing);document.querySelector('.pack-drawer-footer')?.classList.toggle('no-delete',!(kind==='supply'&&editing));packEditorOverlay.classList.add('is-open');packEditorOverlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';updatePackDrawerPrice();requestAnimationFrame(()=>packDrawerBaseline=packFormSnapshot(kind))}
    function closePackDrawerNow(){setPackDrawerValidationError('');packEditorOverlay.classList.remove('is-open');packEditorOverlay.setAttribute('aria-hidden','true');document.body.style.overflow='';activePackDrawerKind=null;packDrawerBaseline=''}
    function discardAndClosePackDrawer(){const kind=activePackDrawerKind;closePackDrawerNow();if(kind==='school')resetPackForm();else if(kind==='supply')resetSupplyAdminForm()}
    function confirmPackDrawerClose(){if(!isPackDrawerDirty())return discardAndClosePackDrawer();const dialog=openAdminActionDialog(`<div class="admin-action-card pack-leave-warning"><div class="admin-action-head"><div><h3>Quitter sans enregistrer ?</h3><p>Les modifications en cours seront perdues.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><div class="admin-action-alert">Les changements effectués ne seront pas enregistrés. Voulez-vous vraiment fermer ce panneau ?</div><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Continuer</button><button id="confirm-pack-drawer-close" class="admin-action-button admin-action-danger">Quitter</button></div></div></div>`);dialog.querySelector('#confirm-pack-drawer-close')?.addEventListener('click',()=>{closeAdminActionDialog();discardAndClosePackDrawer()})}
    document.querySelectorAll('[data-school-tab]').forEach(button=>button.addEventListener('click',()=>setSchoolDrawerTab(button.dataset.schoolTab)));document.querySelectorAll('[data-supply-tab]').forEach(b=>b.addEventListener('click',()=>{if(!b.disabled)setSupplyTab(b.dataset.supplyTab)}));document.getElementById('pack-drawer-close')?.addEventListener('click',confirmPackDrawerClose);document.getElementById('pack-drawer-quit')?.addEventListener('click',confirmPackDrawerClose);packEditorOverlay?.addEventListener('click',event=>{if(event.target===packEditorOverlay)confirmPackDrawerClose()});document.getElementById('pack-drawer-validate')?.addEventListener('click',()=>{if(activePackDrawerKind==='school'){if(validateSchoolListDrawer())formAdd?.requestSubmit();}else supplyAdminForm?.requestSubmit()});
    const addTrigger=document.getElementById('pack-add-trigger');addTrigger?.addEventListener('click',()=>{resetPackForm();openPackDrawer('school')});document.querySelectorAll('[data-create-kind]').forEach(button=>button.addEventListener('click',()=>{const kind=button.dataset.createKind;if(kind==='school-master')return openCreateSchoolDialog();if(kind==='level-master')return openCreateLevelDialog();if(kind==='school'){resetPackForm();openPackDrawer('school')}else{resetSupplyAdminForm();openPackDrawer('supply')}}));document.getElementById('catalog-add-school')?.addEventListener('click',openCreateSchoolDialog);document.getElementById('catalog-add-level')?.addEventListener('click',openCreateLevelDialog);document.getElementById('catalog-add-supply-category')?.addEventListener('click',openCreateSupplyCategoryDialog);document.getElementById('btn-add-supply-direct')?.addEventListener('click',()=>{resetSupplyAdminForm();openPackDrawer('supply')});

    // ==========================================
    // MENU VERTICAL GAUCHE, EXTENSIBLE ET COMPACT
    // ==========================================
    const sidebar = document.getElementById('admin-sidebar');
    const sidebarToggle = document.getElementById('btn-sidebar-toggle');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');

    function setSidebarCollapsed(collapsed) {
        if (!sidebar) return;
        sidebar.classList.toggle('is-collapsed', collapsed);
        document.body.classList.toggle('admin-sidebar-collapsed', collapsed);
        sidebarToggle?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        if (sidebarToggleIcon) sidebarToggleIcon.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        const label = sidebarToggle?.querySelector('.sidebar-label');
        if (label) label.textContent = collapsed ? 'Développer' : 'Réduire';
        localStorage.setItem('elqods-admin-sidebar-collapsed', collapsed ? 'true' : 'false');
    }

    sidebarToggle?.addEventListener('click', () => setSidebarCollapsed(!sidebar?.classList.contains('is-collapsed')));
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

        document.querySelectorAll('.admin-sidebar-link').forEach(button => {
            const active = button.dataset.pane === target;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-current', active ? 'page' : 'false');
        });
        if (target === 'orders') loadOrders();
        if (target === 'metrics') loadOrders();
        if (target === 'config') loadSchoolLists();
        if (target === 'settings') loadSiteSettings();
    }

    btnOrders?.addEventListener('click', () => switchAdminPane('orders'));
    btnConfig?.addEventListener('click', () => switchAdminPane('config'));
    btnTabsConfig?.addEventListener('click', () => switchAdminPane('settings'));
    document.querySelectorAll('.admin-sidebar-link').forEach(button => {
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
        const value = String(status || 'new').trim().toLocaleLowerCase('fr-FR');
        return STATUS_ALIASES[value] || value || 'new';
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

    const ORDER_STATUS_FILTER_VALUES = ['new','preparing','ready','collected','cancelled','expired'];
    const ORDER_PAYMENT_FILTER_VALUES = ['paid','unpaid'];
    const selectedOrderStatuses = new Set(ORDER_STATUS_FILTER_VALUES);
    const selectedOrderPayments = new Set(ORDER_PAYMENT_FILTER_VALUES);
    function normalizePaymentStatus(value) { return ['paid','paye','payé','true','1'].includes(String(value || 'unpaid').trim().toLocaleLowerCase('fr-FR')) ? 'paid' : 'unpaid'; }
    function syncOrderMultiFilter() {
        const root=document.getElementById('orders-multifilter'), label=document.getElementById('orders-multifilter-label'); if(!root||!label)return;
        root.querySelectorAll('input[type="checkbox"]').forEach(input=>{const [group,value]=String(input.value||'').split(':');input.checked=group==='status'?selectedOrderStatuses.has(value):selectedOrderPayments.has(value)});
        const sc=selectedOrderStatuses.size, pc=selectedOrderPayments.size, all=sc===ORDER_STATUS_FILTER_VALUES.length&&pc===ORDER_PAYMENT_FILTER_VALUES.length;
        label.textContent=all?'Tous les statuts':sc===0&&pc===0?'Aucun filtre sélectionné':`${sc} statut${sc>1?'s':''} · ${pc} paiement${pc>1?'s':''}`; label.classList.toggle('text-[#E75C25]',!all);
    }
    function applyOrderMultiFilter(){currentOrdersPage=1;syncOrderMultiFilter();renderOrdersTable()}
    function closeOrderMultiFilter(){const root=document.getElementById('orders-multifilter'),menu=document.getElementById('orders-multifilter-menu'),toggle=document.getElementById('orders-multifilter-toggle');menu?.classList.add('hidden');root?.classList.remove('is-open');toggle?.setAttribute('aria-expanded','false')}
    function getFilteredOrders(){
        const search=(document.getElementById('orders-search')?.value||'').trim().toLowerCase(), date=document.getElementById('orders-date-filter')?.value||'';
        return currentOrders.filter(order=>{const status=normalizeStatus(order.status),payment=normalizePaymentStatus(order.payment_status),created=getCreatedDate(order),ref=order.numero_commande||order.id,haystack=`#${ref} #${order.id} ${order.client_name||''} ${order.client_phone||''} ${order.client_email||''}`.toLowerCase();return (!search||haystack.includes(search))&&selectedOrderStatuses.has(status)&&selectedOrderPayments.has(payment)&&(!date||created.toISOString().slice(0,10)===date)});
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

    function getOrderPageItems(totalPages){
        if(totalPages<=7)return Array.from({length:totalPages},(_,i)=>i+1);
        const items=[1];
        const from=Math.max(2,currentOrdersPage-1);
        const to=Math.min(totalPages-1,currentOrdersPage+1);
        if(from>2)items.push('ellipsis-left');
        for(let page=from;page<=to;page++)items.push(page);
        if(to<totalPages-1)items.push('ellipsis-right');
        items.push(totalPages);
        return items;
    }

    function goToOrdersPage(page){
        const filteredCount=getFilteredOrders().length;
        const totalPages=Math.max(1,Math.ceil(filteredCount/ordersPerPage));
        currentOrdersPage=Math.min(totalPages,Math.max(1,Number(page)||1));
        renderOrdersTable();
        document.getElementById('table-orders-body')?.closest('.orders-table-card,table')?.scrollIntoView({behavior:'smooth',block:'start'});
    }

    function renderOrdersPagination(totalOrders, totalPages) {
        const container = document.getElementById('orders-pagination');
        if (!container) return;
        if (!totalOrders) {
            container.innerHTML = `<div class="orders-pagination-left"><label class="orders-page-size">Afficher <select id="orders-page-size"><option value="10">10</option><option value="20">20</option><option value="30">30</option><option value="50">50</option></select> commandes</label><span>Aucune commande à paginer</span></div>`;
            document.getElementById('orders-page-size').value=String(ordersPerPage);
            document.getElementById('orders-page-size').onchange=e=>{ordersPerPage=Number(e.target.value)||10;currentOrdersPage=1;renderOrdersTable()};
            return;
        }
        const start = (currentOrdersPage - 1) * ordersPerPage + 1;
        const end = Math.min(currentOrdersPage * ordersPerPage, totalOrders);
        const pageButtons=getOrderPageItems(totalPages).map(item=>{
            if(typeof item!=='number')return '<span class="orders-page-ellipsis" aria-hidden="true">…</span>';
            const active=item===currentOrdersPage;
            return `<button type="button" class="orders-page-number${active?' is-active':''}" data-orders-page="${item}" ${active?'aria-current="page"':''}>${item}</button>`;
        }).join('');
        container.innerHTML = `
            <div class="orders-pagination-left">
                <label class="orders-page-size">Afficher <select id="orders-page-size" aria-label="Nombre de commandes par page"><option value="10">10</option><option value="20">20</option><option value="30">30</option><option value="50">50</option></select> commandes</label>
                <span>Affichage ${start}-${end} sur ${totalOrders} commandes</span>
            </div>
            <div class="orders-pagination-nav">
                <button id="btn-orders-prev" class="orders-page-direction" ${currentOrdersPage <= 1 ? 'disabled' : ''}>Précédent</button>
                <div class="orders-page-numbers" aria-label="Pages des commandes">${pageButtons}</div>
                <button id="btn-orders-next" class="orders-page-direction" ${currentOrdersPage >= totalPages ? 'disabled' : ''}>Suivant</button>
            </div>`;
        const size=document.getElementById('orders-page-size');
        if(size){size.value=String(ordersPerPage);size.onchange=e=>{ordersPerPage=Number(e.target.value)||10;currentOrdersPage=1;renderOrdersTable()}}
        container.querySelectorAll('[data-orders-page]').forEach(button=>button.onclick=()=>goToOrdersPage(button.dataset.ordersPage));
        document.getElementById('btn-orders-prev')?.addEventListener('click',()=>goToOrdersPage(currentOrdersPage-1));
        document.getElementById('btn-orders-next')?.addEventListener('click',()=>goToOrdersPage(currentOrdersPage+1));
    }

    function getImportedListUrl(order, items) {
        const photoItem=(items||[]).find(item=>item.type==='photo_upload'||item.url||item.photo_url);
        return order.google_drive_url||photoItem?.url||photoItem?.photo_url||'';
    }
    function getImportedListPreviewCandidates(order, originalUrl) {
        const explicitId=String(order.google_drive_file_id||'').trim();
        const url=String(originalUrl||'').trim();
        const match=url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)([a-zA-Z0-9_-]+)/);
        const id=explicitId||(match?match[1]:'');
        if(!id)return url?[url]:[];
        return [
            `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
            `https://lh3.googleusercontent.com/d/${id}=w1600`,
            `https://drive.google.com/uc?export=view&id=${id}`
        ];
    }
    function closeImportedListPreview(){document.getElementById('list-image-modal')?.classList.remove('open');}
    function openImportedListPreview(orderId){
        const order=currentOrders.find(entry=>String(entry.id)===String(orderId));
        if(!order)return;
        const items=parseItems(order.items);
        const originalUrl=getImportedListUrl(order,items);
        if(!originalUrl){alert("L’image importée n’est pas disponible.");return;}
        const candidates=getImportedListPreviewCandidates(order,originalUrl);
        let modal=document.getElementById('list-image-modal');
        if(!modal){modal=document.createElement('div');modal.id='list-image-modal';modal.className='list-image-modal';modal.onclick=event=>{if(event.target===modal)closeImportedListPreview()};document.body.appendChild(modal)}
        modal.innerHTML=`<div class="list-image-card"><div class="list-image-head"><h2>Image de la liste</h2><button type="button" class="list-image-close" aria-label="Fermer">×</button></div><div class="list-image-body"><div class="list-image-stage"><div class="list-image-loading">Chargement de l’image…</div><img id="list-image-preview" alt="Liste scolaire importée" hidden><div class="list-image-error">L’aperçu ne peut pas être chargé. Utilisez le lien ci-dessous pour ouvrir le fichier dans un nouvel onglet.</div></div></div><div class="list-image-foot"><a class="list-image-open" href="${escapeHtml(originalUrl)}" target="_blank" rel="noopener">Ouvrir l’image dans un nouvel onglet</a></div></div>`;
        modal.querySelector('.list-image-close').onclick=closeImportedListPreview;
        const image=modal.querySelector('#list-image-preview'),loading=modal.querySelector('.list-image-loading'),errorBox=modal.querySelector('.list-image-error');
        let index=0;
        const tryNext=()=>{
            if(index>=candidates.length){loading.style.display='none';errorBox.style.display='block';return;}
            image.src=`${candidates[index]}${candidates[index].includes('?')?'&':'?'}preview=${Date.now()}`;
            index+=1;
        };
        image.onload=()=>{loading.style.display='none';errorBox.style.display='none';image.hidden=false};
        image.onerror=()=>{image.hidden=true;setTimeout(tryNext,650)};
        tryNext();
        modal.classList.add('open');
    }
    window.closeImportedListPreview=closeImportedListPreview;
    window.openImportedListPreview=openImportedListPreview;

    function renderOrdersTable(){const tb=document.getElementById('table-orders-body'),f=getFilteredOrders(),pages=Math.max(1,Math.ceil(f.length/ordersPerPage));if(currentOrdersPage>pages)currentOrdersPage=pages;const os=f.slice((currentOrdersPage-1)*ordersPerPage,currentOrdersPage*ordersPerPage);if(!tb)return;const table=tb.closest('table');table?.classList.add('admin-orders-v2');const tableCard=table?.parentElement;tableCard?.classList.add('orders-table-card','admin-orders-v2-wrap');const hr=table?.querySelector('thead tr');if(hr)hr.innerHTML='<th>Commande</th><th>Client</th><th>Téléphone</th><th>Contenu</th><th>Statut</th><th>Paiement</th><th>Échéance</th><th class="text-right">Actions</th>';renderOrdersPagination(f.length,pages);if(!os.length){tb.innerHTML='<tr><td colspan="8" class="p-6 text-center text-gray-400">Aucune commande.</td></tr>';return}tb.innerHTML=os.map(o=>{const st=normalizeStatus(o.status),it=parseItems(o.items),d=getDeadline(o),photo=it.find(a=>a.type==='photo_upload'||a.url||a.photo_url)||o.google_drive_url,content=photo?`<button type="button" class="imported-list-link" data-id="${o.id}" title="Afficher l’image importée"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>Liste importée</button>`:`${it.length} articles`;return `<tr class="order-v2${bulkSelectionMode?' is-bulk-mode':''}${selectedOrderIds.has(String(o.id))?' is-selected':''}" data-id="${o.id}" tabindex="0"><td>${bulkSelectionMode?`<label class="order-select-box" title="Sélectionner cette commande"><input type="checkbox" class="order-bulk-check" data-id="${o.id}" ${selectedOrderIds.has(String(o.id))?'checked':''}><i></i></label>`:''}<b class="text-[#E75C25]">#${escapeHtml(o.numero_commande||o.id)}</b></td><td><b>${escapeHtml(o.client_name||'-')}</b><span class="sub">${escapeHtml(o.client_email||'-')}</span></td><td>${escapeHtml(o.client_phone||'-')}</td><td><b>${content}</b><span class="sub">${money(orderTotal(o))}</span></td><td>${chip(o.id,'status',st)}</td><td>${chip(o.id,'payment',o.payment_status||'unpaid')}</td><td class="text-xs text-stone-500">${d.toLocaleDateString('fr-FR')} (${daysUntil(d)}j)</td><td><div class="acts"><button class="act wa notify" data-id="${o.id}" title="Envoyer un message WhatsApp" aria-label="Envoyer un message WhatsApp"><svg class="wa-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2a9.84 9.84 0 0 0-8.43 14.9L2 22l5.23-1.55A9.98 9.98 0 1 0 12.04 2Zm0 17.98a8.08 8.08 0 0 1-4.12-1.13l-.3-.18-3.1.92.93-3.02-.2-.31A7.86 7.86 0 0 1 4 12.02a8.03 8.03 0 1 1 8.04 7.96Zm4.43-6.03c-.24-.12-1.44-.7-1.66-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.2-.72-.63-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.29-.74-1.77-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.57 4.1 3.6.57.24 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"/></svg></button><button class="act pr print" data-id="${o.id}" title="Imprimer"><svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/></svg></button><button class="act del delete" data-id="${o.id}" title="Supprimer"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></svg></button></div></td></tr>`}).join('');tb.querySelectorAll('.order-v2').forEach(r=>r.onclick=e=>{if(e.target.closest('.order-select-box'))return;if(bulkSelectionMode){const id=String(r.dataset.id);selectedOrderIds.has(id)?selectedOrderIds.delete(id):selectedOrderIds.add(id);syncBulkToolbar();renderOrdersTable();return}if(!e.target.closest('button'))openOrder(r.dataset.id)});tb.querySelectorAll('.order-bulk-check').forEach(input=>input.onchange=e=>{e.stopPropagation();const id=String(input.dataset.id);input.checked?selectedOrderIds.add(id):selectedOrderIds.delete(id);syncBulkToolbar();renderOrdersTable()});tb.querySelectorAll('.imported-list-link').forEach(button=>button.onclick=event=>{event.stopPropagation();openImportedListPreview(button.dataset.id)});bindChips(tb);tb.querySelectorAll('.notify').forEach(x=>x.onclick=e=>{e.stopPropagation();openWhatsappDialog(x.dataset.id)});tb.querySelectorAll('.print').forEach(x=>x.onclick=e=>{e.stopPropagation();printOrder(x.dataset.id)});tb.querySelectorAll('.delete').forEach(x=>x.onclick=e=>{e.stopPropagation();openDeleteOrderDialog(x.dataset.id)})}

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
        const modalWasOpen=document.getElementById('ord-modal')?.classList.contains('open') && String(document.getElementById('ord-modal')?.dataset.orderId)===String(orderId);
        await loadOrders();
        if(modalWasOpen) openOrder(orderId);
    }

    async function updatePaymentStatus(orderId, paymentStatus) {
        const { error } = await supabaseClient.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
        if (error) {
            console.error(error);
            alert("Impossible de mettre à jour le paiement.");
            return;
        }
        const modalWasOpen=document.getElementById('ord-modal')?.classList.contains('open') && String(document.getElementById('ord-modal')?.dataset.orderId)===String(orderId);
        await loadOrders();
        if(modalWasOpen) openOrder(orderId);
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


    // ==========================================
    // GESTION D'ARCHIVAGE GOOGLE SHEETS
    // ==========================================
    function archiveEscape(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
    function archiveFormatDate(value){if(!value)return 'Jamais';const date=new Date(value);return Number.isNaN(date.getTime())?String(value):date.toLocaleString('fr-FR');}
    async function archiveRequest(action,payload={}){
        if(!ARCHIVE_WEBAPP_URL||!ARCHIVE_WEBAPP_URL.endsWith('/exec'))throw new Error("L'URL Apps Script d'archivage n'est pas configurée.");
        const {data:{session}}=await supabaseClient.auth.getSession();
        if(!session?.access_token)throw new Error('La session administrateur a expiré. Reconnectez-vous.');
        const channel=`elqods-archive-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return await new Promise((resolve,reject)=>{
            const iframe=document.createElement('iframe');
            iframe.name=channel;iframe.hidden=true;iframe.setAttribute('aria-hidden','true');
            const form=document.createElement('form');
            form.method='POST';form.action=ARCHIVE_WEBAPP_URL;form.target=channel;form.hidden=true;
            const values={action,channel,adminToken:session.access_token,payload:JSON.stringify(payload||{})};
            Object.entries(values).forEach(([name,value])=>{const input=document.createElement('input');input.type='hidden';input.name=name;input.value=String(value??'');form.appendChild(input)});
            let timer=null,pollTimer=null,done=false,pollIndex=0;
            const callbackName=`elqodsArchivePoll_${Date.now()}_${Math.random().toString(36).slice(2)}`.replace(/[^A-Za-z0-9_$]/g,'_');
            const cleanup=()=>{
                clearTimeout(timer);clearTimeout(pollTimer);window.removeEventListener('message',onMessage);
                try{delete window[callbackName]}catch(_){window[callbackName]=undefined}
                document.querySelectorAll(`script[data-archive-poll="${channel}"]`).forEach(script=>script.remove());
                setTimeout(()=>{form.remove();iframe.remove()},200);
            };
            const finish=(error,result)=>{if(done)return;done=true;cleanup();error?reject(error):resolve(result)};
            const receive=message=>{
                if(!message||message.type!=='elqods-archive-result'||message.channel!==channel)return false;
                message.success?finish(null,message):finish(new Error(message.error||"L'opération d'archivage a échoué."));
                return true;
            };
            const onMessage=event=>receive(event.data);
            const poll=()=>{
                if(done)return;
                pollIndex+=1;
                const script=document.createElement('script');
                script.dataset.archivePoll=channel;
                script.async=true;
                script.src=`${ARCHIVE_WEBAPP_URL}?action=archivePoll&channel=${encodeURIComponent(channel)}&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
                script.onerror=()=>{script.remove();pollTimer=setTimeout(poll,1000)};
                script.onload=()=>{script.remove();if(!done)pollTimer=setTimeout(poll,700)};
                document.head.appendChild(script);
            };
            window[callbackName]=message=>{
                if(message?.pending)return;
                receive(message);
            };
            window.addEventListener('message',onMessage);
            timer=setTimeout(()=>finish(new Error("Le service d'archivage n'a pas retourné de résultat après 2 minutes. Vérifiez Apps Script > Exécutions.")),120000);
            document.body.append(iframe,form);
            form.submit();
            pollTimer=setTimeout(poll,500);
        });
    }
    function archiveStatus(text,type='info'){
        const box=document.getElementById('archive-manager-status');if(!box)return;
        box.textContent=text||'';box.className=`archive-manager-status ${text?'is-visible ':''}is-${type}`;
    }
    function archiveToggleCustomFields(){
        const type=document.getElementById('archive-schedule-type')?.value||'monthly';
        const custom=document.getElementById('archive-custom-period');
        const visible=type==='custom';
        custom?.classList.toggle('hidden',!visible);
        custom?.setAttribute('aria-hidden',visible?'false':'true');
        const archiveEnabled=document.getElementById('archive-enabled')?.checked===true;
        custom?.querySelectorAll('input,select').forEach(field=>field.disabled=!visible||!archiveEnabled);
    }
    function archiveRenderConfig(config={}){
        document.getElementById('archive-enabled').checked=config.enabled===true;
        document.getElementById('archive-schedule-type').value=config.scheduleType||'monthly';
        document.getElementById('archive-schedule-value').value=Number(config.scheduleValue)||1;
        document.getElementById('archive-schedule-unit').value=config.scheduleUnit||'days';
        document.getElementById('archive-run-hour').value=`${String(Number.isFinite(Number(config.runHour))?Number(config.runHour):2).padStart(2,'0')}:${String(Number.isFinite(Number(config.runMinute))?Number(config.runMinute):0).padStart(2,'0')}`;
        document.getElementById('archive-age-value').value=Number(config.ageValue)||1;
        document.getElementById('archive-age-unit').value=config.ageUnit||'months';
        document.getElementById('archive-folder-url').value=config.folderUrl||'';
        const last=config.lastRun||{};
        const triggerState=config.enabled?(config.triggerInstalled?'Déclencheur automatique actif':'Déclencheur automatique absent'):'Archivage automatique désactivé';
        document.getElementById('archive-manager-last').innerHTML=`<b>Automatisation :</b> ${archiveEscape(triggerState)}<br><b>Dernier archivage :</b> ${archiveEscape(archiveFormatDate(last.finishedAt))}<br><b>Résultat :</b> ${archiveEscape(last.message||'Aucun archivage exécuté.')} ${last.spreadsheetUrls?.length?`<br>${last.spreadsheetUrls.map(url=>`<a href="${archiveEscape(url)}" target="_blank" rel="noopener" class="text-[#E75C25] underline">Ouvrir le Google Sheets</a>`).join(' · ')}`:''}`;
        archiveToggleCustomFields();
        archiveConfigChips(config);
    }
    function archiveReadForm(){
        const time=document.getElementById('archive-run-hour').value||'02:00';
        const [hourText,minuteText]=time.split(':');const runHour=Math.min(23,Math.max(0,Number(hourText)||0)),runMinute=Math.min(59,Math.max(0,Number(minuteText)||0));return {enabled:document.getElementById('archive-enabled').checked,deleteAfterArchive:false,scheduleType:document.getElementById('archive-schedule-type').value,scheduleValue:Math.max(1,Number(document.getElementById('archive-schedule-value').value)||1),scheduleUnit:document.getElementById('archive-schedule-unit').value,runHour,runMinute,runTime:`${String(runHour).padStart(2,'0')}:${String(runMinute).padStart(2,'0')}`,ageValue:Math.max(1,Number(document.getElementById('archive-age-value').value)||1),ageUnit:document.getElementById('archive-age-unit').value,folderUrl:document.getElementById('archive-folder-url').value.trim()};
    }
    const CLEANUP_STATUSES=[['new','Nouveau'],['preparing','Préparation'],['ready','Prêt'],['collected','Récupéré'],['cancelled','Annulé'],['expired','Expiré']];
    function archiveConfigChips(config={}){const host=document.getElementById('archive-auto-chips');if(!host)return;const enabled=config.enabled===true;if(!enabled){host.innerHTML='';host.classList.add('hidden');return;}const labels={daily:'Chaque jour',weekly:'Chaque semaine',monthly:'Chaque mois',custom:'Tous les X temps'},units={hours:'heure(s)',days:'jour(s)',weeks:'semaine(s)',months:'mois'};const schedule=config.scheduleType==='custom'?`Tous les ${Number(config.scheduleValue)||1} ${units[config.scheduleUnit]||config.scheduleUnit}`:(labels[config.scheduleType]||'Chaque mois');const hour=`${String(Number.isFinite(Number(config.runHour))?Number(config.runHour):2).padStart(2,'0')}:${String(Number.isFinite(Number(config.runMinute))?Number(config.runMinute):0).padStart(2,'0')}`;const age=`Plus de ${Number(config.ageValue)||1} ${units[config.ageUnit]||config.ageUnit}`;host.innerHTML=[schedule,hour,age].map(value=>`<span>${archiveEscape(value)}</span>`).join('');host.classList.remove('hidden');}
    function forgetArchiveAutomaticSettings(){const defaults={enabled:false,scheduleType:'monthly',scheduleValue:1,scheduleUnit:'days',runHour:2,runMinute:0,runTime:'02:00',ageValue:1,ageUnit:'months',folderUrl:''};archiveRenderConfig(defaults);toggleAuto('archive-auto-fields',false);archiveConfigChips(defaults);}
    function dataTab(tab){document.querySelectorAll('[data-data-tab]').forEach(x=>x.classList.toggle('is-active',x.dataset.dataTab===tab));document.querySelectorAll('[data-data-panel]').forEach(x=>x.classList.toggle('is-active',x.dataset.dataPanel===tab));}
    function toggleAuto(group,enabled){const box=document.getElementById(group);box?.classList.toggle('is-disabled',!enabled);box?.querySelectorAll('input,select').forEach(x=>x.disabled=!enabled);if(group==='archive-auto-fields')archiveToggleCustomFields();}
    function readCleanup(){return{statuses:[...document.querySelectorAll('[name="cleanup-status"]:checked')].map(x=>x.value),paymentStatus:document.getElementById('cleanup-payment-status').value,archiveType:document.getElementById('cleanup-archive-type').value,ageValue:Math.max(1,+document.getElementById('cleanup-age-value').value||1),ageUnit:document.getElementById('cleanup-age-unit').value,dateBasis:document.getElementById('cleanup-date-basis').value,automatic:document.getElementById('cleanup-automatic').checked,frequency:document.getElementById('cleanup-frequency').value,runDate:document.getElementById('cleanup-run-date').value||null,runTime:document.getElementById('cleanup-run-time').value||'03:00'};}
    function fillCleanup(c={}){const st=Array.isArray(c.statuses)?c.statuses:['collected','cancelled'];document.querySelectorAll('[name="cleanup-status"]').forEach(x=>x.checked=st.includes(x.value));for(const [id,val] of [['cleanup-payment-status',c.paymentStatus||'all'],['cleanup-archive-type',c.archiveType||'archived'],['cleanup-age-value',c.ageValue||1],['cleanup-age-unit',c.ageUnit||'months'],['cleanup-date-basis',c.dateBasis||'status_changed_at'],['cleanup-frequency',c.frequency||'monthly'],['cleanup-run-date',c.runDate||''],['cleanup-run-time',c.runTime||'03:00']])document.getElementById(id).value=val;document.getElementById('cleanup-automatic').checked=c.automatic===true;toggleAuto('cleanup-auto-fields',c.automatic===true);}
    async function cleanupRpc(name,args={}){const{data,error}=await supabaseClient.rpc(name,args);if(error)throw error;return data;}
    async function openArchiveManager(){let o=document.getElementById('archive-manager-overlay');if(!o){o=document.createElement('div');o.id='archive-manager-overlay';o.className='archive-manager-overlay';o.innerHTML=`<section class="archive-manager-dialog data-manager" role="dialog" aria-modal="true"><header class="archive-manager-head"><div><h3>Gestion des données</h3><p>Archivez et nettoyez les commandes depuis une interface centralisée.</p></div><button id="archive-manager-close" class="archive-manager-close">×</button></header><div class="data-layout"><nav class="data-nav"><button class="is-active" data-data-tab="archive">▣ <span>Archivage</span></button><button data-data-tab="cleanup">⌫ <span>Vidage</span></button></nav><main class="data-content">
<section class="data-panel is-active" data-data-panel="archive"><div class="data-title"><h4>Options d’archivage</h4><p>Export Google Sheets et automatisation.</p></div><div class="archive-manager-grid"><label class="data-toggle"><input id="archive-enabled" type="checkbox"><i></i><span><b>Archivage automatique</b><small>Lancer les exports selon une fréquence définie.</small></span><span id="archive-auto-chips" class="archive-auto-chips hidden"></span></label><div id="archive-auto-fields" class="auto-fields"><label class="archive-field"><span>Périodicité</span><select id="archive-schedule-type"><option value="daily">Chaque jour</option><option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option><option value="custom">Tous les X temps</option></select></label><label class="archive-field"><span>Heure</span><input id="archive-run-hour" type="time" value="02:00"></label><label id="archive-custom-period" class="archive-field is-wide hidden"><span>Intervalle personnalisé</span><span class="paired-fields custom-time-fields"><label class="paired-control"><small>Valeur</small><input id="archive-schedule-value" type="number" min="1" value="1"></label><label class="paired-control"><small>Unité</small><select id="archive-schedule-unit"><option value="hours">Heure(s)</option><option value="days">Jour(s)</option><option value="weeks">Semaine(s)</option><option value="months">Mois</option></select></label></span></label><label class="archive-field is-wide"><span>Archiver les commandes créées depuis plus de</span><span class="paired-fields"><label class="paired-control"><small>Durée</small><input id="archive-age-value" type="number" min="1" value="1"></label><label class="paired-control"><small>Unité</small><select id="archive-age-unit"><option value="hours">Heure(s)</option><option value="days">Jour(s)</option><option value="weeks">Semaine(s)</option><option value="months">Mois</option></select></label></span></label><label class="archive-field is-wide"><span>Dossier Google Drive</span><input id="archive-folder-url" type="url" placeholder="https://drive.google.com/drive/folders/..."></label></div></div><div id="archive-manager-last" class="archive-manager-last">Chargement…</div><div class="archive-manager-actions"><button id="archive-save" class="archive-save">Enregistrer</button><button id="archive-run" class="archive-run">Archiver maintenant</button></div></section>
<section class="data-panel" data-data-panel="cleanup"><div class="data-title"><h4>Vidage des commandes</h4><p>Prévisualisez toujours avant une suppression définitive.</p></div><div class="archive-manager-grid"><div class="archive-field is-wide"><span>Statuts concernés</span><div class="status-grid">${CLEANUP_STATUSES.map(([v,l])=>`<label class="status-check"><input name="cleanup-status" type="checkbox" value="${v}"><i></i><span>${l}</span></label>`).join('')}</div></div><label class="archive-field"><span>Paiement</span><select id="cleanup-payment-status"><option value="all">Tous</option><option value="paid">Payées uniquement</option><option value="unpaid">Non payées uniquement</option></select></label><label class="archive-field"><span>Type</span><select id="cleanup-archive-type"><option value="archived">Archivées uniquement</option><option value="not_archived">Non archivées uniquement</option><option value="all">Toutes</option></select></label><label class="archive-field is-wide"><span>Supprimer après</span><span class="paired-fields"><label class="paired-control"><small>Durée</small><input id="cleanup-age-value" type="number" min="1" value="1"></label><label class="paired-control"><small>Unité</small><select id="cleanup-age-unit"><option value="hours">Heure(s)</option><option value="days">Jour(s)</option><option value="weeks">Semaine(s)</option><option value="months">Mois</option></select></label></span></label><label class="archive-field is-wide"><span>Date de référence</span><select id="cleanup-date-basis"><option value="status_changed_at">Dernier changement de statut</option><option value="created_at">Création</option><option value="archived_at">Archivage</option></select></label><label class="data-toggle"><input id="cleanup-automatic" type="checkbox"><i></i><span><b>Vidage automatique</b><small>Exécuter le nettoyage selon une planification.</small></span></label><div id="cleanup-auto-fields" class="auto-fields"><label class="archive-field"><span>Fréquence</span><select id="cleanup-frequency"><option value="hourly">Chaque heure</option><option value="daily">Chaque jour</option><option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option></select></label><label class="archive-field"><span>Heure</span><input id="cleanup-run-time" type="time" value="03:00"></label><label class="archive-field is-wide"><span>Première date</span><input id="cleanup-run-date" type="date"></label></div></div><div id="cleanup-result" class="cleanup-result hidden"></div><div class="archive-manager-actions"><button id="cleanup-save" class="archive-save">Enregistrer</button><button id="cleanup-preview" class="cleanup-preview">Prévisualiser</button><button id="cleanup-delete" class="cleanup-delete">Supprimer maintenant</button></div></section><div id="archive-manager-status" class="archive-manager-status"></div></main></div></section>`;document.body.appendChild(o);
o.onclick=e=>{if(e.target===o)o.classList.remove('is-open')};o.querySelector('#archive-manager-close').onclick=()=>o.classList.remove('is-open');o.querySelectorAll('[data-data-tab]').forEach(x=>x.onclick=()=>dataTab(x.dataset.dataTab));o.querySelector('#archive-enabled').onchange=e=>{if(e.target.checked){toggleAuto('archive-auto-fields',true);archiveConfigChips(archiveReadForm())}else{forgetArchiveAutomaticSettings()}};o.querySelector('#cleanup-automatic').onchange=e=>toggleAuto('cleanup-auto-fields',e.target.checked);o.querySelector('#archive-schedule-type').onchange=()=>{archiveToggleCustomFields();archiveConfigChips(archiveReadForm())};o.querySelector('#archive-auto-fields').addEventListener('input',()=>archiveConfigChips(archiveReadForm()));o.querySelector('#archive-auto-fields').addEventListener('change',()=>archiveConfigChips(archiveReadForm()));
o.querySelector('#archive-save').onclick=async()=>{try{archiveStatus('Enregistrement et vérification du déclencheur…');const form=archiveReadForm();const payload=form.enabled?form:{enabled:false,deleteAfterArchive:false,scheduleType:'monthly',scheduleValue:1,scheduleUnit:'days',runHour:2,runMinute:0,runTime:'02:00',ageValue:1,ageUnit:'months',folderUrl:''};await archiveRequest('archiveSaveConfig',payload);const verified=await archiveRequest('archiveGetConfig');archiveRenderConfig(verified.config);toggleAuto('archive-auto-fields',verified.config.enabled===true);if(verified.config.enabled&&!verified.config.triggerInstalled)throw new Error('La configuration est enregistrée, mais le déclencheur automatique n’a pas été installé par le service Google Apps Script. Vérifiez les autorisations du compte propriétaire puis réenregistrez.');archiveStatus(verified.config.enabled?'Archivage automatique activé et déclencheur vérifié.':'Archivage automatique désactivé. Les anciens paramètres ont été oubliés.','success')}catch(e){archiveStatus(e.message,'error')}};o.querySelector('#archive-run').onclick=async()=>{try{archiveStatus('Archivage en cours…');const r=await archiveRequest('archiveRunNow',archiveReadForm());archiveRenderConfig(r.config);archiveStatus(r.run?.message||'Archivage terminé.','success');await loadOrders()}catch(e){archiveStatus(e.message,'error')}};
o.querySelector('#cleanup-save').onclick=async()=>{try{const c=readCleanup();if(!c.statuses.length)throw Error('Sélectionnez au moins un statut.');await cleanupRpc('admin_save_cleanup_config',{p_config:c});archiveStatus('Planification enregistrée.','success')}catch(e){archiveStatus(e.message,'error')}};o.querySelector('#cleanup-preview').onclick=async()=>{try{const c=readCleanup();if(!c.statuses.length)throw Error('Sélectionnez au moins un statut.');const r=await cleanupRpc('admin_preview_order_cleanup',{p_config:c}),box=document.getElementById('cleanup-result');box.classList.remove('hidden');box.textContent=`${r.count||0} commande(s) correspondent aux critères.`;archiveStatus('Prévisualisation terminée.','success')}catch(e){archiveStatus(e.message,'error')}};o.querySelector('#cleanup-delete').onclick=async()=>{try{const c=readCleanup();if(!c.statuses.length)throw Error('Sélectionnez au moins un statut.');const r=await cleanupRpc('admin_preview_order_cleanup',{p_config:c});if(!r.count)return archiveStatus('Aucune commande à supprimer.','info');if(!confirm(`Supprimer définitivement ${r.count} commande(s) ?`))return;const d=await cleanupRpc('admin_execute_order_cleanup',{p_config:c,p_is_automatic:false});archiveStatus(`${d.deleted_count||0} commande(s) supprimée(s).`,'success');await loadOrders()}catch(e){archiveStatus(e.message,'error')}};}
o.classList.add('is-open');dataTab('archive');archiveStatus('Chargement…');const r=await Promise.allSettled([archiveRequest('archiveGetConfig').then(x=>{archiveRenderConfig(x.config);toggleAuto('archive-auto-fields',x.config.enabled===true)}),cleanupRpc('admin_get_cleanup_config').then(fillCleanup)]),errs=r.filter(x=>x.status==='rejected');archiveStatus(errs.length?errs.map(x=>x.reason.message).join(' · '):'',errs.length?'error':'info');}
    document.getElementById('btn-archive-management')?.addEventListener('click',openArchiveManager);

    function currentPageOrders(){
        const filtered=getFilteredOrders();
        return filtered.slice((currentOrdersPage-1)*ordersPerPage,currentOrdersPage*ordersPerPage);
    }
    function syncBulkToolbar(){
        const toggle=document.getElementById('btn-bulk-toggle'),edit=document.getElementById('btn-bulk-edit'),remove=document.getElementById('btn-bulk-delete'),all=document.getElementById('btn-bulk-all'),count=document.getElementById('orders-bulk-count');
        toggle?.classList.toggle('is-active',bulkSelectionMode);
        toggle?.setAttribute('aria-pressed',String(bulkSelectionMode));
        [edit,remove,all].forEach(button=>button?.classList.toggle('hidden',!bulkSelectionMode));
        if(count)count.textContent=String(selectedOrderIds.size);
        if(edit)edit.disabled=!selectedOrderIds.size;if(remove)remove.disabled=!selectedOrderIds.size;
    }
    function toggleBulkSelectionMode(){
        bulkSelectionMode=!bulkSelectionMode;
        if(!bulkSelectionMode)selectedOrderIds.clear();
        syncBulkToolbar();
        renderOrdersTable();
    }
    function toggleAllFilteredOrders(){
        const ids=getFilteredOrders().map(order=>String(order.id));
        const allSelected=ids.length&&ids.every(id=>selectedOrderIds.has(id));
        ids.forEach(id=>allSelected?selectedOrderIds.delete(id):selectedOrderIds.add(id));
        syncBulkToolbar();renderOrdersTable();
    }
    function openBulkEditDialog(){
        const ids=[...selectedOrderIds];if(!ids.length)return;
        const statusOptions=Object.entries(STATUS_META).map(([value,meta])=>`<option value="${value}">${meta[0]}</option>`).join('');
        const d=openAdminActionDialog(`<div class="admin-action-card bulk-edit-card"><div class="admin-action-head"><div><h3>Modifier la sélection</h3><p>${ids.length} commande${ids.length>1?'s':''} sélectionnée${ids.length>1?'s':''}.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><div class="bulk-direct-actions"><label class="bulk-dialog-field"><span>Nouveau statut</span><select id="bulk-status"><option value="">Ne pas modifier le statut</option>${statusOptions}</select></label><label class="bulk-dialog-field"><span>État du paiement</span><select id="bulk-payment"><option value="">Ne pas modifier le paiement</option><option value="unpaid">Non payé</option><option value="paid">Payé</option></select></label></div><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Annuler</button><button id="bulk-apply" class="admin-action-button admin-action-primary">Appliquer</button></div></div></div>`);
        const apply=d.querySelector('#bulk-apply');
        apply.onclick=async()=>{const status=d.querySelector('#bulk-status').value,payment=d.querySelector('#bulk-payment').value;if(!status&&!payment)return alert('Choisissez au moins une modification.');apply.disabled=true;apply.textContent='Traitement…';try{if(status){const {error}=await supabaseClient.from('orders').update({status}).in('id',ids);if(error)throw error}if(payment){const {error}=await supabaseClient.from('orders').update({payment_status:payment}).in('id',ids);if(error)throw error}closeAdminActionDialog();await loadOrders();selectedOrderIds.clear();syncBulkToolbar()}catch(error){apply.disabled=false;apply.textContent='Appliquer';alert(error.message)}};
    }
    function deleteBulkSelection(){
        const ids=[...selectedOrderIds];if(!ids.length)return;
        const references=ids.map(id=>currentOrders.find(order=>String(order.id)===String(id))).filter(Boolean).slice(0,4).map(order=>`#${escapeHtml(order.numero_commande||order.id)}`);
        const preview=references.join(', ')+(ids.length>4?` et ${ids.length-4} autre${ids.length-4>1?'s':''}`:'');
        const dialog=openAdminActionDialog(`<div class="admin-action-card"><div class="admin-action-head"><div><h3>Supprimer les commandes sélectionnées ?</h3><p>Cette action est définitive.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><div class="admin-action-alert"><strong>${ids.length} commande${ids.length>1?'s':''}</strong> ${ids.length>1?'seront supprimées':'sera supprimée'} définitivement de Supabase${preview?` : <span class="admin-action-ref">${preview}</span>`:''}. Cette action ne peut pas être annulée.</div><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Conserver</button><button id="admin-bulk-delete-confirm" class="admin-action-button admin-action-danger">Supprimer définitivement</button></div></div></div>`);
        dialog.querySelector('#admin-bulk-delete-confirm').onclick=async()=>{
            const button=dialog.querySelector('#admin-bulk-delete-confirm');button.disabled=true;button.textContent='Suppression…';
            try{const history=await supabaseClient.from('order_history').delete().in('order_id',ids);if(history.error&&history.error.code!=='42P01')throw history.error;const {error}=await supabaseClient.from('orders').delete().in('id',ids);if(error)throw error;selectedOrderIds.clear();closeAdminActionDialog();await loadOrders();syncBulkToolbar()}catch(error){button.disabled=false;button.textContent='Supprimer définitivement';alert(error.message)}
        };
    }
    document.getElementById('btn-bulk-toggle')?.addEventListener('click',toggleBulkSelectionMode);
    document.getElementById('btn-bulk-all')?.addEventListener('click',toggleAllFilteredOrders);
    document.getElementById('btn-bulk-edit')?.addEventListener('click',openBulkEditDialog);
    document.getElementById('btn-bulk-delete')?.addEventListener('click',deleteBulkSelection);
    syncBulkToolbar();

    function printDateKey(v){const d=new Date(v);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
    function exactA5BodyForOrder(order){const html=printOrder(order.id,{returnHtml:true})||'';const style=(html.match(/<style>([\s\S]*?)<\/style>/i)||[])[1]||'';const body=(html.match(/<body>([\s\S]*?)<script>/i)||[])[1]||'';return {style,body};}
    function printPeriod(from,to,status='all'){const list=currentOrders.filter(o=>{const k=printDateKey(o.created_at||o.inserted_at);return k&&k>=from&&k<=to&&(status==='all'||normalizeStatus(o.status)===status)}).sort((x,y)=>new Date(x.created_at||x.inserted_at)-new Date(y.created_at||y.inserted_at));if(!list.length)return alert('Aucune commande dans cette période.');const pages=list.map(exactA5BodyForOrder),style=pages[0]?.style||'';const w=open('','_blank','width=900,height=950');if(!w)return alert('Autorisez les popups.');w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Commandes A5</title><style>${style}\n@page{size:A5 portrait;margin:7mm}.sheet{page-break-after:always;break-after:page}.sheet:last-child{page-break-after:auto;break-after:auto}</style></head><body>${pages.map(page=>page.body).join('')}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500));<\/script></body></html>`);w.document.close();}
    function openPrintPeriodDialog(){
        const today=printDateKey(new Date());
        const statusOptions=Object.entries(STATUS_META).map(([value,meta])=>`<option value="${value}">${meta[0]}</option>`).join('');
        const d=openAdminActionDialog(`<div class="admin-action-card print-period-card"><div class="admin-action-head"><div><h3>Imprimer les commandes</h3><p>Une page A5 par commande.</p></div><button class="admin-action-close" data-dialog-close>×</button></div><div class="admin-action-body"><div class="print-mode"><button class="is-active" data-pmode="today">Aujourd’hui</button><button data-pmode="range">Intervalle</button></div><div id="print-dates" class="print-dates hidden"><label><span>Du</span><input id="pfrom" type="date" value="${today}"></label><label><span>Au</span><input id="pto" type="date" value="${today}"></label></div><label class="print-status-field"><span>Statut des commandes</span><select id="pstatus"><option value="all">Tous les statuts</option>${statusOptions}</select></label><div id="pcount" class="print-count"></div><div class="admin-action-buttons"><button class="admin-action-button admin-action-cancel" data-dialog-close>Annuler</button><button id="pgo" class="admin-action-button admin-action-primary">Imprimer</button></div></div></div>`);
        let mode='today';
        const dates=d.querySelector('#print-dates'),from=d.querySelector('#pfrom'),to=d.querySelector('#pto'),status=d.querySelector('#pstatus'),count=d.querySelector('#pcount'),go=d.querySelector('#pgo');
        const range=()=>mode==='today'?[today,today]:[from.value,to.value];
        const update=()=>{const[a,z]=range(),n=currentOrders.filter(o=>{const k=printDateKey(o.created_at||o.inserted_at);return k>=a&&k<=z&&(status.value==='all'||normalizeStatus(o.status)===status.value)}).length;count.textContent=`${n} commande${n>1?'s':''}`;go.disabled=!n};
        d.querySelectorAll('[data-pmode]').forEach(x=>x.onclick=()=>{mode=x.dataset.pmode;d.querySelectorAll('[data-pmode]').forEach(y=>y.classList.toggle('is-active',y===x));dates.classList.toggle('hidden',mode==='today');update()});
        from.onchange=()=>{if(from.value>to.value)to.value=from.value;update()};to.onchange=update;status.onchange=update;
        go.onclick=()=>{const[a,z]=range();const selectedStatus=status.value;closeAdminActionDialog();printPeriod(a,z,selectedStatus)};
        update();
    }

    document.getElementById('btn-print-period')?.addEventListener('click',openPrintPeriodDialog);
    document.getElementById('orders-search')?.addEventListener('input', () => { currentOrdersPage = 1; renderOrdersTable(); });
    const orderFilterRoot=document.getElementById('orders-multifilter'),orderFilterMenu=document.getElementById('orders-multifilter-menu');
    document.getElementById('orders-multifilter-toggle')?.addEventListener('click',event=>{event.stopPropagation();const opening=orderFilterMenu?.classList.contains('hidden');closeOrderMultiFilter();if(opening){orderFilterMenu?.classList.remove('hidden');orderFilterRoot?.classList.add('is-open');event.currentTarget.setAttribute('aria-expanded','true')}});
    orderFilterMenu?.addEventListener('change',event=>{const input=event.target.closest('input[type="checkbox"]');if(!input)return;const [group,value]=String(input.value||'').split(':'),set=group==='status'?selectedOrderStatuses:selectedOrderPayments;if(input.checked)set.add(value);else{if(group==='payment'&&selectedOrderPayments.size===1&&selectedOrderPayments.has(value)){input.checked=true;return}set.delete(value)}applyOrderMultiFilter()});
    document.getElementById('orders-filter-all')?.addEventListener('click',event=>{event.preventDefault();ORDER_STATUS_FILTER_VALUES.forEach(v=>selectedOrderStatuses.add(v));ORDER_PAYMENT_FILTER_VALUES.forEach(v=>selectedOrderPayments.add(v));applyOrderMultiFilter()});
    document.getElementById('orders-filter-none')?.addEventListener('click',event=>{event.preventDefault();selectedOrderStatuses.clear();selectedOrderPayments.clear();ORDER_PAYMENT_FILTER_VALUES.forEach(v=>selectedOrderPayments.add(v));applyOrderMultiFilter()});
    document.addEventListener('pointerdown',event=>{if(!event.target.closest('#orders-multifilter'))closeOrderMultiFilter()});window.addEventListener('scroll',closeOrderMultiFilter,true);window.addEventListener('resize',closeOrderMultiFilter);document.addEventListener('keydown',event=>{if(event.key==='Escape')closeOrderMultiFilter()});syncOrderMultiFilter();
    document.getElementById('orders-date-filter')?.addEventListener('change', () => { currentOrdersPage = 1; renderOrdersTable(); });
    


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
            if (setting.key === 'rentree_title_ar') document.getElementById('set-rentree-title-ar').value = setting.value;
            if (setting.key === 'delivery_enabled') document.getElementById('set-delivery-enabled').value = setting.value;
            if (setting.key === 'contact_address') document.getElementById('set-contact-address').value = setting.value;
            if (setting.key === 'contact_email') document.getElementById('set-contact-email').value = setting.value;
            if (setting.key === 'contact_phone') document.getElementById('set-contact-phone').value = setting.value;
            if (setting.key === 'contact_whatsapp') document.getElementById('set-contact-whatsapp').value = setting.value;
            if (setting.key === 'opening_week_morning') document.getElementById('set-opening-week-morning').value = setting.value;
            if (setting.key === 'opening_week_afternoon') document.getElementById('set-opening-week-afternoon').value = setting.value;
            if (setting.key === 'opening_saturday') document.getElementById('set-opening-saturday').value = setting.value;
            if (setting.key === 'opening_sunday') document.getElementById('set-opening-sunday').value = setting.value;
            if (setting.key === 'contact_facebook') document.getElementById('set-contact-facebook').value = setting.value;
            if (setting.key === 'contact_instagram') document.getElementById('set-contact-instagram').value = setting.value;
            if (setting.key === 'contact_linkedin') document.getElementById('set-contact-linkedin').value = setting.value;
        });
    }

    document.getElementById('form-site-settings')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await supabaseClient.from('site_settings').update({ value: document.getElementById('set-rentree-enabled').value }).eq('key', 'rentree_enabled');
        await supabaseClient.from('site_settings').update({ value: document.getElementById('set-rentree-title').value }).eq('key', 'rentree_title');
        await supabaseClient.from('site_settings').upsert({ key: 'rentree_title_ar', value: document.getElementById('set-rentree-title-ar').value.trim() || 'الدخول المدرسي' }, { onConflict: 'key' });
        await supabaseClient.from('site_settings').upsert({ key: 'delivery_enabled', value: document.getElementById('set-delivery-enabled').value }, { onConflict: 'key' });
        alert("Visibilité de l'onglet Rentrée mise à jour.");
    });

    document.getElementById('form-home-contacts')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const updates = {
            contact_address: document.getElementById('set-contact-address').value,
            contact_email: document.getElementById('set-contact-email').value,
            contact_phone: document.getElementById('set-contact-phone').value,
            contact_whatsapp: document.getElementById('set-contact-whatsapp').value,
            opening_week_morning: document.getElementById('set-opening-week-morning').value,
            opening_week_afternoon: document.getElementById('set-opening-week-afternoon').value,
            opening_saturday: document.getElementById('set-opening-saturday').value,
            opening_sunday: document.getElementById('set-opening-sunday').value,
            contact_facebook: document.getElementById('set-contact-facebook').value,
            contact_instagram: document.getElementById('set-contact-instagram').value,
            contact_linkedin: document.getElementById('set-contact-linkedin').value
        };
        for (const [key, value] of Object.entries(updates)) {
            const { error } = await supabaseClient.from('site_settings').upsert({ key, value }, { onConflict: 'key' });
            if (error) { alert(error.message); return; }
        }
        alert("Les coordonnées de contact ont été modifiées.");
        loadSiteSettings();
    });

    function renderAdminPreviewList() {
        if (!previewBox) return;
        if(activePackDrawerKind==='school')setPackDrawerValidationError('');
        updatePackDrawerPrice();
        if (!currentFormItems.length) {
            previewBox.innerHTML = "Aucun article ajouté pour le moment.";
            return;
        }
        previewBox.innerHTML = currentFormItems.map(item => {
            const availabilityLabel = item.availability === 'out_of_stock' ? 'Out of stock' : item.availability === 'almost_out' ? 'Almost out' : 'Available';
            return `
                <div class="flex justify-between items-center gap-3 bg-white p-2 border rounded-lg border-stone-200">
                    <span class="text-gray-700 font-medium min-w-0"><b class="text-[#E75C25] mr-1">[${escapeHtml(item.category)}]</b> <span dir="${item.name_language==='ar'?'rtl':'ltr'}" lang="${item.name_language||'fr'}">${escapeHtml(item.name)}</span> - <b>${money(item.price)}</b> <em class="text-gray-400">(${availabilityLabel})</em></span>
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
            const item = { id: editingItemId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, name_language:selectedItemLanguage, category, price, availability };
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
        setItemLabelLanguage(item.name_language || (/[^\u0000-\u007f]/.test(item.name||'') ? 'ar' : 'fr'));
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

    function getAdminDriveFileId(url) {
        const match = String(url || '').trim().match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
        return match ? match[1] : '';
    }
    function adminSchoolLogoCandidates(url) {
        const value = String(url || '').trim();
        const id = getAdminDriveFileId(value);
        return id ? [`https://drive.google.com/thumbnail?id=${id}&sz=w800`, `https://lh3.googleusercontent.com/d/${id}=w800`, `https://drive.google.com/uc?export=view&id=${id}`] : (value ? [value] : []);
    }
    window.retryAdminSchoolLogo = function(image) {
        const candidates = JSON.parse(image.dataset.logoCandidates || '[]');
        const next = Number(image.dataset.logoIndex || 0) + 1;
        if (next < candidates.length) {
            image.dataset.logoIndex = String(next);
            setTimeout(() => { image.src = `${candidates[next]}${candidates[next].includes('?') ? '&' : '?'}retry=${Date.now()}`; }, 1200 * next);
            return;
        }
        setTimeout(() => {
            image.style.display = 'none';
            image.nextElementSibling?.classList.remove('hidden');
        }, 1800);
    };

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
    document.getElementById('cfg-school')?.addEventListener('change',()=>{syncSelectedSchoolLogo();refreshAvailableLevelOptions();setPackDrawerValidationError('');});
    document.getElementById('cfg-level')?.addEventListener('change',()=>setPackDrawerValidationError(''));

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

    window.startEditSchoolList = async function(id) {
        const list = window.schoolListsCache?.find(item => String(item.id) === String(id));
        if (!list) return;
        editingListId = list.id;
        await loadSchoolAndLevelCatalogs(list.school_name || '', list.level || '');
        document.getElementById('cfg-school').value = list.school_name || '';
        document.getElementById('cfg-school-logo-url').value = list.school_logo_url || schoolCatalogCache.find(item=>item.name===list.school_name)?.logo_url || '';
        updateSchoolLogoPreview();
        document.getElementById('cfg-level').value = list.level || '';
        refreshAvailableLevelOptions(list.level || '');
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
        openPackDrawer('school',{editing:true});
    };

    btnCancelEditPack?.addEventListener('click', resetPackForm);

    formAdd?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const school = document.getElementById('cfg-school').value.trim();
        const schoolLogoUrl = document.getElementById('cfg-school-logo-url').value.trim();
        const level = document.getElementById('cfg-level').value.trim();
        if (!validateSchoolListDrawer()) return;
        const duplicate=(window.schoolListsCache||[]).find(item=>String(item.id)!==String(editingListId??'')&&normalizeCatalogName(item.school_name)===normalizeCatalogName(school)&&normalizeCatalogName(item.level)===normalizeCatalogName(level));
        if(duplicate){setPackDrawerValidationError("Ce niveau existe déjà pour cette école. Choisissez un autre niveau.");refreshAvailableLevelOptions();return;}
        const existingList=editingListId ? window.schoolListsCache?.find(item=>String(item.id)===String(editingListId)) : null;
        const schoolRecord=schoolCatalogCache.find(item=>item.name===school),levelRecord=levelCatalogCache.find(item=>item.name===level);
        const payload = { school_id: schoolRecord?.id || null, level_id: levelRecord?.id || null, school_name: school, school_logo_url: schoolRecord?.logo_url || schoolLogoUrl || null, level, items: [JSON.stringify(currentFormItems)], is_active: existingList?.is_active !== false, school_is_active: existingList?.school_is_active !== false };
        const { error } = editingListId
            ? await supabaseClient.from('school_lists').update(payload).eq('id', editingListId)
            : await supabaseClient.from('school_lists').insert([payload]);
        if (error) {
            console.error(error);
            alert(`Erreur lors de l'enregistrement : ${error.message}`);
            return;
        }
        closePackDrawerNow();resetPackForm();
        loadSchoolLists();
    });

    const adminMultiSelections={};
    function getAdminMultiValues(id){return [...(adminMultiSelections[id]||new Set())]}
    function syncAdminMultiSelect(id){const select=document.getElementById(id);if(!select)return;let root=select.nextElementSibling?.classList.contains('admin-multiselect')?select.nextElementSibling:null;if(!root){root=document.createElement('div');root.className='admin-multiselect';root.innerHTML='<button type="button" class="admin-multiselect-trigger" aria-expanded="false"><span></span><i></i></button><div class="admin-multiselect-menu" hidden></div>';select.hidden=true;select.after(root);const trigger=root.firstElementChild,menu=root.lastElementChild;trigger.onclick=e=>{e.stopPropagation();const opening=menu.hidden;document.querySelectorAll('.admin-multiselect-menu').forEach(other=>{if(other!==menu)other.hidden=true});menu.hidden=!opening;trigger.setAttribute('aria-expanded',opening?'true':'false')};menu.onclick=e=>e.stopPropagation();}const set=adminMultiSelections[id]||(adminMultiSelections[id]=new Set()),options=[...select.options].filter(o=>o.value),valid=new Set(options.map(o=>o.value));[...set].forEach(v=>{if(!valid.has(v))set.delete(v)});const menu=root.lastElementChild,wasOpen=!menu.hidden;menu.innerHTML=options.map(o=>`<label><input type="checkbox" value="${catalogEscape(o.value)}" ${set.has(o.value)?'checked':''}><span>${catalogEscape(o.textContent)}</span></label>`).join('');menu.querySelectorAll('input').forEach(input=>input.onchange=e=>{e.stopPropagation();input.checked?set.add(input.value):set.delete(input.value);root.firstElementChild.firstElementChild.textContent=set.size?`${set.size} sélection${set.size>1?'s':''}`:select.options[0]?.textContent||'Tout afficher';id.includes('school-lists')?renderFilteredSchoolLists():syncSupplyFilterReset();menu.hidden=false;root.firstElementChild.setAttribute('aria-expanded','true')});root.firstElementChild.firstElementChild.textContent=set.size?`${set.size} sélection${set.size>1?'s':''}`:select.options[0]?.textContent||'Tout afficher';menu.hidden=!wasOpen;}
    document.addEventListener('click',()=>document.querySelectorAll('.admin-multiselect-menu').forEach(m=>m.hidden=true));
    function normalizeSchoolListFilterValue(value) { return String(value || '').trim().toLocaleLowerCase('fr-FR'); }
    function fillSchoolListFilterOptions(lists) {
        const schoolSelect = document.getElementById('filter-school-lists-school');
        const levelSelect = document.getElementById('filter-school-lists-level');
        if (!schoolSelect || !levelSelect) return;
        const selectedSchool = schoolSelect.value, selectedLevel = levelSelect.value;
        const schools = [...new Set((lists || []).map(x => String(x.school_name || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
        const levels = [...new Set((lists || []).map(x => String(x.level || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true,sensitivity:'base'}));
        schoolSelect.innerHTML = '<option value="">Toutes les écoles</option>' + schools.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
        levelSelect.innerHTML = '<option value="">Tous les niveaux</option>' + levels.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
        if (schools.includes(selectedSchool)) schoolSelect.value = selectedSchool;
        if (levels.includes(selectedLevel)) levelSelect.value = selectedLevel;syncAdminMultiSelect('filter-school-lists-school');syncAdminMultiSelect('filter-school-lists-level');
    }
    function kanbanEyeIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg>'; }
    function kanbanEditIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.3-1 10.2-10.2-3.3-3.3L5 15.7 4 20Z"/><path d="m13.7 7 3.3 3.3"/></svg>'; }
    function kanbanDeleteIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>'; }
    function renderFilteredSchoolLists() {
        const container = document.getElementById('config-lists-container');
        const schoolFilters=getAdminMultiValues('filter-school-lists-school').map(normalizeSchoolListFilterValue);
        const levelFilters=getAdminMultiValues('filter-school-lists-level').map(normalizeSchoolListFilterValue);
        const source = window.schoolListsCache || [];
        const filtered=source.filter(list=>(!schoolFilters.length||schoolFilters.includes(normalizeSchoolListFilterValue(list.school_name)))&&(!levelFilters.length||levelFilters.includes(normalizeSchoolListFilterValue(list.level))));
        const count = document.getElementById('school-lists-filter-count');
        if (count) count.textContent = `${filtered.length} liste${filtered.length > 1 ? 's' : ''} affichée${filtered.length > 1 ? 's' : ''} sur ${source.length}`;
        const reset = document.getElementById('btn-reset-school-list-filters'); if(reset)reset.disabled=!schoolFilters.length&&!levelFilters.length;
        if (!container) return;
        const groups=new Map();
        (schoolCatalogCache||[]).filter(entry=>entry.is_active!==false).forEach(entry=>{const school=String(entry.name||'').trim();if(school&&(!schoolFilters.length||schoolFilters.includes(normalizeSchoolListFilterValue(school))))groups.set(school,[])});
        filtered.forEach(list=>{const school=String(list.school_name||'École non renseignée').trim();if(!groups.has(school))groups.set(school,[]);groups.get(school).push(list)});
        if(!groups.size){container.innerHTML='<div class="school-kanban-empty-all">Aucune école ne correspond aux filtres.</div>';return;}
        container.innerHTML=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b,'fr',{sensitivity:'base'})).map(([school,lists])=>{
            const catalogSchool=(schoolCatalogCache||[]).find(entry=>normalizeSchoolListFilterValue(entry.name)===normalizeSchoolListFilterValue(school))||{};
            const first=lists[0]||{},schoolActive=lists.length?lists.every(list=>list.school_is_active!==false):catalogSchool.is_active!==false,logoUrl=first.school_logo_url||catalogSchool.logo_url||'',candidates=adminSchoolLogoCandidates(logoUrl),initial=escapeHtml(school.charAt(0).toUpperCase()||'E');
            const logo=logoUrl?`<span class="school-kanban-logo"><img src="${escapeHtml(candidates[0]||'')}" data-logo-candidates="${escapeHtml(JSON.stringify(candidates))}" data-logo-index="0" alt="" onerror="retryAdminSchoolLogo(this)"><span class="school-kanban-logo-fallback">${initial}</span></span>`:`<span class="school-kanban-logo school-kanban-logo-fallback">${initial}</span>`;
            const cards=lists.slice().sort((a,b)=>String(a.level||'').localeCompare(String(b.level||''),'fr',{numeric:true})).map(list=>{const items=parseSchoolListItems(list.items),ruptures=items.filter(item=>item.availability==='out_of_stock').length,active=list.is_active!==false;return `<article class="school-level-card ${active?'':'is-hidden-level'}"><div class="school-level-card-top"><button type="button" class="school-level-eye ${active?'':'is-off'}" data-id="${list.id}" data-active="${active?'true':'false'}" title="${active?'Masquer ce niveau':'Afficher ce niveau'}">${kanbanEyeIcon()}</button><div class="school-level-actions"><button type="button" class="btn-edit-list" data-id="${list.id}" title="Modifier">${kanbanEditIcon()}</button><button type="button" class="btn-delete-list is-delete" data-id="${list.id}" title="Supprimer">${kanbanDeleteIcon()}</button></div></div><h4>Classe : ${escapeHtml(list.level||'-')}</h4><p>${items.length} article${items.length>1?'s':''} configuré${items.length>1?'s':''} · ${ruptures} rupture${ruptures>1?'s':''}</p></article>`;}).join('');
            return `<section class="school-kanban-column ${schoolActive?'':'is-hidden-school'}"><header class="school-kanban-header"><div class="school-kanban-school">${logo}<strong>${escapeHtml(school)}</strong></div>${lists.length?`<button type="button" class="school-kanban-school-eye ${schoolActive?'':'is-off'}" data-school="${escapeHtml(school)}" data-active="${schoolActive?'true':'false'}" title="${schoolActive?'Masquer cette école':'Afficher cette école'}">${kanbanEyeIcon()}</button>`:''}</header><div class="school-kanban-cards">${cards||'<div class="school-kanban-no-list">Aucune liste ajoutée</div>'}</div></section>`;
        }).join('');
        container.querySelectorAll('.school-level-eye').forEach(button=>button.onclick=async()=>{const next=button.dataset.active!=='true';button.disabled=true;const {error}=await supabaseClient.from('school_lists').update({is_active:next}).eq('id',button.dataset.id);if(error){button.disabled=false;return alert(error.message)}const list=window.schoolListsCache.find(item=>String(item.id)===String(button.dataset.id));if(list)list.is_active=next;renderFilteredSchoolLists();});
        container.querySelectorAll('.school-kanban-school-eye').forEach(button=>button.onclick=async()=>{const school=button.dataset.school,next=button.dataset.active!=='true';button.disabled=true;const {error}=await supabaseClient.from('school_lists').update({school_is_active:next}).eq('school_name',school);if(error){button.disabled=false;return alert(error.message)}const schoolRecord=schoolCatalogCache.find(item=>normalizeCatalogName(item.name)===normalizeCatalogName(school));if(schoolRecord){const {error:schoolError}=await supabaseClient.from('schools').update({is_active:next}).eq('id',schoolRecord.id);if(schoolError){button.disabled=false;return alert(schoolError.message)}schoolRecord.is_active=next;}window.schoolListsCache.filter(item=>String(item.school_name)===school).forEach(item=>item.school_is_active=next);renderMasterCatalogs();renderFilteredSchoolLists();});
        container.querySelectorAll('.btn-edit-list').forEach(button=>button.onclick=()=>startEditSchoolList(button.dataset.id));
        container.querySelectorAll('.btn-delete-list').forEach(button=>button.onclick=async()=>{if(!confirm('Supprimer ce niveau ?'))return;const {error}=await supabaseClient.from('school_lists').delete().eq('id',button.dataset.id);if(error)return alert(error.message);await loadSchoolLists();});
    }
    document.getElementById('btn-reset-school-list-filters')?.addEventListener('click',()=>{adminMultiSelections['filter-school-lists-school']?.clear();adminMultiSelections['filter-school-lists-level']?.clear();syncAdminMultiSelect('filter-school-lists-school');syncAdminMultiSelect('filter-school-lists-level');renderFilteredSchoolLists();});

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
        fillSchoolListFilterOptions(window.schoolListsCache);
        renderFilteredSchoolLists();
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
        openDeleteOrderDialog(orderId);
    }

    initAuth();


    // FOURNITURES INDÉPENDANTES - PACKS SCOLAIRES
    const supplyAdminForm = document.getElementById('form-supply-item');
    const supplyAdminList = document.getElementById('supply-items-admin-list');
    const supplyEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    let supplySpecs=[];const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;const iconEye='<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg>',iconTrash='<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>';
    function syncSupplyMode(){const quality=document.getElementById('supply-has-quality').checked,specs=document.getElementById('supply-has-specs').checked;document.getElementById('supply-quality-field').hidden=!quality;const tab=document.getElementById('supply-spec-tab');tab.disabled=!specs;tab.classList.toggle('is-disabled',!specs);if(!specs)setSupplyTab('info');renderSpecs();}
    function renderSpecs(){
        const box=document.getElementById('supply-spec-list');
        if(!box)return;
        const quality=document.getElementById('supply-has-quality').checked;
        document.getElementById('supply-spec-count').textContent=supplySpecs.length;
        const pencil='<svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>';
        box.innerHTML=supplySpecs.length?supplySpecs.map((sp,si)=>{
            const collapsedTitle=(sp.name||'').trim()||`Spécificité ${si+1}`;
            const collapsedValues=sp.values.map(v=>(v.name||'').trim()).filter(Boolean).join(' · ')||'Aucune valeur renseignée';
            return `<article class="spec-card ${sp.collapsed?'collapsed':''}" data-id="${sp.id}">
                <header>
                    <div><b>${sp.collapsed?supplyEscape(collapsedTitle):`Spécificité ${si+1}`}</b><small>${sp.collapsed?supplyEscape(collapsedValues):'Ex. Couleur, capacité, format'}</small></div>
                    <div>${sp.collapsed?`<button type="button" class="spec-edit" title="Modifier">${pencil}</button>`:''}<button type="button" class="spec-eye ${sp.active?'':'off'}" title="Afficher ou masquer">${iconEye}</button><button type="button" class="spec-delete" title="Supprimer">${iconTrash}</button></div>
                </header>
                <section>
                    <div class="spec-top">
                        <label><span>Nom</span><input class="spec-name" value="${supplyEscape(sp.name)}" placeholder="Ex : Couleur"></label>
                        <label class="spec-supp"><input type="checkbox" ${sp.supp?'checked':''}><i aria-hidden="true"></i><b>Supplément</b></label>
                    </div>
                    ${sp.supp?`<div class="spec-legends"><span class="spec-legend-empty"></span><span>Standard</span>${quality?'<span>Qualité</span>':''}</div>`:''}
                    <div class="spec-values">${sp.values.map((v,vi)=>`<div class="spec-row ${sp.supp?'':'no-supp'}">
                        <input class="v-name" data-v="${v.id}" value="${supplyEscape(v.name)}" placeholder="Valeur">
                        ${sp.supp?`<input class="v-std" data-v="${v.id}" type="number" min="0" step="0.01" value="${v.std}">${quality?`<input class="v-qual" data-v="${v.id}" type="number" min="0" step="0.01" value="${v.qual}">`:''}`:''}
                        <button type="button" class="v-eye ${v.active?'':'off'}" data-v="${v.id}" title="Afficher ou masquer">${iconEye}</button>
                        <button type="button" class="v-delete" data-v="${v.id}" title="Supprimer">${iconTrash}</button>
                        ${vi===sp.values.length-1?'<button type="button" class="v-add" title="Ajouter une valeur">+</button>':'<span class="action-space"></span>'}
                    </div>`).join('')}</div>
                    <button type="button" class="spec-validate">Valider</button>
                </section>
            </article>`;
        }).join(''):'<div class="spec-empty">Ajoutez une spécificité pour commencer.</div>';
        box.querySelectorAll('.spec-card').forEach(card=>{
            const sp=supplySpecs.find(x=>x.id===card.dataset.id);
            card.querySelector('.spec-name')?.addEventListener('input',e=>sp.name=e.target.value);
            card.querySelector('.spec-supp input')?.addEventListener('change',e=>{sp.supp=e.target.checked;renderSpecs()});
            card.querySelector('.spec-edit')?.addEventListener('click',()=>{sp.collapsed=false;renderSpecs()});
            card.querySelector('.spec-eye')?.addEventListener('click',()=>{sp.active=!sp.active;renderSpecs()});
            card.querySelector('.spec-delete')?.addEventListener('click',()=>{supplySpecs=supplySpecs.filter(x=>x.id!==sp.id);renderSpecs()});
            card.querySelectorAll('.v-name').forEach(x=>x.addEventListener('input',()=>sp.values.find(v=>v.id===x.dataset.v).name=x.value));
            card.querySelectorAll('.v-std').forEach(x=>x.addEventListener('input',()=>sp.values.find(v=>v.id===x.dataset.v).std=Number(x.value)||0));
            card.querySelectorAll('.v-qual').forEach(x=>x.addEventListener('input',()=>sp.values.find(v=>v.id===x.dataset.v).qual=Number(x.value)||0));
            card.querySelectorAll('.v-eye').forEach(x=>x.addEventListener('click',()=>{const v=sp.values.find(v=>v.id===x.dataset.v);v.active=!v.active;renderSpecs()}));
            card.querySelectorAll('.v-delete').forEach(x=>x.addEventListener('click',()=>{sp.values=sp.values.filter(v=>v.id!==x.dataset.v);if(!sp.values.length)sp.values.push({id:uid('v'),name:'',std:0,qual:0,active:true});renderSpecs()}));
            card.querySelector('.v-add')?.addEventListener('click',()=>{sp.values.push({id:uid('v'),name:'',std:0,qual:0,active:true});renderSpecs()});
            card.querySelector('.spec-validate')?.addEventListener('click',()=>{sp.collapsed=true;renderSpecs()});
        });
    }
    document.getElementById('add-supply-spec').onclick=()=>{supplySpecs.push({id:uid('s'),name:'',supp:false,active:true,collapsed:false,values:[{id:uid('v'),name:'',std:0,qual:0,active:true}]});renderSpecs()};document.getElementById('supply-has-quality').onchange=syncSupplyMode;document.getElementById('supply-has-specs').onchange=syncSupplyMode;


    async function loadSupplySpecs(itemId){
        supplySpecs=[];
        if(!itemId){renderSpecs();return;}
        const {data,error}=await supabaseClient.from('supply_attributes').select('id,name,has_supplement,is_active,sort_order,supply_attribute_values(id,label,standard_supplement,quality_supplement,is_active,sort_order)').eq('supply_item_id',itemId).order('sort_order',{ascending:true});
        if(error){console.error('Chargement des spécificités :',error);alert('Impossible de charger les spécificités : '+error.message);renderSpecs();return;}
        supplySpecs=(data||[]).map(attribute=>({
            id:String(attribute.id),
            name:attribute.name||'',
            supp:attribute.has_supplement===true,
            active:attribute.is_active!==false,
            collapsed:true,
            values:(attribute.supply_attribute_values||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(value=>({
                id:String(value.id),name:value.label||'',std:Number(value.standard_supplement)||0,qual:Number(value.quality_supplement)||0,active:value.is_active!==false
            }))
        }));
        supplySpecs.forEach(spec=>{if(!spec.values.length)spec.values.push({id:uid('v'),name:'',std:0,qual:0,active:true})});
        renderSpecs();
    }
    function validateSupplySpecs(){
        if(!document.getElementById('supply-has-specs').checked)return '';
        if(!supplySpecs.length)return 'Ajoutez au moins une spécificité.';
        for(let index=0;index<supplySpecs.length;index++){
            const spec=supplySpecs[index];
            if(!(spec.name||'').trim())return `Renseignez le nom de la spécificité ${index+1}.`;
            if(!spec.values.some(value=>(value.name||'').trim()))return `Ajoutez au moins une valeur à « ${spec.name.trim()} ».`;
        }
        return '';
    }
    async function saveSupplySpecs(itemId){
        const {error:deleteError}=await supabaseClient.from('supply_attributes').delete().eq('supply_item_id',itemId);
        if(deleteError)throw deleteError;
        if(!document.getElementById('supply-has-specs').checked)return;
        for(let index=0;index<supplySpecs.length;index++){
            const spec=supplySpecs[index];
            const {data:attribute,error:attributeError}=await supabaseClient.from('supply_attributes').insert([{
                supply_item_id:Number(itemId),name:spec.name.trim(),has_supplement:spec.supp===true,is_active:spec.active!==false,sort_order:index
            }]).select('id').single();
            if(attributeError)throw attributeError;
            const values=spec.values.filter(value=>(value.name||'').trim()).map((value,valueIndex)=>({
                attribute_id:attribute.id,label:value.name.trim(),standard_supplement:spec.supp?Number(value.std)||0:0,quality_supplement:spec.supp?Number(value.qual)||0:0,is_active:value.active!==false,sort_order:valueIndex
            }));
            if(values.length){const {error:valueError}=await supabaseClient.from('supply_attribute_values').insert(values);if(valueError)throw valueError;}
        }
    }

    function resetSupplyAdminForm() {
        if (!supplyAdminForm) return;
        supplyAdminForm.reset();
        document.getElementById('supply-item-id').value = '';
        document.getElementById('supply-item-active').checked = true;document.getElementById('supply-item-category-id').value='';
        document.getElementById('cancel-supply-edit')?.classList.add('hidden');document.getElementById('supply-has-quality').checked=true;document.getElementById('supply-has-specs').checked=false;supplySpecs=[];syncSupplyMode();
    }

    const supplyPencil=()=>'<svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>';
    function renderExistingSuppliesList(supplies){
        const box=document.getElementById('existing-supplies-list'),count=document.getElementById('existing-supplies-count');if(!box)return;const categoryFilters=getAdminMultiValues('filter-supply-category'),featureFilters=getAdminMultiValues('filter-supply-feature');const matchesFeature=i=>!featureFilters.length||featureFilters.some(ff=>(ff==='specs'&&i.has_specs===true)||(ff==='no-specs'&&i.has_specs!==true)||(ff==='quality-2'&&i.has_quality!==false)||(ff==='quality-1'&&i.has_quality===false));const visible=supplies.filter(i=>(!categoryFilters.length||categoryFilters.includes(String(i.category_id)))&&matchesFeature(i));const cats=supplyCategoryCache.filter(c=>!categoryFilters.length||categoryFilters.includes(String(c.id)));if(count)count.textContent=`${supplyCategoryCache.length} catégories, ${supplies.length} fournitures`;box.innerHTML=cats.map(cat=>{const items=visible.filter(i=>String(i.category_id)===String(cat.id));return `<article class="supply-kanban-column ${cat.is_active===false?'is-category-off':''}"><header><b>${supplyEscape(cat.name)}</b><button class="supply-category-eye ${cat.is_active===false?'off':''}" data-id="${cat.id}" data-active="${cat.is_active!==false}">${iconEye}</button></header><div class="supply-kanban-cards">${items.map(i=>`<div class="supply-kanban-card ${i.is_active===false?'is-item-off':''}"><div class="supply-card-actions"><button class="supply-card-eye ${i.is_active===false?'off':''}" data-id="${i.id}" data-active="${i.is_active!==false}">${iconEye}</button><span></span><button class="existing-supply-edit" data-id="${i.id}">${supplyPencil()}</button><button class="supply-card-delete" data-id="${i.id}">${iconTrash}</button></div><b>${supplyEscape(i.name)}</b><small>${i.has_quality===false?'1 gamme':'2 gammes'} · ${i.spec_count||0} spécificité${(i.spec_count||0)>1?'s':''}</small></div>`).join('')||'<div class="supply-kanban-empty">Aucune fourniture</div>'}</div></article>`}).join('')||'<div class="supply-kanban-empty-all">Aucune catégorie.</div>';
        box.querySelectorAll('.supply-category-eye').forEach(b=>b.onclick=async()=>{const {error}=await supabaseClient.from('supply_categories').update({is_active:b.dataset.active!=='true'}).eq('id',b.dataset.id);if(error)return alert(error.message);await loadSupplyCategories();await loadSupplyAdmin();});
        box.querySelectorAll('.supply-card-eye').forEach(b=>b.onclick=async()=>{await supabaseClient.from('supply_items').update({is_active:b.dataset.active!=='true'}).eq('id',b.dataset.id);await loadSupplyAdmin();});
        box.querySelectorAll('.existing-supply-edit').forEach(b=>b.onclick=async()=>{const i=supplies.find(x=>String(x.id)===String(b.dataset.id));document.getElementById('supply-item-id').value=i.id;document.getElementById('supply-item-name').value=i.name||'';await loadSupplyCategories(i.category_id);document.getElementById('supply-item-standard').value=i.standard_price||0;document.getElementById('supply-item-quality').value=i.quality_price||0;document.getElementById('supply-item-active').checked=i.is_active!==false;document.getElementById('supply-has-quality').checked=i.has_quality!==false;document.getElementById('supply-has-specs').checked=i.has_specs===true;await loadSupplySpecs(i.id);syncSupplyMode();openPackDrawer('supply',{editing:true});});
        box.querySelectorAll('.supply-card-delete').forEach(b=>b.onclick=()=>openMasterDeleteDialog('supply',b.dataset.id,'cette fourniture'));
    }
    async function loadSupplyAdmin(){if(!supplyCategoryCache.length)await loadSupplyCategories();const [ir,sr]=await Promise.all([supabaseClient.from('supply_items').select('*').order('name'),supabaseClient.from('supply_attributes').select('supply_item_id')]);if(ir.error)return;const n={};(sr.data||[]).forEach(x=>n[x.supply_item_id]=(n[x.supply_item_id]||0)+1);window.supplyItemsAdminCache=(ir.data||[]).map(x=>({...x,spec_count:n[x.id]||0}));renderExistingSuppliesList(window.supplyItemsAdminCache);if(supplyAdminList)supplyAdminList.innerHTML='';}
    function syncSupplyFilterReset(){const active=getAdminMultiValues('filter-supply-category').length||getAdminMultiValues('filter-supply-feature').length;const button=document.getElementById('btn-reset-supply-filters');if(button)button.disabled=!active;renderExistingSuppliesList(window.supplyItemsAdminCache||[])}
    document.getElementById('btn-reset-supply-filters')?.addEventListener('click',()=>{adminMultiSelections['filter-supply-category']?.clear();adminMultiSelections['filter-supply-feature']?.clear();syncAdminMultiSelect('filter-supply-category');syncAdminMultiSelect('filter-supply-feature');syncSupplyFilterReset()});
    syncAdminMultiSelect('filter-supply-category');syncAdminMultiSelect('filter-supply-feature');

    supplyAdminForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const id = document.getElementById('supply-item-id').value;
        const payload = {
            name: document.getElementById('supply-item-name').value.trim(),
            category:(supplyCategoryCache.find(c=>String(c.id)===String(document.getElementById('supply-item-category-id').value))?.name||'Fournitures'),
            category_id:Number(document.getElementById('supply-item-category-id').value),
            has_quality:document.getElementById('supply-has-quality').checked,
            has_specs:document.getElementById('supply-has-specs').checked,
            standard_price: Number(document.getElementById('supply-item-standard').value) || 0,
            quality_price: Number(document.getElementById('supply-item-quality').value) || 0,
            is_active: document.getElementById('supply-item-active').checked
        };
        if(!payload.name||!payload.category_id)return alert('Le nom et la catégorie sont obligatoires.');
        const specsError=validateSupplySpecs();if(specsError){setPackDrawerValidationError(specsError);setSupplyTab('spec');return;}
        const request=id?supabaseClient.from('supply_items').update(payload).eq('id',id).select('id').single():supabaseClient.from('supply_items').insert([payload]).select('id').single();
        const {data:savedItem,error}=await request;
        if(error)return alert(error.message);
        try{await saveSupplySpecs(savedItem.id);}catch(specError){console.error(specError);return alert('La fourniture a été enregistrée, mais les spécificités n’ont pas pu être sauvegardées : '+specError.message);}
        closePackDrawerNow();resetSupplyAdminForm();
        await loadSupplyAdmin();
    });
    document.getElementById('pack-drawer-delete')?.addEventListener('click',async()=>{const id=document.getElementById('supply-item-id').value;if(!id||!confirm('Supprimer cette fourniture ?'))return;const {error}=await supabaseClient.from('supply_items').delete().eq('id',id);if(error)return alert(error.message);closePackDrawerNow();resetSupplyAdminForm();await loadSupplyAdmin();});
    ['supply-item-standard','supply-item-quality'].forEach(id=>document.getElementById(id)?.addEventListener('input',updatePackDrawerPrice));
    document.getElementById('cancel-supply-edit')?.addEventListener('click', resetSupplyAdminForm);
    syncSupplyMode();loadSchoolAndLevelCatalogs();loadSupplyCategories();
    loadSupplyAdmin();
});