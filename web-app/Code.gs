/** Google Apps Script - El Qods photo upload finalizer */
const SUPABASE_URL = "https://jgfkshsizrtwzqsdrhhp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "COLLER_ICI_LA_CLE_SERVICE_ROLE";
const TARGET_FOLDER_ID = "1t31gMAs_uKhdEZ11UkG3fOC6V3jIsa-ZzPTJuyU-JxIj9dmigVW5tOIJDCWjrZGOlKFAbRwv";

function doGet(e) {
  return HtmlService.createHtmlOutput("Service d'import El Qods actif.")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  const channel = cleanText_(p.channel);
  let result;
  try {
    if (cleanText_(p.action) !== "uploadPersonalList") throw new Error("Action inconnue.");
    result = uploadPersonalList({
      reference: p.reference,
      orderId: p.orderId,
      successUrl: p.successUrl,
      mimeType: p.mimeType,
      fileName: p.fileName,
      fileData: p.fileData
    });
  } catch (error) {
    result = { success: false, error: error && error.message ? error.message : String(error) };
  }
  result.channel = channel;
  return HtmlService.createHtmlOutput(buildParentResponse_(result))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function uploadPersonalList(data) {
  const reference = cleanText_(data && data.reference);
  const orderId = cleanText_(data && data.orderId);
  const successUrl = cleanUrl_(data && data.successUrl);
  const mime = cleanText_(data && data.mimeType);
  const originalName = cleanText_(data && data.fileName);
  const base64 = String((data && data.fileData) || "").split(";base64,").pop();
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!reference) throw new Error("Référence de commande introuvable.");
  if (!successUrl) throw new Error("URL success.html absente.");
  if (!base64) throw new Error("Pièce jointe absente.");
  if (allowed.indexOf(mime) === -1) throw new Error("Format non accepté.");
  if (Math.floor(base64.length * 3 / 4) >= 10 * 1024 * 1024) throw new Error("Le fichier doit être strictement inférieur à 10 Mo.");

  const extension = ({"image/jpeg":".jpg","image/png":".png","image/webp":".webp","application/pdf":".pdf"})[mime] || "";
  const suffix = originalName ? "-" + originalName.replace(/\.[^.]+$/, "") : "";
  const fileName = (reference + suffix).replace(/[\\/:*?"<>|]+/g, "-") + extension;
  const file = DriveApp.getFolderById(TARGET_FOLDER_ID)
    .createFile(Utilities.newBlob(Utilities.base64Decode(base64), mime, fileName));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  updateSupabaseOrder_(reference, orderId, file.getId(), file.getUrl());
  return { success: true, redirectUrl: successUrl, fileId: file.getId(), fileUrl: file.getUrl() };
}

function updateSupabaseOrder_(reference, orderId, fileId, fileUrl) {
  const key = SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key === "COLLER_ICI_LA_CLE_SERVICE_ROLE") throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurée.");
  const filter = orderId ? "id=eq." + encodeURIComponent(orderId) : "numero_commande=eq." + encodeURIComponent(reference);
  const response = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/orders?" + filter, {
    method: "patch",
    contentType: "application/json",
    headers: { apikey: key, Authorization: "Bearer " + key, Prefer: "return=representation" },
    payload: JSON.stringify({ status:"new", google_drive_file_id:fileId, google_drive_url:fileUrl, upload_completed:true }),
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) throw new Error("Erreur Supabase " + code + " : " + body);
  const rows = JSON.parse(body || "[]");
  if (!Array.isArray(rows) || !rows.length) throw new Error("Commande introuvable : " + reference);
  return rows[0];
}

function buildParentResponse_(result) {
  const json = JSON.stringify({ type:"elqods-upload-result", channel:result.channel || "", success:!!result.success, redirectUrl:result.redirectUrl || "", fileId:result.fileId || "", fileUrl:result.fileUrl || "", error:result.error || "" })
    .replace(/</g, "\\u003c");
  return '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    '(function(){var m=' + json + ';' +
    'try{window.parent.postMessage(m,"*")}catch(e){}' +
    'try{window.top.postMessage(m,"*")}catch(e){}' +
    'setTimeout(function(){try{window.parent.postMessage(m,"*")}catch(e){}try{window.top.postMessage(m,"*")}catch(e){}},300);' +
    '})();<\/script></body></html>';
}
function cleanText_(v){return String(v||"").trim().substring(0,1000)}
function cleanUrl_(v){const u=String(v||"").trim();return /^https?:\/\//i.test(u)?u:""}
