const API = {
  adminLogin: "/api/login",
  ledenLogin: "/api/leden/login",
  items: "/api/leden/items",
  approve: (id) => `/api/leden/approve/${encodeURIComponent(id)}`,
  del: (id) => `/api/leden/delete/${encodeURIComponent(id)}`,
  download: (id, f) => `/api/leden/download/${encodeURIComponent(id)}/${encodeURIComponent(f)}`,
  accessList: "/api/leden/access",
  accessUpsert: "/api/leden/access/upsert",
  accessDelete: (label) => `/api/leden/access/delete/${encodeURIComponent(label)}`
};

function getToken() {
  return (
    sessionStorage.getItem("leden_token") ||
    sessionStorage.getItem("dash_token") ||
    localStorage.getItem("leden_token") ||
    localStorage.getItem("dash_token") ||
    ""
  );
}

function setToken(tok, key = "leden_token") {
  sessionStorage.setItem(key, tok);
}

async function postJSON(url, body, token) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

async function getJSON(url, token) {
  const res = await fetch(url, {
    headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

function el(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(s) { return escapeHtml(s).replaceAll('"',"&quot;"); }

// ---------- Downloads that require Authorization ----------
async function downloadWithAuth(subId, filename, openInNewTab = false) {
  const token = getToken();
  const url = API.download(subId, filename);

  const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
  if (!res.ok) {
    let msg = `Bestand was niet beschikbaar op de site (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data && data.detail) msg = data.detail;
    } catch(_) {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);

  if (openInNewTab) {
    window.open(objUrl, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
    return;
  }

  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
}

// ---------- Photos also require Authorization ----------
async function loadPhotos(items) {
  const token = getToken();
  for (const it of items || []) {
    if (!it.foto) continue;

    const img = document.getElementById(`img_${it.id}`);
    if (!img) continue;

    try {
      const url = API.download(it.id, it.foto);
      const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` }});
      if (!res.ok) continue;
      const blob = await res.blob();
      img.src = URL.createObjectURL(blob);
    } catch (_) {}
  }
}

function renderTile(item, opts) {
  const hasPhoto = !!item.foto;
  const imgId = hasPhoto ? `img_${item.id}` : "";

  const manage = !!opts.manage;
  const showFiles = !!opts.showFiles;

  const files = (item.bestanden || []).map(f => {
    return `<div class="small" style="display:flex; gap:8px; align-items:center;">
      <button class="iconBtn" data-act="file" data-id="${escapeAttr(item.id)}" data-file="${escapeAttr(f)}">📎 ${escapeHtml(f)}</button>
      <button class="iconBtn" data-act="fileopen" data-id="${escapeAttr(item.id)}" data-file="${escapeAttr(f)}">↗︎</button>
    </div>`;
  }).join("");

  return `
  <div class="tileCard">
    <div class="tileHead">
      <div class="tileHeadTitle">Aanmelding</div>
      <div class="small">${new Date(item.created_at * 1000).toLocaleString("nl-NL")}</div>
    </div>
    <div class="tileBody">
      ${hasPhoto ? `<img class="tilePhoto" id="${imgId}" alt="foto">` : ``}

      <details>
        <summary><b>Naam & e-mail</b></summary>
        <div class="kv">Naam: ${escapeHtml(item.naam || "")}</div>
        <div class="kv">E-mail: ${escapeHtml(item.email || "")}</div>
      </details>

      <details>
        <summary><b>Vertel iets over jezelf</b></summary>
        <div class="kv">${escapeHtml(item.over || "").replace(/\n/g, "<br>")}</div>
      </details>

      <details>
        <summary><b>Stemsoort</b></summary>
        <div class="kv">${escapeHtml(item.stem || "")}</div>
      </details>

      ${showFiles ? `
      <details>
        <summary><b>Bestanden</b></summary>
        ${files || `<div class="small">(geen bestanden)</div>`}
        <div class="small" style="margin-top:8px; opacity:.8;">Tip: 📎 downloadt, ↗︎ opent in een nieuw tabblad.</div>
      </details>` : ``}

      ${manage ? `
        <div class="actions">
          <button class="iconBtn primary" data-act="approve" data-id="${escapeAttr(item.id)}">✅ Ja!</button>
          <button class="iconBtn" data-act="delete" data-id="${escapeAttr(item.id)}">🗑️</button>
        </div>
      ` : ``}
    </div>
  </div>
  `;
}

