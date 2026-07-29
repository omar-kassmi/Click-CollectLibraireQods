/** Google Apps Script - El Qods photo upload finalizer */
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZmtzaHNpenJ0d3pxc2RyaGhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA1NDc0NiwiZXhwIjoyMDk3NjMwNzQ2fQ.s4HmBrfjE2bn0JUBW4wHMLXItxHxNIyul1PGmubaL4g";

/** El Qods - Import Drive et archivage des commandes */
const SUPABASE_URL = "https://jgfkshsizrtwzqsdrhhp.supabase.co";
const TARGET_FOLDER_ID = "1t31gMAs_uKhdEZ11UkG3fOC6V3jIsa-ZzPTJuyU-JxIj9dmigVW5tOIJDCWjrZGOlKFAbRwv";
const ARCHIVE_CONFIG_KEY = "ELQODS_ARCHIVE_CONFIG_V3";
const ARCHIVE_LAST_RUN_KEY = "ELQODS_ARCHIVE_LAST_RUN_V3";
const ARCHIVE_TRIGGER_HANDLER = "runScheduledArchive";
const ARCHIVE_RESULT_PREFIX = "ELQODS_ARCHIVE_RESULT_";
const MONTH_NAMES = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
const ARCHIVE_HEADERS = ["archive_key","id_supabase","reference","date_creation","client","telephone","email","statut","paiement","montant_total","date_limite_reservation","mode_retrait","instructions","qr_code","lien_liste_drive","items_json","commande_json","archive_le"];

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === "archivePoll") return archivePollResponse_(p.channel, p.callback);
  return HtmlService.createHtmlOutput("Service El Qods actif.")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  const action = cleanText_(p.action);
  const channel = cleanText_(p.channel);
  let result;
  try {
    if (action === "uploadPersonalList") {
      result = uploadPersonalList({
        reference:p.reference, orderId:p.orderId, successUrl:p.successUrl,
        mimeType:p.mimeType, fileName:p.fileName, fileData:p.fileData
      });
      result.type = "elqods-upload-result";
    } else {
      assertAdmin_(p.adminToken);
      const payload = parseJson_(p.payload, {});
      if (action === "archiveGetConfig") {
        result = {success:true, config:getArchiveConfig_()};
      } else if (action === "archiveSaveConfig") {
        result = {success:true, config:saveArchiveConfig_(payload)};
      } else if (action === "archiveRunNow") {
        const config = saveArchiveConfig_(payload);
        result = {success:true, run:archiveOrders_(config,"manual"), config:getArchiveConfig_()};
      } else if (action === "archiveEnsureTrigger") {
        const config = getArchiveConfig_();
        configureArchiveTrigger_(config);
        result = {success:true, config:getArchiveConfig_()};
      } else {
        throw new Error("Action inconnue : " + action);
      }
      result.type = "elqods-archive-result";
    }
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    result = {
      success:false,
      type:action === "uploadPersonalList" ? "elqods-upload-result" : "elqods-archive-result",
      error:error && error.message ? error.message : String(error)
    };
  }
  result.channel = channel;
  if (channel && result.type === "elqods-archive-result") storeArchiveResult_(channel, result);
  return HtmlService.createHtmlOutput(buildParentResponse_(result))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function storeArchiveResult_(channel, result) {
  CacheService.getScriptCache().put(ARCHIVE_RESULT_PREFIX + channel, JSON.stringify(result), 600);
}

