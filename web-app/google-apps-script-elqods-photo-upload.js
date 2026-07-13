/** Google Apps Script - El Qods photo upload finalizer */
const SUPABASE_URL = "https://jgfkshsizrtwzqsdrhhp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE";
const TARGET_FOLDER_ID = "1t31gMAs_uKhdEZ11UkG3fOC6V3jIsa-ZzPTJuyU-JxIj9dmigVW5tOIJDCWjrZGOlKFAbRwv";

function onFormSubmit(e) {
  const itemResponses = e.response.getItemResponses();
  let reference = "";
  let uploadedFileIds = [];
  itemResponses.forEach(function(itemResponse) {
    const title = String(itemResponse.getItem().getTitle() || "").toLowerCase();
    const type = itemResponse.getItem().getType();
    const value = itemResponse.getResponse();
    if (title.includes("référence") || title.includes("reference") || title.includes("commande")) reference = String(value || "").trim();
    if (type === FormApp.ItemType.FILE_UPLOAD) {
      if (Array.isArray(value)) uploadedFileIds = uploadedFileIds.concat(value);
      else if (value) uploadedFileIds.push(value);
    }
  });
  if (!reference) throw new Error("Référence commande introuvable.");
  if (!uploadedFileIds.length) throw new Error("Aucun fichier uploadé.");
  const targetFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
  const file = DriveApp.getFileById(uploadedFileIds[0]);
  const extMatch = file.getName().match(/\.[^.]+$/);
  const extension = extMatch ? extMatch[0].toLowerCase() : "";
  const newName = reference + extension;
  file.setName(newName);
  targetFolder.addFile(file);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  updateSupabaseOrder(reference, file.getId(), file.getUrl());
}

function updateSupabaseOrder(reference, fileId, fileUrl) {
  const cleanReference = String(reference || "").trim();
  const endpoint = SUPABASE_URL + "/rest/v1/orders?numero_commande=eq." + encodeURIComponent(cleanReference);
  const payload = { status: "new", google_drive_file_id: fileId, google_drive_url: fileUrl, upload_completed: true };
  const response = UrlFetchApp.fetch(endpoint, {
    method: "patch",
    contentType: "application/json",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY, Prefer: "return=representation" },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const body = response.getContentText();
  Logger.log("Supabase PATCH code : " + code);
  Logger.log("Supabase PATCH body : " + body);
  if (code < 200 || code >= 300) throw new Error("Erreur update Supabase " + code + " : " + body);
  const updatedRows = JSON.parse(body || "[]");
  if (!Array.isArray(updatedRows) || updatedRows.length === 0) throw new Error("Aucune commande mise à jour : " + cleanReference);
}
