const COLUMNS = ["Kantoor","Links","Beheer","Vacatures","Projecten","Contact"];

function el(tag, cls, html){
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function tileCard(tile, showActions=false){
  const t = el("div","tile");
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
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    desc.classList.toggle("open");
  });
  body.appendChild(desc);
  body.appendChild(toggle);

  const img = el("img","tileImg");
  img.src = tile.image || "/assets/tile-default.png";
  img.alt = "";
  body.appendChild(img);

  t.appendChild(body);

  if (showActions) {
    const actions = el("div","tileActions");
    actions.appendChild(el("button","iconBtn","✎"));
    actions.appendChild(el("button","iconBtn danger","🗑"));
    t.appendChild(actions);
  }

  return t;
}

function renderBoard(data){
  const board = document.getElementById("board");
  board.innerHTML = "";

  const tiles = Array.isArray(data.tiles) ? data.tiles : [];
  const byCol = {};
  for (const c of COLUMNS) byCol[c] = [];
  for (const t of tiles) {
    const c = COLUMNS.includes(t.column) ? t.column : "Links";
    byCol[c].push(t);
  }
  for (const c of COLUMNS) {
    byCol[c].sort((a,b) => (a.order||0) - (b.order||0) || (a.created_at||0)-(b.created_at||0));
  }

  // Default: als leeg -> 1 tegel in Beheer naar gebruikers.html
  const isEmpty = tiles.length === 0;
  if (isEmpty) {
    byCol["Beheer"].push({
      id: "default-users",
      column: "Beheer",
      icon: "/assets/icons/users.png",
      title: "Gebruikers beheer",
      link: "/gebruikers.html",
      description: "",
      image: "/assets/tile-default.png",
      created_at: Date.now(),
      order: 0
    });
  }

  for (const colName of COLUMNS) {
    const col = el("section","column");
    const head = el("div","colHeader");
    head.appendChild(el("div","colTitle", colName));
    col.appendChild(head);

    const list = el("div","tileList");
    for (const t of byCol[colName]) list.appendChild(tileCard(t, false));
    col.appendChild(list);

    board.appendChild(col);
  }
}

async function load(){
  const st = await fetch("/api/state").then(r => r.json()).catch(()=>({last_board:"default"}));
  const name = st.last_board || "default";
  const data = await fetch(`/api/files/${encodeURIComponent(name)}`).then(r => r.json()).catch(()=>({tiles:[]}));
  renderBoard(data);
}

load();