function archivePollResponse_(channel, callback) {
  const safeChannel = cleanText_(channel);
  const safeCallback = /^[A-Za-z_$][\w$\.]*$/.test(String(callback || "")) ? String(callback) : "elqodsArchivePoll";
  let data = {pending:true, channel:safeChannel};
  if (safeChannel) {
    const raw = CacheService.getScriptCache().get(ARCHIVE_RESULT_PREFIX + safeChannel);
    if (raw) {
      data = parseJson_(raw, {pending:true,channel:safeChannel});
      data.pending = false;
      CacheService.getScriptCache().remove(ARCHIVE_RESULT_PREFIX + safeChannel);
    }
  }
  return ContentService.createTextOutput(safeCallback + "(" + JSON.stringify(data).replace(/</g,"\\u003c") + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function uploadPersonalList(data) {
  const reference=cleanText_(data&&data.reference);
  const orderId=cleanText_(data&&data.orderId);
  const successUrl=cleanUrl_(data&&data.successUrl);
  const mime=cleanText_(data&&data.mimeType);
  const originalName=cleanText_(data&&data.fileName);
  const base64=String((data&&data.fileData)||"").split(";base64,").pop();
  const allowed=["image/jpeg","image/png","image/webp","application/pdf"];
  if(!reference) throw new Error("Reference de commande introuvable.");
  if(!successUrl) throw new Error("URL success.html absente.");
  if(!base64) throw new Error("Piece jointe absente.");
  if(allowed.indexOf(mime)===-1) throw new Error("Format non accepte.");
  if(Math.floor(base64.length*3/4)>=10*1024*1024) throw new Error("Le fichier doit etre strictement inferieur a 10 Mo.");
  const extension=({"image/jpeg":".jpg","image/png":".png","image/webp":".webp","application/pdf":".pdf"})[mime]||"";
  const suffix=originalName?"-"+originalName.replace(/\.[^.]+$/,""):"";
  const fileName=(reference+suffix).replace(/[\\/:*?"<>|]+/g,"-")+extension;
  const file=DriveApp.getFolderById(TARGET_FOLDER_ID).createFile(
    Utilities.newBlob(Utilities.base64Decode(base64),mime,fileName)
  );
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  updateSupabaseOrder_(reference,orderId,file.getId(),file.getUrl());
  return {success:true,redirectUrl:successUrl,fileId:file.getId(),fileUrl:file.getUrl()};
}

function updateSupabaseOrder_(reference,orderId,fileId,fileUrl){
  const filter=orderId?"id=eq."+encodeURIComponent(orderId):"numero_commande=eq."+encodeURIComponent(reference);
  const response=UrlFetchApp.fetch(SUPABASE_URL+"/rest/v1/orders?"+filter,{
    method:"patch",
    contentType:"application/json",
    headers:serviceHeaders_("return=representation"),
    payload:JSON.stringify({status:"new",google_drive_file_id:fileId,google_drive_url:fileUrl,upload_completed:true}),
    muteHttpExceptions:true
  });
  const rows=parseSupabaseResponse_(response,"Mise a jour de la commande");
  if(!Array.isArray(rows)||!rows.length) throw new Error("Commande introuvable : "+reference);
  return rows[0];
}

function defaultArchiveConfig_(){
  return {
    enabled:false,
    deleteAfterArchive:false,
    scheduleType:"monthly",
    scheduleValue:1,
    scheduleUnit:"days",
    runHour:2,
    runMinute:0,
    runTime:"02:00",
    scheduleStartedAt:"",
    ageValue:1,
    ageUnit:"months",
    folderUrl:"",
    folderId:"",
    lastRun:{},
    triggerInstalled:false
  };
}

function getArchiveConfig_(){
  const props=PropertiesService.getScriptProperties();
  const config=Object.assign(defaultArchiveConfig_(),parseJson_(props.getProperty(ARCHIVE_CONFIG_KEY),{}));
  config.runHour=Math.max(0,Math.min(23,Number(config.runHour)||0));
  config.runMinute=Math.max(0,Math.min(59,Number(config.runMinute)||0));
  config.runTime=String(config.runHour).padStart(2,"0")+":"+String(config.runMinute).padStart(2,"0");
  config.lastRun=parseJson_(props.getProperty(ARCHIVE_LAST_RUN_KEY),{});
  config.triggerInstalled=ScriptApp.getProjectTriggers().some(function(t){
    return t.getHandlerFunction()===ARCHIVE_TRIGGER_HANDLER;
  });
  return config;
}

function saveArchiveConfig_(input){
  input=input||{};
  const current=getArchiveConfig_();
  const folderUrl=cleanUrl_(input.folderUrl||current.folderUrl);
  const folderId=extractDriveFolderId_(folderUrl||input.folderId||current.folderId);
  if(!folderId) throw new Error("Le lien du dossier Google Drive est invalide.");
  DriveApp.getFolderById(folderId).getName();

  const timeMatch=String(input.runTime||"").match(/^(\d{1,2}):(\d{2})$/);
  const runHour=Math.max(0,Math.min(23,Number(
    input.runHour!=null?input.runHour:(timeMatch?timeMatch[1]:current.runHour)
  )||0));
  const runMinute=Math.max(0,Math.min(59,Number(
    input.runMinute!=null?input.runMinute:(timeMatch?timeMatch[2]:current.runMinute)
  )||0));
  const enabled=input.enabled===true;
  const scheduleType=["daily","weekly","monthly","custom"].indexOf(input.scheduleType)>=0?input.scheduleType:"monthly";
  const scheduleValue=Math.max(1,Number(input.scheduleValue)||1);
  const scheduleUnit=["hours","days","weeks","months"].indexOf(input.scheduleUnit)>=0?input.scheduleUnit:"days";

  const scheduleChanged=
    enabled!==current.enabled ||
    scheduleType!==current.scheduleType ||
    scheduleValue!==Number(current.scheduleValue) ||
    scheduleUnit!==current.scheduleUnit ||
    runHour!==Number(current.runHour) ||
    runMinute!==Number(current.runMinute);

  const config={
    enabled:enabled,
    deleteAfterArchive:input.deleteAfterArchive===true,
    scheduleType:scheduleType,
    scheduleValue:scheduleValue,
    scheduleUnit:scheduleUnit,
    runHour:runHour,
    runMinute:runMinute,
    runTime:String(runHour).padStart(2,"0")+":"+String(runMinute).padStart(2,"0"),
    scheduleStartedAt:(scheduleChanged||!current.scheduleStartedAt)?new Date().toISOString():current.scheduleStartedAt,
    ageValue:Math.max(1,Number(input.ageValue)||1),
    ageUnit:["hours","days","weeks","months"].indexOf(input.ageUnit)>=0?input.ageUnit:"months",
    folderUrl:folderUrl,
    folderId:folderId
  };

  PropertiesService.getScriptProperties().setProperty(ARCHIVE_CONFIG_KEY,JSON.stringify(config));
  configureArchiveTrigger_(config);
  console.log("Configuration archivage : "+JSON.stringify(config));
  return getArchiveConfig_();
}

function configureArchiveTrigger_(config){
  ScriptApp.getProjectTriggers()
    .filter(function(t){return t.getHandlerFunction()===ARCHIVE_TRIGGER_HANDLER;})
    .forEach(function(t){ScriptApp.deleteTrigger(t);});
  if(!config.enabled) return;

  const builder=ScriptApp.newTrigger(ARCHIVE_TRIGGER_HANDLER).timeBased();
  if(config.scheduleType==="custom"&&config.scheduleUnit==="hours"){
    const allowed=[1,2,4,6,8,12];
    builder.everyHours(allowed.indexOf(Number(config.scheduleValue))>=0?Number(config.scheduleValue):1).create();
  } else {
    builder.everyMinutes(1).create();
  }

  if(!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()===ARCHIVE_TRIGGER_HANDLER;})){
    throw new Error("Le declencheur automatique n'a pas pu etre cree.");
  }
}

function authorizeArchiveSystem(){
  assertServiceKey_();
  const response=UrlFetchApp.fetch(SUPABASE_URL+"/rest/v1/orders?select=id&limit=1",{
    method:"get",headers:serviceHeaders_(),muteHttpExceptions:true
  });
  if(response.getResponseCode()<200||response.getResponseCode()>=300){
    throw new Error("Connexion Supabase impossible : "+response.getContentText());
  }
  const testSpreadsheet=SpreadsheetApp.create("EL_QODS_TEST_AUTORISATION");
  const spreadsheetId=testSpreadsheet.getId();
  testSpreadsheet.getSheets()[0].getRange("A1").setValue("Autorisation Google Sheets validee");
  SpreadsheetApp.flush();
  DriveApp.getFileById(spreadsheetId).setTrashed(true);
  ScriptApp.getProjectTriggers();
  const config=getArchiveConfig_();
  if(config.folderId){
    const folder=DriveApp.getFolderById(config.folderId);
    console.log("Dossier d'archivage accessible : "+folder.getName());
  }
  return {success:true,message:"Drive, Sheets, Supabase et declencheurs autorises."};
}

function archiveScheduledMinuteReached_(config,now){
  if(config.scheduleType==="custom"&&config.scheduleUnit==="hours") return true;
  const zone=Session.getScriptTimeZone();
  const currentHour=Number(Utilities.formatDate(now,zone,"H"));
  const currentMinute=Number(Utilities.formatDate(now,zone,"m"));
  const currentTotal=currentHour*60+currentMinute;
  const requestedTotal=(Number(config.runHour)||0)*60+(Number(config.runMinute)||0);
  return currentTotal>=requestedTotal;
}

function runScheduledArchive(){
  const config=getArchiveConfig_();
  const now=new Date();
  const zone=Session.getScriptTimeZone();
  console.log("Declencheur appele a "+Utilities.formatDate(now,zone,"yyyy-MM-dd HH:mm:ss"));
  console.log("Configuration : "+JSON.stringify(config));
  if(!config.enabled){console.log("Ignore : automatisation desactivee.");return;}
  if(!archiveScheduledMinuteReached_(config,now)){console.log("Ignore : heure non atteinte.");return;}
  if(!isArchiveDue_(config,now)){console.log("Ignore : frequence non echue.");return;}
  console.log("Archivage automatique lance.");
  const result=archiveOrders_(config,"automatic");
  console.log("Resultat : "+JSON.stringify(result));
  return result;
}

function isArchiveDue_(config,now){
  const props=PropertiesService.getScriptProperties();
  const last=parseJson_(props.getProperty(ARCHIVE_LAST_RUN_KEY),{});
  const lastDate=last.finishedAt?new Date(last.finishedAt):null;
  const scheduleStart=config.scheduleStartedAt?new Date(config.scheduleStartedAt):null;

  if(!lastDate||isNaN(lastDate.getTime())) return true;
  if(scheduleStart&&!isNaN(scheduleStart.getTime())&&lastDate.getTime()<scheduleStart.getTime()) return true;
  if(config.scheduleType==="daily") return dateKey_(lastDate)!==dateKey_(now);
  if(config.scheduleType==="weekly") return now.getTime()-lastDate.getTime()>=7*24*60*60*1000;
  if(config.scheduleType==="monthly"){
    const nextDate=new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth()+1);
    return now.getTime()>=nextDate.getTime();
  }
  return now.getTime()-lastDate.getTime()>=durationMs_(config.scheduleValue,config.scheduleUnit);
}

function archiveOrders_(config,mode){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(5000)) throw new Error("Un archivage est deja en cours.");
  const started=new Date();
  try{
    if(!config.folderId) throw new Error("Dossier d'archivage non configure.");
    const cutoff=subtractDuration_(started,config.ageValue,config.ageUnit);
    const orders=fetchEligibleOrders_(cutoff);
    if(!orders.length){
      const empty={mode:mode,startedAt:started.toISOString(),finishedAt:new Date().toISOString(),archivedCount:0,deletedCount:0,message:"Aucune commande a archiver.",spreadsheetUrls:[]};
      saveLastArchiveRun_(empty);
      return empty;
    }

    const folder=DriveApp.getFolderById(config.folderId);
    const grouped={};
    orders.forEach(function(order){
      const created=parseDate_(order.created_at||order.inserted_at||started);
      const year=created.getFullYear();
      (grouped[year]||(grouped[year]=[])).push(order);
    });

    const archivedIds=[];
    const spreadsheetUrls=[];
    Object.keys(grouped).sort().forEach(function(yearKey){
      const spreadsheet=getOrCreateYearSpreadsheet_(folder,Number(yearKey));
      spreadsheetUrls.push(spreadsheet.getUrl());
      const byMonth={};
      grouped[yearKey].forEach(function(order){
        const created=parseDate_(order.created_at||order.inserted_at||started);
        const month=created.getMonth();
        const sheet=spreadsheet.getSheetByName(MONTH_NAMES[month]);
        if(!byMonth[month]) byMonth[month]=existingArchiveKeys_(sheet);
        const key=String(order.id||order.numero_commande||"");
        if(!key) return;
        if(!byMonth[month].has(key)){
          sheet.appendRow(orderArchiveRow_(order,started));
          byMonth[month].add(key);
        }
        archivedIds.push(order.id);
      });
    });

    SpreadsheetApp.flush();
    const deletedCount=config.deleteAfterArchive&&archivedIds.length?deleteArchivedOrders_(archivedIds):0;
    const run={
      mode:mode,
      startedAt:started.toISOString(),
      finishedAt:new Date().toISOString(),
      archivedCount:archivedIds.length,
      deletedCount:deletedCount,
      message:archivedIds.length+" commande(s) archivee(s)"+(config.deleteAfterArchive?" et "+deletedCount+" supprimee(s) de Supabase.":"."),
      spreadsheetUrls:Array.from(new Set(spreadsheetUrls))
    };
    saveLastArchiveRun_(run);
    return run;
  }catch(error){
    saveLastArchiveRun_({mode:mode,startedAt:started.toISOString(),finishedAt:new Date().toISOString(),archivedCount:0,deletedCount:0,message:"Echec : "+error.message,spreadsheetUrls:[]});
    throw error;
  }finally{
    lock.releaseLock();
  }
}

