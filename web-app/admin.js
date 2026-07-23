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
    function printOrder(id){
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
            return `<tr><td class="check"><span></span></td><td class="num">${index+1}</td><td class="article">${escapeHtml(item.name||'Article')}</td><td class="qty">${quantity}</td><td class="price">${unit.toFixed(2)}</td><td class="line-total">${(unit*quantity).toFixed(2)}</td></tr>`;
        }).join('');
        const qrValue=encodeURIComponent(String(order.qr_payload||order.qr_code||order.numero_commande||order.id||''));
        const printWindow=window.open('','_blank','width=760,height=900');
        if(!printWindow)return alert('Autorisez les popups pour imprimer le bon de commande.');
        printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Bon A5 - ${reference}</title><style>
            @page{size:A5 portrait;margin:7mm}
            *{box-sizing:border-box}
            html,body{margin:0;padding:0;background:#fff;color:#1c1917;font-family:Aptos,"Segoe UI",Arial,sans-serif;font-size:9.4pt;line-height:1.25;-webkit-print-color-adjust:exact;print-color-adjust:exact}
            .sheet{width:100%;min-height:196mm;position:relative;padding-bottom:3mm}
            .top{display:grid;grid-template-columns:1fr auto;gap:7mm;align-items:start;border-bottom:2px solid #e75c25;padding-bottom:4mm}
            .brand{display:flex;gap:3mm;align-items:center}.brand img{width:17mm;height:17mm;object-fit:contain}.brand h1{margin:0;color:#e75c25;font-size:15pt;line-height:1}.brand p{margin:1.5mm 0 0;color:#78716c;font-size:7.8pt}
            .ref{text-align:right}.ref small{display:block;color:#a8a29e;font-weight:700;text-transform:uppercase;font-size:6.8pt;letter-spacing:.08em}.ref strong{display:block;color:#e75c25;font-size:13pt;white-space:nowrap}.ref time{display:block;margin-top:1mm;color:#57534e;font-size:7.5pt}
            .info{display:grid;grid-template-columns:1fr 1fr;gap:1.7mm 5mm;padding:3mm;border:1px solid #e7e5e4;border-radius:3mm;background:#fffdfb}.field{display:grid;grid-template-columns:29mm 1fr;gap:2mm}.field b{font-size:7.4pt;color:#78716c}.field span{font-weight:700;overflow-wrap:anywhere}.wide{grid-column:1/-1}
            table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:3mm;break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th{padding:1.7mm 1mm;border-top:1.2px solid #57534e;border-bottom:1.2px solid #57534e;text-align:left;font-size:7.2pt;color:#57534e}td{padding:1.65mm 1mm;border-bottom:.5px solid #d6d3d1;vertical-align:middle;font-size:8pt}.check{width:7mm}.check span{display:block;width:3.6mm;height:3.6mm;border:1px solid #57534e}.num{width:7mm;text-align:center;color:#78716c}.article{width:auto;font-weight:650}.qty{width:12mm;text-align:center;font-weight:800}.price,.line-total{width:18mm;text-align:right;font-variant-numeric:tabular-nums}.line-total{font-weight:800}
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
        </main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350));</script></body></html>`);
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
        const selectedSchoolRows=schoolItems.map((item,i)=>`<div class="drawer-item"><span><b>${i+1}. ${escapeHtml(item.name||item.label||'Article')}</b><small>${escapeHtml(item.category||'Liste scolaire')}</small></span><span class="drawer-item-price">${money(item.price)}</span></div>`).join('');
        const unselectedSchoolRows=unselectedSchoolItems.map((item,i)=>`<div class="drawer-item drawer-item-unselected"><span><b>${schoolItems.length+i+1}. ${escapeHtml(item.name||item.label||'Article')}</b><small>${escapeHtml(item.category||'Liste scolaire')}</small></span><span class="drawer-item-actions"><span class="drawer-unselected-chip">Non sélectionné</span><span class="drawer-item-price">${money(item.price)}</span></span></div>`).join('');
        const schoolRows=(selectedSchoolRows+unselectedSchoolRows)||'<div class="drawer-empty">Aucun article de liste officielle.</div>';
        const supplyRows=supplyItems.length?supplyItems.map((item,i)=>`<div class="drawer-item"><span><b>${i+1}. ${escapeHtml(item.name||'Fourniture')}</b><small>${escapeHtml(item.category||'Fournitures')} · ${String(item.supply_range||'standard').toLowerCase()==='quality'?'Qualité':'Standard'}</small></span><span class="drawer-item-price">${money(item.price)}</span></div>`).join(''):'<div class="drawer-empty">Aucune fourniture complémentaire sélectionnée.</div>';
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

    function renderOrdersTable(){const tb=document.getElementById('table-orders-body'),f=getFilteredOrders(),pages=Math.max(1,Math.ceil(f.length/ORDERS_PER_PAGE));if(currentOrdersPage>pages)currentOrdersPage=pages;const os=f.slice((currentOrdersPage-1)*ORDERS_PER_PAGE,currentOrdersPage*ORDERS_PER_PAGE);if(!tb)return;const table=tb.closest('table');table?.classList.add('admin-orders-v2');const tableCard=table?.parentElement;tableCard?.classList.add('orders-table-card','admin-orders-v2-wrap');const hr=table?.querySelector('thead tr');if(hr)hr.innerHTML='<th>Commande</th><th>Client</th><th>Téléphone</th><th>Contenu</th><th>Statut</th><th>Paiement</th><th>Échéance</th><th class="text-right">Actions</th>';renderOrdersPagination(f.length,pages);if(!os.length){tb.innerHTML='<tr><td colspan="8" class="p-6 text-center text-gray-400">Aucune commande.</td></tr>';return}tb.innerHTML=os.map(o=>{const st=normalizeStatus(o.status),it=parseItems(o.items),d=getDeadline(o),photo=it.find(a=>a.type==='photo_upload'||a.url||a.photo_url)||o.google_drive_url,content=photo?`<button type="button" class="imported-list-link" data-id="${o.id}" title="Afficher l’image importée"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>Liste importée</button>`:`${it.length} articles`;return `<tr class="order-v2" data-id="${o.id}" tabindex="0"><td><b class="text-[#E75C25]">#${escapeHtml(o.numero_commande||o.id)}</b></td><td><b>${escapeHtml(o.client_name||'-')}</b><span class="sub">${escapeHtml(o.client_email||'-')}</span></td><td>${escapeHtml(o.client_phone||'-')}</td><td><b>${content}</b><span class="sub">${money(orderTotal(o))}</span></td><td>${chip(o.id,'status',st)}</td><td>${chip(o.id,'payment',o.payment_status||'unpaid')}</td><td class="text-xs text-stone-500">${d.toLocaleDateString('fr-FR')} (${daysUntil(d)}j)</td><td><div class="acts"><button class="act wa notify" data-id="${o.id}" title="Envoyer un message WhatsApp" aria-label="Envoyer un message WhatsApp"><svg class="wa-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2a9.84 9.84 0 0 0-8.43 14.9L2 22l5.23-1.55A9.98 9.98 0 1 0 12.04 2Zm0 17.98a8.08 8.08 0 0 1-4.12-1.13l-.3-.18-3.1.92.93-3.02-.2-.31A7.86 7.86 0 0 1 4 12.02a8.03 8.03 0 1 1 8.04 7.96Zm4.43-6.03c-.24-.12-1.44-.7-1.66-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.2-.72-.63-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.29-.74-1.77-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.57 4.1 3.6.57.24 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"/></svg></button><button class="act pr print" data-id="${o.id}" title="Imprimer"><svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/></svg></button><button class="act del delete" data-id="${o.id}" title="Supprimer"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></svg></button></div></td></tr>`}).join('');tb.querySelectorAll('.order-v2').forEach(r=>r.onclick=e=>{if(!e.target.closest('button'))openOrder(r.dataset.id)});tb.querySelectorAll('.imported-list-link').forEach(button=>button.onclick=event=>{event.stopPropagation();openImportedListPreview(button.dataset.id)});bindChips(tb);tb.querySelectorAll('.notify').forEach(x=>x.onclick=e=>{e.stopPropagation();openWhatsappDialog(x.dataset.id)});tb.querySelectorAll('.print').forEach(x=>x.onclick=e=>{e.stopPropagation();printOrder(x.dataset.id)});tb.querySelectorAll('.delete').forEach(x=>x.onclick=e=>{e.stopPropagation();openDeleteOrderDialog(x.dataset.id)})}

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

    document.getElementById('btn-refresh-orders')?.addEventListener('click', loadOrders);
    document.getElementById('orders-search')?.addEventListener('input', () => { currentOrdersPage = 1; renderOrdersTable(); });
    const orderFilterRoot=document.getElementById('orders-multifilter'),orderFilterMenu=document.getElementById('orders-multifilter-menu');
    document.getElementById('orders-multifilter-toggle')?.addEventListener('click',event=>{event.stopPropagation();const opening=orderFilterMenu?.classList.contains('hidden');closeOrderMultiFilter();if(opening){orderFilterMenu?.classList.remove('hidden');orderFilterRoot?.classList.add('is-open');event.currentTarget.setAttribute('aria-expanded','true')}});
    orderFilterMenu?.addEventListener('change',event=>{const input=event.target.closest('input[type="checkbox"]');if(!input)return;const [group,value]=String(input.value||'').split(':'),set=group==='status'?selectedOrderStatuses:selectedOrderPayments;if(input.checked)set.add(value);else{if(group==='payment'&&selectedOrderPayments.size===1&&selectedOrderPayments.has(value)){input.checked=true;return}set.delete(value)}applyOrderMultiFilter()});
    document.getElementById('orders-filter-all')?.addEventListener('click',event=>{event.preventDefault();ORDER_STATUS_FILTER_VALUES.forEach(v=>selectedOrderStatuses.add(v));ORDER_PAYMENT_FILTER_VALUES.forEach(v=>selectedOrderPayments.add(v));applyOrderMultiFilter()});
    document.getElementById('orders-filter-none')?.addEventListener('click',event=>{event.preventDefault();selectedOrderStatuses.clear();selectedOrderPayments.clear();ORDER_PAYMENT_FILTER_VALUES.forEach(v=>selectedOrderPayments.add(v));applyOrderMultiFilter()});
    document.addEventListener('pointerdown',event=>{if(!event.target.closest('#orders-multifilter'))closeOrderMultiFilter()});window.addEventListener('scroll',closeOrderMultiFilter,true);window.addEventListener('resize',closeOrderMultiFilter);document.addEventListener('keydown',event=>{if(event.key==='Escape')closeOrderMultiFilter()});syncOrderMultiFilter();
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
            if (setting.key === 'delivery_enabled') document.getElementById('set-delivery-enabled').value = setting.value;
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
        if (levels.includes(selectedLevel)) levelSelect.value = selectedLevel;
    }
    function renderFilteredSchoolLists() {
        const container = document.getElementById('config-lists-container');
        const schoolFilter = normalizeSchoolListFilterValue(document.getElementById('filter-school-lists-school')?.value);
        const levelFilter = normalizeSchoolListFilterValue(document.getElementById('filter-school-lists-level')?.value);
        const source = window.schoolListsCache || [];
        const filtered = source.filter(list => (!schoolFilter || normalizeSchoolListFilterValue(list.school_name) === schoolFilter) && (!levelFilter || normalizeSchoolListFilterValue(list.level) === levelFilter));
        const count = document.getElementById('school-lists-filter-count');
        if (count) count.textContent = `${filtered.length} pack${filtered.length > 1 ? 's' : ''} affiché${filtered.length > 1 ? 's' : ''} sur ${source.length}`;
        document.getElementById('btn-reset-school-list-filters')?.classList.toggle('hidden', !schoolFilter && !levelFilter);
        if (!filtered.length) { container.innerHTML = '<div class="sm:col-span-2 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center"><p class="text-sm font-bold text-gray-700">Aucun pack ne correspond aux filtres.</p></div>'; return; }
        container.innerHTML = filtered.map(list => { const items=parseSchoolListItems(list.items), out=items.filter(x=>x.availability==='out_of_stock').length; return `<div class="bg-white p-5 rounded-2xl border flex flex-col justify-between shadow-sm"><div class="flex items-start justify-between gap-4"><div class="flex items-start gap-3">${list.school_logo_url ? (() => { const candidates=adminSchoolLogoCandidates(list.school_logo_url), initial=escapeHtml(String(list.school_name||'E').trim().charAt(0).toUpperCase()||'E'); return `<span class="shrink-0 w-11 h-11 rounded-xl border border-gray-200 bg-white p-1.5 flex items-center justify-center overflow-hidden"><img src="${escapeHtml(candidates[0]||'')}" data-logo-candidates="${escapeHtml(JSON.stringify(candidates))}" data-logo-index="0" alt="" class="max-w-full max-h-full object-contain" onerror="retryAdminSchoolLogo(this)"><span class="hidden w-full h-full rounded-lg bg-orange-50 text-[#E75C25] font-black items-center justify-center">${initial}</span></span>`; })() : ''}<div><span class="text-xs font-bold text-[#E75C25] uppercase">${escapeHtml(list.school_name)}</span><h4 class="text-base font-bold text-gray-900">Classe : ${escapeHtml(list.level)}</h4><p class="text-xs text-stone-400 mt-1">${items.length} articles configurés · ${out} rupture</p></div></div><button type="button" class="btn-edit-list text-gray-400 hover:text-[#E75C25]" data-id="${list.id}">✎</button></div><div class="flex items-center gap-4 mt-4"><button class="btn-edit-list text-xs font-semibold text-[#E75C25]" data-id="${list.id}">Modifier</button><button class="btn-delete-list text-xs font-semibold text-red-600" data-id="${list.id}">Supprimer</button></div></div>`; }).join('');
        container.querySelectorAll('.btn-edit-list').forEach(b=>b.onclick=()=>startEditSchoolList(b.dataset.id));
        container.querySelectorAll('.btn-delete-list').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer ce pack ?'))return;await supabaseClient.from('school_lists').delete().eq('id',b.dataset.id);loadSchoolLists();});
    }
    document.getElementById('filter-school-lists-school')?.addEventListener('change', renderFilteredSchoolLists);
    document.getElementById('filter-school-lists-level')?.addEventListener('change', renderFilteredSchoolLists);
    document.getElementById('btn-reset-school-list-filters')?.addEventListener('click',()=>{document.getElementById('filter-school-lists-school').value='';document.getElementById('filter-school-lists-level').value='';renderFilteredSchoolLists();});

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
            supplyAdminForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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