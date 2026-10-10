(function attachCloud(global) {
  let session = null;
  const config = global.STAND_CONFIG || {};
  const url = (config.supabaseUrl || "").replace(/\/$/, "");
  const key = config.supabasePublishableKey || "";

  function isConfigured() {
    return /^https:\/\/[^/]+$/.test(url) && Boolean(key) && !key.startsWith("sb_secret_");
  }

  async function request(path, options = {}) {
    if (!isConfigured()) throw new Error("Supabase todavía no está conectado.");
    const response = await global.fetch(url + path, {
      ...options,
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...options.headers,
      },
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error("Revisá el acceso o volvé a ingresar.");
      throw new Error("No se pudo completar el resguardo. Los datos siguen guardados en este dispositivo.");
    }
    return data;
  }

  async function signIn(email, password) {
    const next = await request("/auth/v1/token?grant_type=password", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    if (!next || !next.access_token || !next.user) throw new Error("No se pudo iniciar la sesión.");
    session = { ...next, expiresAt: Date.now() + (next.expires_in || 3600) * 1000 };
    return session.user;
  }

  async function refreshIfNeeded() {
    if (!session) throw new Error("Ingresá para guardar una copia.");
    if (session.expiresAt > Date.now() + 60000) return;
    const next = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!next || !next.access_token || !next.user) throw new Error("Volvé a ingresar para guardar la copia.");
    session = { ...next, expiresAt: Date.now() + (next.expires_in || 3600) * 1000 };
  }

  async function saveBackup(payload, deviceId) {
    await refreshIfNeeded();
    const rows = await request("/rest/v1/stand_backups?select=id,created_at", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ owner_id: session.user.id, device_id: deviceId, schema_version: 1, payload }),
    });
    if (!Array.isArray(rows) || !rows[0] || !rows[0].id) throw new Error("No se recibió confirmación del resguardo.");
    return rows[0];
  }

  async function signOut() {
    try {
      if (session) await request("/auth/v1/logout?scope=local", { method: "POST" });
    } finally {
      session = null;
    }
  }

  global.StandCloud = { isConfigured, signIn, saveBackup, signOut, currentUser: () => session ? session.user : null };
})(typeof window !== "undefined" ? window : globalThis);