function fetchEligibleOrders_(cutoff){
  let all=[],offset=0,limit=1000;
  while(true){
    const url=SUPABASE_URL+"/rest/v1/orders?select=*&created_at=lte."+encodeURIComponent(cutoff.toISOString())+"&order=created_at.asc&limit="+limit+"&offset="+offset;
    const rows=parseSupabaseResponse_(UrlFetchApp.fetch(url,{method:"get",headers:serviceHeaders_(),muteHttpExceptions:true}),"Lecture des commandes");
    all=all.concat(rows);
    if(rows.length<limit) break;
    offset+=limit;
  }
  return all;
}

function getOrCreateYearSpreadsheet_(folder,year){
  const name="commandes_annee_"+year;
  const files=folder.getFilesByName(name);
  let spreadsheet;
  if(files.hasNext()) spreadsheet=SpreadsheetApp.openById(files.next().getId());
  else{
    spreadsheet=SpreadsheetApp.create(name);
    DriveApp.getFileById(spreadsheet.getId()).moveTo(folder);
  }
  ensureMonthlySheets_(spreadsheet);
  return spreadsheet;
}

function ensureMonthlySheets_(spreadsheet){
  MONTH_NAMES.forEach(function(name,index){
    let sheet=spreadsheet.getSheetByName(name);
    if(!sheet) sheet=spreadsheet.insertSheet(name,index);
    if(sheet.getLastRow()===0){
      sheet.getRange(1,1,1,ARCHIVE_HEADERS.length).setValues([ARCHIVE_HEADERS]);
      sheet.setFrozenRows(1);
      sheet.getRange(1,1,1,ARCHIVE_HEADERS.length).setFontWeight("bold").setBackground("#E75C25").setFontColor("#FFFFFF");
    }
  });
  spreadsheet.getSheets().forEach(function(sheet){
    if(MONTH_NAMES.indexOf(sheet.getName())===-1&&spreadsheet.getSheets().length>12) spreadsheet.deleteSheet(sheet);
  });
}

