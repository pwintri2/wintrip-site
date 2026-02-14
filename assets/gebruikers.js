const COLUMNS = ["Kantoor","Links","Beheer","Vacatures","Projecten","Contact"];

const ICONS = [
  { key:"website",   label:"Website",   path:"/assets/icons/website.png" },
  { key:"kanban",    label:"Kanban",    path:"/assets/icons/kanban.png" },
  { key:"agenda",    label:"Agenda",    path:"/assets/icons/agenda.png" },
  { key:"users",     label:"Users",     path:"/assets/icons/users.png" },
  { key:"cv",        label:"CV",        path:"/assets/icons/cv.png" },
  { key:"contact",   label:"Contact",   path:"/assets/icons/contact.png" },
];

let token = sessionStorage.getItem("dash_token") || "";
let currentBoard = "default";
let tiles = [];
let editingId = null;
let editingColumn = null;
let pickedIcon = ICONS[0]?.path || "";

function $(id){ return document.getElementById(id); }
function el(tag, cls, html){
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function setMenuOpen(menuId, open){
  const m = $(menuId);
  if (!m) return;
  m.hidden = !open;
}
function closeMenus(){
  setMenuOpen("fileMenu", false);
}
document.addEventListener("click", (e) => {
  // close menus when clicking outside
  if (!e.target.closest(".menu")) closeMenus();
});
function showModal(id, show){
  const m = $(id);
  if (!m) return;
  if (show) {
    m.removeAttribute("hidden");
  } else {
    m.setAttribute("hidden", "");
  }
}

function toast(msg, ok=true){
  const label = $("loginMsg");
  label.textContent = msg;
  label.style.color = ok ? "rgba(255,255,255,.75)" : "#ffb3b0";
}

async function api(path, opts={}){
  const headers = opts.headers || {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!headers["Content-Type"] && opts.body) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    const txt = await res.text().catch(()=> "");
    throw new Error(`${res.status} ${txt}`);
  }
  return res.json().catch(()=> ({}));
}

function newId(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function normalizeOrders(){
  const byCol = {};
  for (const c of COLUMNS) byCol[c] = [];
  for (const t of tiles) {
    const c = COLUMNS.includes(t.column) ? t.column : "Links";
    byCol[c].push(t);
  }
  for (const c of COLUMNS) {
    byCol[c].sort((a,b) => (a.order||0)-(b.order||0) || (a.created_at||0)-(b.created_at||0));
    byCol[c].forEach((t, idx) => t.order = idx);
  }
}

function tileCard(tile){
  const t = el("div","tile");
  t.dataset.id = tile.id;

  t.addEventListener("click", () => {
    if (tile.link) window.open(tile.link, "_blank", "noopener");
  });

  const top = el("div","tileTop");
  const ic = el("div","tileIcon");
  if (tile.icon && tile.icon.startsWith("/")) {
    const img = el("img");
    img.src = tile.icon;
    img.alt = "";
    ic.appendChild(img);
  } else {
    ic.textContent = "•";
  }
  top.appendChild(ic);
  top.appendChild(el("div","tileTitle", tile.title || ""));
  t.appendChild(top);

  const body = el("div","tileBody");
  const desc = el("div","tileDesc", (tile.description || "").replace(/\n/g,"<br>"));
  const toggle = el("div","tileDescToggle", "Omschrijving");
  toggle.addEventListener("click", (e) => { e.stopPropagation(); desc.classList.toggle("open"); });
  body.appendChild(desc);
  body.appendChild(toggle);

  const img = el("img","tileImg");
  img.src = tile.image || "/assets/tile-default.png";
  img.alt = "";
  body.appendChild(img);
  t.appendChild(body);

  const actions = el("div","tileActions");
  const editBtn = el("button","iconBtn","✎");
  editBtn.title = "Bewerken";
  editBtn.addEventListener("click", (e) => { e.stopPropagation(); openEdit(tile.column, tile.id); });

  const delBtn = el("button","iconBtn danger","🗑");
  delBtn.title = "Verwijderen";
  delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteTile(tile.id); });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  t.appendChild(actions);

  return t;
}

