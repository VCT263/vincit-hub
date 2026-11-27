/* Conversa com o HUB (Supabase) pela API REST, com o login da própria pessoa. RLS limita tudo aos dados dela. */
(function () {
  const URL = "https://hxylhqtdhdsunjmgamqc.supabase.co";
  const KEY = "sb_publishable_YSvHy8TGypU5mBXUu2DcKA_peofPuvW"; // chave pública (a mesma do site)
  const STORE = "vincit-hub-session";

  let session = null;
  try { session = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { session = null; }

  function save(s) {
    session = s;
    try { s ? localStorage.setItem(STORE, JSON.stringify(s)) : localStorage.removeItem(STORE); } catch (e) {}
  }

  async function auth(grant, body) {
    const r = await fetch(`${URL}/auth/v1/token?grant_type=${grant}`, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || "Não foi possível entrar.");
    save({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, email: j.user && j.user.email });
    return session;
  }

  async function token() {
    if (!session) throw new Error("Faça login.");
    if (Date.now() > session.exp - 60000) await auth("refresh_token", { refresh_token: session.refresh });
    return session.access;
  }

  async function rest(path, opts) {
    opts = opts || {};
    const t = await token();
    const r = await fetch(`${URL}/rest/v1/${path}`, {
      method: opts.method || "GET",
      headers: Object.assign({ apikey: KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, opts.prefer ? { Prefer: opts.prefer } : {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (r.status === 401) { save(null); throw new Error("Sessão expirou. Entre de novo."); }
    const text = await r.text();
    const j = text ? JSON.parse(text) : null;
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || `Erro ${r.status}`);
    return j;
  }

  window.HUB = {
    get email() { return session && session.email; },
    loggedIn: () => !!session,
    login: (email, password) => auth("password", { email, password }),
    logout: () => save(null),
    contents: () => rest("content_ideas?select=id,title,format&archived_at=is.null&order=updated_at.desc.nullslast&limit=60"),
    kits: () => rest("av_style_kits?select=id,name,data&order=updated_at.desc"),
    kit: (id) => rest(`av_style_kits?select=id,name,data&id=eq.${id}`).then((r) => r[0] || null),
    createSession: (row) => rest("av_edit_sessions", { method: "POST", body: row, prefer: "return=representation" }).then((r) => r[0]),
    getSession: (id) => rest(`av_edit_sessions?select=id,status,plan,plan_note,kit_id&id=eq.${id}`).then((r) => r[0] || null),
    lastOpen: () => rest("av_edit_sessions?select=id,status,plan,plan_note,kit_id,sequence_name&status=in.(aguardando_plano,plano_pronto)&or=(project_name.is.null,project_name.neq.Editor%20do%20HUB)&order=created_at.desc&limit=1").then((r) => r[0] || null),
    setStatus: (id, status) => rest(`av_edit_sessions?id=eq.${id}`, { method: "PATCH", body: Object.assign({ status, updated_at: new Date().toISOString() }, status === "aplicado" ? { applied_at: new Date().toISOString() } : {}) }),
  };
})();