function existingArchiveKeys_(sheet){
  const last=sheet.getLastRow();
  return last<2?new Set():new Set(sheet.getRange(2,1,last-1,1).getDisplayValues().flat().filter(Boolean));
}

function orderArchiveRow_(o,a){
  return [
    String(o.id||o.numero_commande||""),o.id||"",o.numero_commande||"",
    o.created_at||o.inserted_at||"",o.client_name||"",o.client_phone||"",
    o.client_email||"",o.status||"",o.payment_status||"",Number(o.total_amount)||0,
    o.reservation_deadline||"",o.fulfillment_method||o.delivery_method||o.delivery_type||"",
    o.order_instructions||"",o.qr_code||"",o.google_drive_url||"",
    safeJson_(o.items),safeJson_(o),a.toISOString()
  ];
}

function deleteArchivedOrders_(ids){
  let deleted=0;
  chunk_(ids.filter(Boolean),80).forEach(function(part){
    const nums=part.map(Number).filter(Number.isFinite);
    if(!nums.length) return;
    const filter="("+nums.join(",")+")";
    const hist=UrlFetchApp.fetch(SUPABASE_URL+"/rest/v1/order_history?order_id=in."+encodeURIComponent(filter),{
      method:"delete",headers:serviceHeaders_(),muteHttpExceptions:true
    });
    if(hist.getResponseCode()>=300&&hist.getResponseCode()!==404){
      throw new Error("Suppression historique impossible : "+hist.getContentText());
    }
    const rows=parseSupabaseResponse_(UrlFetchApp.fetch(SUPABASE_URL+"/rest/v1/orders?id=in."+encodeURIComponent(filter),{
      method:"delete",headers:serviceHeaders_("return=representation"),muteHttpExceptions:true
    }),"Suppression des commandes");
    deleted+=Array.isArray(rows)?rows.length:nums.length;
  });
  return deleted;
}

