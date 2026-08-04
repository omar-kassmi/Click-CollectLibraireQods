const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function isLocalOrigin(origin) {
  return origin === "null" || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function corsHeaders(request, env) {
  const origin = (request.headers.get("Origin") || "").replace(/\/$/, "");
  const configured = allowedOrigins(env);
  const allowLocal = String(env.ALLOW_LOCAL_DEV ?? "true").toLowerCase() !== "false";
  const accepted = Boolean(origin) && (
    configured.includes(origin) ||
    (allowLocal && isLocalOrigin(origin)) ||
    configured.includes("*")
  );

  return {
    "Access-Control-Allow-Origin": accepted ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Expose-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8", ...headers }
  });
}

function cleanFileName(value) {
  const extension = String(value || "").toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/)?.[0] || "";
  const base = String(value || "image")
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${base || "image"}${extension}`;
}

async function verifySupabaseUser(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: env.SUPABASE_ANON_KEY }
  });
  return response.ok ? response.json() : null;
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (!headers["Access-Control-Allow-Origin"]) {
        return json({ success: false, error: `Origine non autorisee : ${origin || "origine absente"}.` }, 403, headers);
      }
      return new Response(null, { status: 204, headers });
    }

    if (!headers["Access-Control-Allow-Origin"]) {
      return json({ success: false, error: `Origine non autorisee : ${origin || "origine absente"}.` }, 403, headers);
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/upload") {
      return json({ success: false, error: "Route introuvable." }, 404, headers);
    }

    try {
      const user = await verifySupabaseUser(request, env);
      if (!user?.id) return json({ success: false, error: "Session administrateur invalide." }, 401, headers);

      const allowedEmails = String(env.ADMIN_EMAILS || "")
        .split(",")
        .map(value => value.trim().toLowerCase())
        .filter(Boolean);
      const email = String(user.email || "").toLowerCase();
      if (!allowedEmails.includes(email)) {
        return json({ success: false, error: "Compte non autorise a envoyer des images." }, 403, headers);
      }

      let form;
      try { form = await request.formData(); }
      catch { return json({ success: false, error: "Formulaire invalide." }, 400, headers); }

      const file = form.get("file");
      const category = String(form.get("category") || "");
      if (!(file instanceof File)) return json({ success: false, error: "Aucune image recue." }, 400, headers);
      if (!ALLOWED_TYPES.has(file.type)) return json({ success: false, error: "Format refuse. Utilisez JPG, PNG, WEBP ou GIF." }, 415, headers);
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) return json({ success: false, error: "Image limitee a 5 Mo." }, 413, headers);

      const folder = { school_logo: "schools", product_image: "products" }[category];
      if (!folder) return json({ success: false, error: "Categorie d'image invalide." }, 400, headers);
      if (!env.MEDIA_BUCKET) return json({ success: false, error: "Binding R2 MEDIA_BUCKET absent." }, 500, headers);

      const key = `${folder}/${crypto.randomUUID()}-${cleanFileName(file.name)}`;
      await env.MEDIA_BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { uploadedBy: email, category, originalName: file.name }
      });

      const base = String(env.PUBLIC_R2_URL || "").replace(/\/+$/, "");
      if (!base) return json({ success: false, error: "Variable PUBLIC_R2_URL absente." }, 500, headers);
      return json({ success: true, key, url: `${base}/${key}`, fileName: file.name, contentType: file.type, size: file.size }, 201, headers);
    } catch (error) {
      return json({ success: false, error: error?.message || "Erreur interne du Worker." }, 500, headers);
    }
  }
};