function render(){
  $("boardNameLabel").textContent = `Board: ${currentBoard}`;

  const board = $("board");
  board.innerHTML = "";

  const byCol = {};
  for (const c of COLUMNS) byCol[c] = [];
  for (const t of tiles) {
    const c = COLUMNS.includes(t.column) ? t.column : "Links";
    byCol[c].push(t);
  }
  for (const c of COLUMNS) {
    byCol[c].sort((a,b)=> (a.order||0)-(b.order||0) || (a.created_at||0)-(b.created_at||0));
  }

  for (const colName of COLUMNS) {
    const col = el("section","column");
    const head = el("div","colHeader");
    head.appendChild(el("div","colTitle", colName));

    const add = el("button","colAdd","+");
    add.title = "Tegel toevoegen";
    add.addEventListener("click", () => openAdd(colName));
    head.appendChild(add);

    col.appendChild(head);

    const list = el("div","tileList");
    list.dataset.column = colName;

    for (const t of byCol[colName]) list.appendChild(tileCard(t));
    col.appendChild(list);
    board.appendChild(col);
// drag & drop
if (typeof Sortable !== "undefined") {
  new Sortable(list, {
    group: "tiles",
    animation: 150,
    onEnd: () => {
      const allLists = document.querySelectorAll(".tileList");
      const newTiles = [];
      allLists.forEach(l => {
        const c = l.dataset.column;
        Array.from(l.children).forEach((node, idx) => {
          const id = node.dataset.id;
          const t = tiles.find(x => x.id === id);
          if (t) {
            t.column = c;
            t.order = idx;
            newTiles.push(t);
          }
        });
      });
      tiles = newTiles;
      normalizeOrders();
      saveCurrent().catch(()=>{});
    }
  });
}

  }
}