function assertAdmin_(token){
  if(!token) throw new Error("Session administrateur absente.");
  const response=UrlFetchApp.fetch(SUPABASE_URL+"/auth/v1/user",{
    method:"get",
    headers:{apikey:getAnonKey_(),Authorization:"Bearer "+token},
    muteHttpExceptions:true
  });
  if(response.getResponseCode()<200||response.getResponseCode()>=300){
    throw new Error("Session administrateur invalide ou expiree : "+response.getContentText());
  }
  const user=parseJson_(response.getContentText(),{});
  if(!user.id) throw new Error("Utilisateur Supabase non reconnu.");
  return user;
}

function getServiceRoleKey_(){
  return PropertiesService.getScriptProperties().getProperty("SUPABASE_SERVICE_ROLE_KEY")||"";
}
function getAnonKey_(){
  return PropertiesService.getScriptProperties().getProperty("SUPABASE_ANON_KEY")||getServiceRoleKey_();
}
function assertServiceKey_(){
  if(!getServiceRoleKey_()) throw new Error("SUPABASE_SERVICE_ROLE_KEY non configuree dans les proprietes du script.");
}
function serviceHeaders_(prefer){
  assertServiceKey_();
  const key=getServiceRoleKey_();
  const h={apikey:key,Authorization:"Bearer "+key};
  if(prefer) h.Prefer=prefer;
  return h;
}
function parseSupabaseResponse_(response,label){
  const code=response.getResponseCode();
  const body=response.getContentText();
  if(code<200||code>=300) throw new Error(label+" - Supabase "+code+" : "+body);
  return parseJson_(body,[]);
}