// ---- Page: ledenbeheer
async function initLedenbeheer() {
  const token = getToken();
  const msg = el("loginMsg");
  const pendingWrap = el("pendingWrap");
  const memberWrap = el("memberWrap");

  async function refresh() {
    const pend = await getJSON(`${API.items}?status=pending`, token);
    const mem = await getJSON(`${API.items}?status=member`, token);

    pendingWrap.innerHTML =
      (pend.items || []).map(i => renderTile(i, {manage:true, showFiles:true})).join("")
      || `<div class="small">(geen aanmelders)</div>`;

    memberWrap.innerHTML  =
      (mem.items  || []).map(i => renderTile(i, {manage:false, showFiles:true})).join("")
      || `<div class="small">(geen leden)</div>`;

    await loadPhotos(pend.items);
    await loadPhotos(mem.items);
  }

  async function doApprove(id) {
    await fetch(API.approve(id), { method:"POST", headers:{ "Authorization": `Bearer ${getToken()}` }});
    await refresh();
  }
  async function doDelete(id) {
    if (!confirm("Weet je zeker dat je deze aanmelding wilt verwijderen?")) return;
    await fetch(API.del(id), { method:"POST", headers:{ "Authorization": `Bearer ${getToken()}` }});
    await refresh();
  }

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;

    const act = b.dataset.act;
    const id = b.dataset.id;
    const file = b.dataset.file;

    try {
      if (act === "approve") await doApprove(id);
      if (act === "delete") await doDelete(id);
      if (act === "file") await downloadWithAuth(id, file, false);
      if (act === "fileopen") await downloadWithAuth(id, file, true);
    } catch(err) {
      alert(err.message || String(err));
    }
  });

  // loginbar
  el("loginBtn").addEventListener("click", async () => {
    msg.textContent = "";
    const code = el("pw").value.trim();
    if (!code) return;

    try {
      // eerst proberen als leden-code
      const r = await postJSON(API.ledenLogin, {code}, "");
      setToken(r.token, "leden_token");
      location.reload();
    } catch(e1) {
      // anders admin (zoals gebruikers.html)
      try {
        const r = await postJSON(API.adminLogin, {password: code}, "");
        sessionStorage.setItem("dash_token", r.token);
        location.reload();
      } catch(e2) {
        msg.textContent = "Geen toegang (code/wachtwoord onjuist).";
      }
    }
  });

  // auto refresh
  try {
    await refresh();
    el("loginbar").style.display = "none";
  } catch(err) {
    el("loginbar").style.display = "flex";
  }
}

// ---- Page: leden (alleen leden)
async function initLedenlijst() {
  const token = getToken();
  const wrap = el("wrap");
  const msg = el("loginMsg");

  async function refresh() {
    const mem = await getJSON(`${API.items}?status=member`, token);
    wrap.innerHTML =
      (mem.items || []).map(i => renderTile(i, {manage:false, showFiles:false})).join("")
      || `<div class="small">(nog geen leden)</div>`;
    await loadPhotos(mem.items);
  }

  el("loginBtn").addEventListener("click", async () => {
    msg.textContent = "";
    const code = el("pw").value.trim();
    if (!code) return;
    try {
      const r = await postJSON(API.ledenLogin, {code}, "");
      setToken(r.token, "leden_token");
      location.reload();
    } catch(e) {
      msg.textContent = "Geen toegang (code onjuist).";
    }
  });

  try {
    await refresh();
    el("loginbar").style.display = "none";
  } catch(err) {
    el("loginbar").style.display = "flex";
  }
}

// ---- Page: ledentoegangbeheer (admin-only)
async function initToegang() {
  const token = sessionStorage.getItem("dash_token") || localStorage.getItem("dash_token") || "";
  const wrap = el("wrap");

  async function refresh() {
    const data = await getJSON(API.accessList, token);
    const rows = (data.codes || []).map(c => `
      <div class="tileCard">
        <div class="tileHead">
          <div class="tileHeadTitle">${escapeHtml(c.label || "")}</div>
          <button class="iconBtn" data-del="${escapeAttr(c.label)}">🗑️</button>
        </div>
        <div class="tileBody">
          <div class="kv"><b>Code:</b> ${escapeHtml(c.code || "")}</div>
          <div class="kv"><b>Leden bekijken:</b> ${c.leden_view ? "ja" : "nee"}</div>
          <div class="kv"><b>Leden beheren:</b> ${c.leden_manage ? "ja" : "nee"}</div>
        </div>
      </div>
    `).join("");
    wrap.innerHTML = rows || `<div class="small">(nog geen toegangscodes)</div>`;
  }

  el("saveBtn").addEventListener("click", async () => {
    const label = el("label").value.trim();
    const code  = el("code").value.trim();
    const leden_view = el("leden_view").checked;
    const leden_manage = el("leden_manage").checked;
    try {
      await postJSON(API.accessUpsert, {label, code, leden_view, leden_manage}, token);
      el("label").value = "";
      el("code").value = "";
      el("leden_view").checked = true;
      el("leden_manage").checked = false;
      await refresh();
    } catch(err) {
      alert(err.message || String(err));
    }
  });

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-del]");
    if (!b) return;
    const label = b.dataset.del;
    if (!confirm(`Toegang "${label}" verwijderen?`)) return;
    try {
      await fetch(API.accessDelete(label), { method:"POST", headers:{ "Authorization": `Bearer ${token}` }});
      await refresh();
    } catch(err) {
      alert(err.message || String(err));
    }
  });

  // admin login (zelfde wachtwoord als /api/login)
  el("loginBtn").addEventListener("click", async () => {
    el("loginMsg").textContent = "";
    const pw = el("pw").value.trim();
    if (!pw) return;
    try {
      const r = await postJSON(API.adminLogin, {password: pw}, "");
      sessionStorage.setItem("dash_token", r.token);
      location.reload();
    } catch(e) {
      el("loginMsg").textContent = "Admin wachtwoord onjuist.";
    }
  });

  try {
    await refresh();
    el("loginbar").style.display = "none";
  } catch(err) {
    el("loginbar").style.display = "flex";
  }
}

// ---- Wire up per pagina
window.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "ledenbeheer") initLedenbeheer();
  if (page === "leden") initLedenlijst();
  if (page === "toegang") initToegang();
});
