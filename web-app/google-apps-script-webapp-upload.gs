/**
 * Apps Script Web App - El Qods Upload Photo
 * Gratuit dans les quotas Apps Script / Drive du compte Google.
 *
 * Installation:
 * 1. Créer un projet sur https://script.google.com/home
 * 2. Coller ce fichier dans Code.gs
 * 3. Remplacer SUPABASE_SERVICE_ROLE_KEY par votre clé service_role Supabase
 * 4. Déployer > Nouveau déploiement > Application Web
 *    - Exécuter en tant que: Moi
 *    - Qui a accès: Tout le monde
 * 5. Copier l'URL /exec dans app.js: APP_SCRIPT_UPLOAD_WEBAPP_URL
 */
const SUPABASE_URL = "https://jgfkshsizrtwzqsdrhhp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE";
const TARGET_FOLDER_ID = "1t31gMAs_uKhdEZ11UkG3fOC6V3jIsa-ZzPTJuyU-JxIj9dmigVW5tOIJDCWjrZGOlKFAbRwv";

function doGet(e) {
  const t = HtmlService.createTemplate(UPLOAD_PAGE_HTML);
  t.orderId = e.parameter.order_id || "";
  t.reference = e.parameter.reference || "";
  t.clientName = e.parameter.name || "";
  t.phone = e.parameter.phone || "";
  t.email = e.parameter.email || "";
  t.successUrl = e.parameter.success_url || "";
  return t.evaluate()
    .setTitle("Import liste - El Qods")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function uploadPhoto(payload) {
  const reference = String(payload.reference || "").trim();
  const orderId = String(payload.orderId || "").trim();
  if (!reference) throw new Error("Référence commande manquante.");
  if (!payload.fileData || !payload.fileName || !payload.mimeType) throw new Error("Fichier manquant.");

  const bytes = Utilities.base64Decode(String(payload.fileData).split(',').pop());
  const blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName);
  const extMatch = payload.fileName.match(/\.[^.]+$/);
  const extension = extMatch ? extMatch[0].toLowerCase() : guessExtension(payload.mimeType);
  const finalName = reference + extension;

  const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  const file = folder.createFile(blob).setName(finalName);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  updateSupabaseOrder(orderId, reference, file.getId(), file.getUrl());
  return { ok: true, fileUrl: file.getUrl(), redirectUrl: payload.successUrl };
}

function guessExtension(mimeType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/heic") return ".heic";
  return ".jpg";
}

function updateSupabaseOrder(orderId, reference, fileId, fileUrl) {
  const cleanOrderId = String(orderId || "").trim();
  const cleanReference = String(reference || "").trim();
  const endpoint = cleanOrderId
    ? SUPABASE_URL + "/rest/v1/orders?id=eq." + encodeURIComponent(cleanOrderId)
    : SUPABASE_URL + "/rest/v1/orders?numero_commande=eq." + encodeURIComponent(cleanReference);

  const payload = {
    status: "new",
    google_drive_file_id: fileId,
    google_drive_url: fileUrl,
    upload_completed: true
  };

  const response = UrlFetchApp.fetch(endpoint, {
    method: "patch",
    contentType: "application/json",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      Prefer: "return=representation"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) throw new Error("Erreur update Supabase " + code + " : " + body);
  const rows = JSON.parse(body || "[]");
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Aucune commande mise à jour: " + cleanOrderId + " / " + cleanReference);
}

const UPLOAD_PAGE_HTML = `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Import liste El Qods</title>
</head>
<body class="bg-[#F7F4EF] min-h-screen flex items-center justify-center p-5 text-stone-900">
  <main class="bg-white rounded-3xl shadow-xl border border-stone-200 max-w-md w-full p-7 space-y-5">
    <div class="text-center space-y-1">
      <div class="text-4xl">📸</div>
      <h1 class="text-xl font-black text-[#E75C25]">Importer votre liste</h1>
      <p class="text-xs text-stone-500">Commande <b><?= reference ?></b></p>
    </div>

    <div class="bg-stone-50 border border-stone-100 rounded-2xl p-4 text-xs space-y-1">
      <p><b>Nom :</b> <?= clientName ?></p>
      <p><b>Téléphone :</b> <?= phone ?></p>
      <p><b>Email :</b> <?= email ?></p>
    </div>

    <label class="block border border-dashed border-orange-200 bg-orange-50/40 hover:bg-orange-50 rounded-2xl p-6 text-center cursor-pointer transition">
      <span class="block text-3xl mb-2">🖼️</span>
      <span id="file-label" class="text-sm font-bold text-stone-700">Choisir la photo de la liste</span>
      <input id="photo" type="file" accept="image/*" class="hidden">
    </label>

    <button id="submit" type="button" class="w-full bg-[#E75C25] hover:bg-[#CE4E1D] text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed">Envoyer ma liste</button>
    <p id="msg" class="hidden text-xs rounded-xl p-3"></p>
  </main>

  <script>
    const orderId = '<?= orderId ?>';
    const reference = '<?= reference ?>';
    const successUrl = '<?= successUrl ?>';
    const input = document.getElementById('photo');
    const label = document.getElementById('file-label');
    const btn = document.getElementById('submit');
    const msg = document.getElementById('msg');
    let selectedFile = null;

    input.addEventListener('change', () => {
      selectedFile = input.files && input.files[0] ? input.files[0] : null;
      label.textContent = selectedFile ? selectedFile.name : 'Choisir la photo de la liste';
    });

    function showMessage(text, error) {
      msg.classList.remove('hidden');
      msg.className = error ? 'text-xs rounded-xl p-3 bg-red-50 text-red-700 border border-red-100' : 'text-xs rounded-xl p-3 bg-emerald-50 text-emerald-700 border border-emerald-100';
      msg.textContent = text;
    }

    btn.addEventListener('click', () => {
      if (!selectedFile) { showMessage('Veuillez choisir une photo.', true); return; }
      btn.disabled = true;
      btn.textContent = 'Envoi en cours...';
      const reader = new FileReader();
      reader.onload = () => {
        google.script.run
          .withSuccessHandler((res) => {
            showMessage('Liste envoyée avec succès. Redirection...', false);
            window.location.href = (res && res.redirectUrl) ? res.redirectUrl : successUrl;
          })
          .withFailureHandler((err) => {
            btn.disabled = false;
            btn.textContent = 'Envoyer ma liste';
            showMessage(err && err.message ? err.message : 'Erreur pendant l’envoi.', true);
          })
          .uploadPhoto({
            orderId,
            reference,
            successUrl,
            fileName: selectedFile.name,
            mimeType: selectedFile.type || 'image/jpeg',
            fileData: reader.result
          });
      };
      reader.readAsDataURL(selectedFile);
    });
  </script>
</body>
</html>
`;