function buildParentResponse_(result){
  const json=JSON.stringify(result).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
  return '<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){var m='+json+';function s(){try{window.parent.postMessage(m,"*")}catch(e){}try{window.top.postMessage(m,"*")}catch(e){}}s();setTimeout(s,250);setTimeout(s,750);})();<\/script></body></html>';
}

function extractDriveFolderId_(v){
  const s=String(v||"");
  const m=s.match(/\/folders\/([a-zA-Z0-9_-]+)/)||s.match(/^([a-zA-Z0-9_-]{20,})$/);
  return m?m[1]:"";
}
function subtractDuration_(d,v,u){
  const r=new Date(d);
  v=Math.max(1,Number(v)||1);
  if(u==="months") r.setMonth(r.getMonth()-v);
  else r.setTime(r.getTime()-durationMs_(v,u));
  return r;
}
function durationMs_(v,u){
  const h=3600000;
  if(u==="hours") return v*h;
  if(u==="weeks") return v*7*24*h;
  if(u==="months") return v*30*24*h;
  return v*24*h;
}
function parseDate_(v){
  const d=v instanceof Date?v:new Date(v);
  return isNaN(d.getTime())?new Date():d;
}
function dateKey_(d){return Utilities.formatDate(d,Session.getScriptTimeZone(),"yyyy-MM-dd");}
function monthKey_(d){return Utilities.formatDate(d,Session.getScriptTimeZone(),"yyyy-MM");}
function weekKey_(d){return Utilities.formatDate(d,Session.getScriptTimeZone(),"YYYY-ww");}
function saveLastArchiveRun_(r){
  PropertiesService.getScriptProperties().setProperty(ARCHIVE_LAST_RUN_KEY,JSON.stringify(r));
}
function chunk_(a,s){
  const o=[];
  for(let i=0;i<a.length;i+=s) o.push(a.slice(i,i+s));
  return o;
}
function safeJson_(v){
  try{return JSON.stringify(v==null?null:v);}catch(_){return String(v||"");}
}
function parseJson_(v,f){
  try{return typeof v==="string"?JSON.parse(v):v||f;}catch(_){return f;}
}
function cleanText_(v){return String(v||"").trim().substring(0,1000);}
function cleanUrl_(v){
  const u=String(v||"").trim();
  return /^https?:\/\//i.test(u)?u:"";
}