function buildIconGrid(){
  const grid = $("iconGrid");
  grid.innerHTML = "";
  ICONS.forEach(ic => {
    const b = el("button","iconPick");
    const img = el("img");
    img.src = ic.path;
    img.alt = ic.label;
    b.appendChild(img);
    b.addEventListener("click", () => {
      pickedIcon = ic.path;
      [...grid.querySelectorAll(".iconPick")].forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
    grid.appendChild(b);
  });
  // default active
  const first = grid.querySelector(".iconPick");
  if (first) first.classList.add("active");
}

function openAdd(column){
  editingId = null;
  editingColumn = column;
  pickedIcon = ICONS[0]?.path || "";
  $("title").value = "";
  $("link").value = "";
  $("desc").value = "";
  $("deleteBtn").style.display = "none";
  buildIconGrid();
  showModal("modal", true);
}

function openEdit(column, id){
  const t = tiles.find(x => x.id === id);
  if (!t) return;
  editingId = id;
  editingColumn = column;
  pickedIcon = t.icon || ICONS[0]?.path || "";
  $("title").value = t.title || "";
  $("link").value = t.link || "";
  $("desc").value = t.description || "";
  $("deleteBtn").style.display = "";
  buildIconGrid();
  // mark active icon if matches
  const grid = $("iconGrid");
  [...grid.querySelectorAll(".iconPick")].forEach((b, idx) => {
    const p = ICONS[idx]?.path;
    if (p === pickedIcon) b.classList.add("active");
    else b.classList.remove("active");
  });
  showModal("modal", true);
}

function deleteTile(id){
  tiles = tiles.filter(t => t.id !== id);
  normalizeOrders();
  render();
  saveCurrent().catch(()=>{});
}

async function saveCurrent(){
  normalizeOrders();
  await api(`/api/files/${encodeURIComponent(currentBoard)}`, {
    method:"POST",
    body: JSON.stringify({ tiles })
  });
  toast("Opgeslagen ✓", true);
}

async function openBoard(name){
  const data = await api(`/api/open/${encodeURIComponent(name)}`, { method:"POST" });
  currentBoard = data.name || name;
  tiles = Array.isArray(data.tiles) ? data.tiles : [];
  normalizeOrders();
  render();
}

async function listBoards(){
  const d = await fetch("/api/files").then(r=>r.json()).catch(()=>({files:[]}));
  return Array.isArray(d.files) ? d.files : [];
}

// Prompt modal helpers
function promptText(title, label, placeholder){
  return new Promise((resolve) => {
    $("promptTitle").textContent = title;
    $("promptLabel").textContent = label;
    const inp = $("promptInput");
    inp.value = "";
    inp.placeholder = placeholder || "";
    showModal("promptModal", true);

    const done = (val) => {
      showModal("promptModal", false);
      $("promptOk").onclick = null;
      $("promptCancel").onclick = null;
      resolve(val);
    };

    $("promptOk").onclick = () => done(inp.value.trim());
    $("promptCancel").onclick = () => done(null);
    inp.onkeydown = (e) => { if (e.key === "Enter") done(inp.value.trim()); };
    inp.focus();
  });
}

// Open list modal
function showOpenList(files){
  return new Promise((resolve) => {
    const list = $("fileList");
    list.innerHTML = "";
    files.forEach(name => {
      const row = el("div","fileItem");
      row.appendChild(el("strong","", name));
      const b = el("button","btn primary","Open");
      b.addEventListener("click", () => {
        showModal("openModal", false);
        resolve(name);
      });
      row.appendChild(b);
      list.appendChild(row);
    });

    $("openClose").onclick = () => { showModal("openModal", false); resolve(null); };
    showModal("openModal", true);
  });
}

function wireModalButtons(){
  $("cancelBtn").addEventListener("click", () => showModal("modal", false));
  $("deleteBtn").addEventListener("click", () => {
    if (!editingId) return;
    deleteTile(editingId);
    showModal("modal", false);
  });
  $("saveBtn").addEventListener("click", () => {
    const title = $("title").value.trim();
    const link = $("link").value.trim();
    const description = $("desc").value.trim();

    if (!title) { toast("Titel ontbreekt", false); return; }
    if (!link) { toast("Link ontbreekt", false); return; }

    if (editingId) {
      const t = tiles.find(x => x.id === editingId);
      if (!t) return;
      t.icon = pickedIcon;
      t.title = title;
      t.link = link;
      t.description = description;
    } else {
      tiles.push({
        id: newId(),
        column: editingColumn || "Links",
        icon: pickedIcon,
        title,
        link,
        description,
        image: "/assets/tile-default.png",
        created_at: Date.now(),
        order: 999
      });
    }

    normalizeOrders();
    render();
    saveCurrent().catch(()=>{});
    showModal("modal", false);
  });
}

function wireMenu(){
  document.querySelectorAll(".menuBtn[data-menu]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.menu;
      const m = $(id);
      m.hidden = !m.hidden;
    });
  });

  $("mSave").addEventListener("click", () => { closeMenus(); saveCurrent().catch(err=>toast(String(err),false)); });
  $("mSaveAs").addEventListener("click", async () => {
    closeMenus();
    const name = await promptText("Opslaan als…", "Bestandsnaam", "bijv. board-februari");
    if (!name) return;
    currentBoard = name;
    await saveCurrent();
    render();
  });
  $("mOpen").addEventListener("click", async () => {
    closeMenus();
    const files = await listBoards();
    const chosen = await showOpenList(files);
    if (!chosen) return;
    await openBoard(chosen);
  });
  $("mClear").addEventListener("click", async () => {
    closeMenus();
    if (!confirm("Weet je zeker dat je alle kolommen leeg wilt maken?")) return;
    await api(`/api/clear/${encodeURIComponent(currentBoard)}`, { method:"POST" });
    tiles = [];
    render();
    toast("Leeg gemaakt ✓", true);
  });
}

async function doLogin(){
  const pw = $("pw").value;
  try {
    const d = await fetch("/api/login", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({password: pw})
    }).then(r => r.ok ? r.json() : Promise.reject(r));
    token = d.token || "";
    sessionStorage.setItem("dash_token", token);
    $("loginbar").style.display = "none";
    toast("", true);

    // open last board (server-side)
    const st = await fetch("/api/state").then(r=>r.json()).catch(()=>({last_board:"default"}));
    await openBoard(st.last_board || "default");
  } catch (e) {
    toast("Inloggen mislukt", false);
  }
}

function init(){
  wireModalButtons();
  wireMenu();

  $("loginBtn").addEventListener("click", doLogin);
  $("pw").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });

  // if token already present: try to open last board
  if (token) {
    $("loginbar").style.display = "none";
    fetch("/api/state")
      .then(r=>r.json())
      .then(st => openBoard(st.last_board || "default"))
      .catch(()=> openBoard("default"));
  }
}
document.querySelectorAll(".modal").forEach(m => {
  m.setAttribute("hidden", "");
});

init();
