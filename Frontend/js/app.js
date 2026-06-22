// CONSTANTS
const CATS = [
  { id: "food", label: "Food", bg: "#FFECD2", ac: "#D4872A", em: "🍜" },
  { id: "transport", label: "Commute", bg: "#DFF0FF", ac: "#6AADE4", em: "🚗" },
  { id: "shopping", label: "Shopping", bg: "#FFE8EE", ac: "#E86A8A", em: "🛍️" },
  { id: "fun", label: "Fun", bg: "#F0EDFF", ac: "#9B8FE8", em: "🎮" },
  { id: "health", label: "Health", bg: "#FFE8E8", ac: "#D04040", em: "💊" },
  { id: "bills", label: "Bills", bg: "#FFF9D6", ac: "#D4A800", em: "⚡" },
  { id: "study", label: "Study", bg: "#E0F5EF", ac: "#3A9A82", em: "📚" },
  { id: "travel", label: "Travel", bg: "#E8F4FF", ac: "#3A88D4", em: "✈️" },
  { id: "income", label: "Income", bg: "#E0F5EF", ac: "#3A9A82", em: "💰" },
  { id: "other", label: "Other", bg: "#F5F2EE", ac: "#888", em: "📦" },
];
const catOf = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["#FFB347", "#5BBFA1", "#9B8FE8", "#6AADE4", "#E86A8A", "#D4A800", "#D04040", "#3A88D4"];
const genId = () => Math.random().toString(36).slice(2, 10);
const INR = v => "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const today = new Date();

// STATE
let currentUser = null;
let entries = [];
let goals = [];
let groups = [];  // [{id,name,emoji,members:[{id,name,color}],expenses:[{id,desc,amount,paidBy,splitType,shares,date}],settlements:[]}]
let viewM = today.getMonth(), viewY = today.getFullYear();
let curTab = "dash";
let fType = "expense", fCat = "food", fRecur = false, fSplitOn = false;
let filterCat = "all", sortBy = "date", srch = "";
let activeGroupId = null;
let splitType = "equal";
let charts = {};

// ══════════════════════════════════════════════
// PERSISTENCE
// ══════════════════════════════════════════════
function saveAll() {
  const key = currentUser?.email || "guest";

  localStorage.setItem(`paisa_entries_${key}`, JSON.stringify(entries));
  localStorage.setItem(`paisa_goals_${key}`, JSON.stringify(goals));
  localStorage.setItem(`paisa_groups_${key}`, JSON.stringify(groups));
}

function loadAll() {
  const key = currentUser?.email || "guest";
  entries = JSON.parse(localStorage.getItem(`paisa_entries_${key}`) || "[]");
  goals = JSON.parse(localStorage.getItem(`paisa_goals_${key}`) || "[]");
  groups = JSON.parse(localStorage.getItem(`paisa_groups_${key}`) || "[]");
}

// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════
function authTab(t, btn) {
  document.querySelectorAll(".auth-tab").forEach(b => b.classList.remove("on"));
  btn.classList.add("on");
  document.getElementById("auth-login").classList.toggle("hidden", t !== "login");
  document.getElementById("auth-signup").classList.toggle("hidden", t !== "signup");
  document.getElementById("auth-err").textContent = "";
}

async function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;
  if (!email || !pass) { setAuthErr("Please fill all fields."); return; }

  try {
    const response = await fetch(
      "http://localhost:3002/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
      }
    );

    const data = await response.json();

    if (response.ok) {
      loginSuccess(data.user);
    } else {
      setAuthErr(data.message || "Login failed");
    }
  } catch (err) {
    console.error(err);
    setAuthErr("Server error. Please try again.");
  }
}

async function doSignup() {
  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const pass = document.getElementById("signup-pass").value;

  try {
    const response = await fetch(
      "http://localhost:3002/api/auth/signup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password: pass
        })
      }
    );

    const data = await response.json();

    if (response.ok) {
      alert("Signup successful! Please sign in.");
      document.getElementById("signup-name").value = "";
      document.getElementById("signup-email").value = "";
      document.getElementById("signup-pass").value = "";
      document.querySelector(".auth-tab").click();   // switches to the "Sign In" tab
    } else {
      alert(data.message || "Signup Failed");
    }

  } catch (err) {
    console.error(err);
    alert("Server Error");
  }
}

function loginSuccess(user) {
  currentUser = user;
  localStorage.setItem("paisa_current_user", JSON.stringify(user)); // add this line
  loadAll();

  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  document.getElementById("user-name-display").textContent = user.name;
  document.getElementById("user-email-display").textContent = user.email;
  document.getElementById("user-avatar").textContent = user.name[0].toUpperCase();

  render();
}

function doLogout() {
  if (!confirm("Sign out?")) return;
  currentUser = null;
  localStorage.removeItem("paisa_current_user");
  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("login-email").value = "";
  document.getElementById("login-pass").value = "";
  document.getElementById("auth-err").textContent = "";
}

function setAuthErr(msg) { document.getElementById("auth-err").textContent = msg; }

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
const TAB_TITLES = { dash: "Dashboard", entries: "Entries", split: "Split & Groups", goals: "Budget Goals", insights: "Insights" };

function goTab(tab, btn) {
  curTab = tab;
  // sidebar nav
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("on"));
  document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.remove("on"));
  // highlight correct buttons
  document.querySelectorAll(".nav-item").forEach(b => { if (b.textContent.trim().startsWith(TAB_TITLES[tab].slice(0, 4))) b.classList.add("on"); });
  if (btn) {
    btn.classList.add("on");
    // sync sidebar or bottom nav
    const idx = [...btn.parentElement.children].indexOf(btn);
    const other = btn.closest(".bottom-nav") ? document.querySelectorAll(".nav-item") : document.querySelectorAll(".bottom-nav-item");
    other.forEach(b => b.classList.remove("on"));
    if (other[idx]) other[idx].classList.add("on");
  }
  document.getElementById("page-title").textContent = TAB_TITLES[tab];
  closeSidebar();
  destroyCharts();
  render();
}

function changeMonth(d) {
  viewM += d;
  if (viewM < 0) { viewM = 11; viewY--; }
  if (viewM > 11) { viewM = 0; viewY++; }
  destroyCharts(); render();
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("open");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("open");
}
function destroyCharts() { Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) { } }); charts = {}; }

// ══════════════════════════════════════════════
// COMPUTED
// ══════════════════════════════════════════════
const monthE = () => entries.filter(e => { const d = new Date(e.date); return d.getMonth() === viewM && d.getFullYear() === viewY; });
const monthExps = () => monthE().filter(e => e.type === "expense");
const monthIncs = () => monthE().filter(e => e.type === "income");
const totExp = () => monthExps().reduce((s, e) => s + e.amount, 0);
const totInc = () => monthIncs().reduce((s, e) => s + e.amount, 0);
const bal = () => totInc() - totExp();
const savR = () => totInc() > 0 ? ((bal() / totInc()) * 100).toFixed(1) : "0.0";

function catData() {
  const m = {};
  monthExps().forEach(e => { m[e.cat] = (m[e.cat] || 0) + e.amount; });
  return Object.entries(m).map(([id, v]) => ({ id, value: v, ...catOf(id) })).sort((a, b) => b.value - a.value);
}

// ══════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════
function render() {
  if (!currentUser) return;
  document.getElementById("month-lbl").textContent = MONTHS[viewM] + " " + viewY;
  const pb = document.getElementById("page-body");
  pb.innerHTML = "";
  if (curTab === "dash") renderDash(pb);
  else if (curTab === "entries") renderEntries(pb);
  else if (curTab === "split") renderSplit(pb);
  else if (curTab === "goals") renderGoals(pb);
  else if (curTab === "insights") renderInsights(pb);
}

// ── DASHBOARD ─────────────────────────────────
function renderDash(el) {
  const sr = parseFloat(savR()), te = totExp(), ti = totInc(), b = bal();
  const cd = catData(), top = cd[0];
  const good = sr > 20;

  // Balance strip
  el.innerHTML += `<div class="bal-strip fade-up">
    <div class="bal-card" style="background:var(--mint);">
      <div class="bal-icon">💰</div>
      <div class="bal-lbl" style="color:var(--teald);">RECEIVED</div>
      <div class="bal-val">${INR(ti)}</div>
    </div>
    <div class="bal-card" style="background:var(--blush);">
      <div class="bal-icon">💸</div>
      <div class="bal-lbl" style="color:var(--rose);">SPENT</div>
      <div class="bal-val">${INR(te)}</div>
    </div>
    <div class="bal-card" style="background:${b >= 0 ? "var(--lemon)" : "#FFE8E8"};">
      <div class="bal-icon">⚖️</div>
      <div class="bal-lbl" style="color:${b >= 0 ? "var(--yellow)" : "var(--rose)"};">BALANCE</div>
      <div class="bal-val">${INR(Math.abs(b))}</div>
    </div>
  </div>`;

  // Savings + pie in a grid
  el.innerHTML += `<div class="dash-grid">
  <div class="card fade-up" style="animation-delay:.05s">
    <div class="savings-row">
      <div>
        <div class="lbl">SAVINGS RATE</div>
        <div class="savings-num" style="color:${good ? "var(--teald)" : "var(--coral)"};">${savR()}<span style="font-size:20px">%</span></div>
      </div>
      <div class="savings-badge" style="background:${good ? "var(--mint)" : "var(--peach)"};color:${good ? "var(--teald)" : "var(--corald)"};">
        ${sr > 30 ? "Excellent!" : sr > 15 ? "On track 👍" : "Save more"}
      </div>
    </div>
    <div class="prog-bg"><div class="prog-fill" style="width:${Math.min(100, Math.max(0, sr))}%;background:${good ? "linear-gradient(90deg,var(--teal),var(--teald))" : "linear-gradient(90deg,var(--coral),var(--corald))"}"></div></div>
  </div>

  <div class="stat-card fade-up" style="background:var(--sky);animation-delay:.08s">
    <div class="stat-icon">📝</div>
    <div class="lbl" style="color:var(--blue);">TRANSACTIONS</div>
    <div class="stat-val">${monthE().length}</div>
  </div>
  <div class="stat-card fade-up" style="background:var(--peach);animation-delay:.1s">
    <div class="stat-icon">📅</div>
    <div class="lbl" style="color:var(--corald);">AVG / DAY</div>
    <div class="stat-val">${te > 0 ? INR(Math.round(te / new Date(viewY, viewM + 1, 0).getDate())) : "₹0"}</div>
  </div>
  <div class="stat-card fade-up" style="background:${top ? top.bg : "var(--border)"};animation-delay:.12s">
    <div class="stat-icon">${top ? top.em : "—"}</div>
    <div class="lbl" style="color:${top ? top.ac : "var(--muted)"};">TOP CATEGORY</div>
    <div class="stat-val" style="font-size:15px;">${top ? top.label : "—"}</div>
  </div>
  <div class="stat-card fade-up" style="background:var(--blush);animation-delay:.14s">
    <div class="stat-icon">💸</div>
    <div class="lbl" style="color:var(--rose);">LARGEST SPEND</div>
    <div class="stat-val">${monthExps().length ? INR(Math.max(...monthExps().map(e => e.amount))) : "₹0"}</div>
  </div>

  ${cd.length > 0 ? `<div class="card full fade-up" style="animation-delay:.16s">
    <div class="lbl" style="margin-bottom:14px;">WHERE YOUR MONEY GOES</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;">
      <div><canvas id="pie-ch" height="220"></canvas></div>
      <div id="pie-legend"></div>
    </div>
  </div>`: ""}

  ${buildDailyBarHTML()}
  ${buildTrendHTML()}

  </div>`;

  if (monthE().length === 0) {
    el.innerHTML += `<div class="empty-state"><div class="empty-icon">👛</div><div class="empty-title">No entries yet</div><div class="empty-sub">Tap + to record your first transaction</div></div>`;
  }

  setTimeout(() => {
    if (cd.length > 0) {
      const ctx = document.getElementById("pie-ch");
      if (ctx) { charts.pie = new Chart(ctx, { type: "doughnut", data: { labels: cd.map(c => c.label), datasets: [{ data: cd.map(c => c.value), backgroundColor: cd.map(c => c.ac), borderColor: cd.map(c => c.bg), borderWidth: 3 }] }, options: { cutout: "62%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.label}: ${INR(c.parsed)}` } } } } }); }
      const leg = document.getElementById("pie-legend");
      if (leg) leg.innerHTML = cd.map(c => `<div class="cat-row"><div class="cat-icon" style="background:${c.bg};">${c.em}</div><span style="flex:1;font-size:13px;font-weight:700;">${c.label}</span><span style="font-weight:900;font-size:13px;">${INR(c.value)}</span></div>`).join("");
    }
    // bar chart
    const bctx = document.getElementById("bar-ch");
    if (bctx) {
      const dm = {}; monthExps().forEach(e => { const d = e.date.slice(8); dm[d] = (dm[d] || 0) + e.amount; });
      const keys = Object.keys(dm).sort();
      charts.bar = new Chart(bctx, { type: "bar", data: { labels: keys.map(d => +d), datasets: [{ data: keys.map(d => dm[d]), backgroundColor: "#FFB347", borderRadius: 6, barThickness: 10 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => INR(c.parsed.y) } } }, scales: { x: { grid: { display: false }, ticks: { font: { family: "Nunito", weight: "700" }, color: "#9A968F" } }, y: { display: false } } } });
    }
    // line chart
    const lctx = document.getElementById("line-ch");
    if (lctx) {
      const tm = {}; entries.forEach(e => { const d = new Date(e.date); const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`; if (!tm[k]) tm[k] = { label: MONTHS[d.getMonth()], exp: 0, inc: 0 }; if (e.type === "expense") tm[k].exp += e.amount; else tm[k].inc += e.amount; });
      const trend = Object.entries(tm).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([, v]) => v);
      if (trend.length > 1) charts.line = new Chart(lctx, { type: "line", data: { labels: trend.map(t => t.label), datasets: [{ label: "Income", data: trend.map(t => t.inc), borderColor: "#5BBFA1", borderWidth: 2.5, pointRadius: 0, tension: .4, fill: false }, { label: "Expense", data: trend.map(t => t.exp), borderColor: "#FFB347", borderWidth: 2.5, pointRadius: 0, tension: .4, fill: false }] }, options: { plugins: { legend: { labels: { font: { family: "Nunito", weight: "700" }, color: "#9A968F", boxWidth: 18, boxHeight: 3 } } }, scales: { x: { grid: { display: false }, ticks: { font: { family: "Nunito", weight: "700" }, color: "#9A968F" } }, y: { display: false } } } });
    }
  }, 0);
}

function buildDailyBarHTML() {
  const dm = {}; monthExps().forEach(e => { const d = e.date.slice(8); dm[d] = (dm[d] || 0) + e.amount; });
  if (!Object.keys(dm).length) return "";
  return `<div class="card full fade-up" style="animation-delay:.2s"><div class="lbl" style="margin-bottom:14px;">DAILY SPENDING · ${MONTHS[viewM].toUpperCase()}</div><canvas id="bar-ch" height="130"></canvas></div>`;
}
function buildTrendHTML() {
  const tm = {}; entries.forEach(e => { const d = new Date(e.date); const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`; if (!tm[k]) tm[k] = { l: MONTHS[d.getMonth()], e: 0, i: 0 }; if (e.type === "expense") tm[k].e += e.amount; else tm[k].i += e.amount; });
  if (Object.keys(tm).length < 2) return "";
  return `<div class="card full fade-up" style="animation-delay:.24s"><div class="lbl" style="margin-bottom:14px;">6-MONTH TREND</div><canvas id="line-ch" height="140"></canvas></div>`;
}

// ── ENTRIES ───────────────────────────────────
function renderEntries(el) {
  const expPills = CATS.map(c => `<button class="pill" onclick="setFilter('${c.id}')" style="background:${filterCat === c.id ? c.ac : c.bg};color:${filterCat === c.id ? "#fff" : c.ac};">${c.em} ${c.label}</button>`).join("");
  el.innerHTML = `
  <div class="card fade-up" style="padding:14px 16px;">
    <div class="search-box"><span>🔍</span><input placeholder="Search entries…" value="${srch.replace(/"/g, "")}" oninput="srch=this.value;reListEntries()"/></div>
    <div class="filter-scroll">
      <button class="pill" onclick="setFilter('all')" style="background:${filterCat === "all" ? "var(--coral)" : "var(--border)"};color:${filterCat === "all" ? "#fff" : "var(--muted)"};">All</button>
      ${expPills}
    </div>
    <div class="sort-row">
      <span class="lbl">SORT:</span>
      ${["date", "amount", "category"].map(s => `<button class="sort-btn ${sortBy === s ? "on" : ""}" onclick="setSortBy('${s}')">${s}</button>`).join("")}
    </div>
  </div>
  <div class="entries-list" id="entries-list"></div>`;
  reListEntries();
}

function setFilter(c) { filterCat = c; renderEntries(document.getElementById("page-body")); }
function setSortBy(s) { sortBy = s; renderEntries(document.getElementById("page-body")); }
function reListEntries() {
  const list = document.getElementById("entries-list");
  if (!list) return;
  let me = [...monthE()];
  if (filterCat !== "all") me = me.filter(e => e.cat === filterCat);
  if (srch) me = me.filter(e => e.note.toLowerCase().includes(srch.toLowerCase()));
  me.sort((a, b) => sortBy === "date" ? new Date(b.date) - new Date(a.date) : sortBy === "amount" ? b.amount - a.amount : a.cat.localeCompare(b.cat));
  if (!me.length) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Nothing here</div><div class="empty-sub">Try a different filter or month</div></div>`; return; }
  list.innerHTML = me.map(e => {
    const c = catOf(e.cat);
    return `<div class="entry-row">
      <div class="cat-icon" style="background:${c.bg};font-size:20px;">${c.em}</div>
      <div style="flex:1;min-width:0;">
        <div class="entry-note">${e.note || c.label}
          ${e.recur ? `<span class="chip" style="background:var(--lavender);color:var(--lilac);">RECUR</span>` : ""}
          ${e.tag ? `<span class="chip" style="background:var(--lemon);color:var(--yellow);">#${e.tag}</span>` : ""}
        </div>
        <div class="entry-meta">📅 ${e.date}${e.people?.length > 0 ? ` · ✂️ ${e.people.length} people · ${INR(e.perPerson)}/each` : ""}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-weight:900;font-size:16px;color:${e.type === "income" ? "var(--teald)" : "var(--text)"};">${e.type === "income" ? "+" : "-"}${INR(e.amount)}</div>
        <button class="del-btn" onclick="delEntry('${e.id}')">🗑</button>
      </div>
    </div>`;
  }).join("");
}
function delEntry(id) { if (!confirm("Remove this entry?")) return; entries = entries.filter(e => e.id !== id); saveAll(); reListEntries(); }

// ── SPLIT & GROUPS (Splitwise-style) ──────────
function renderSplit(el) {
  const g = activeGroupId ? groups.find(g => g.id === activeGroupId) : null;

  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;" class="fade-up">
    <div>
      <div style="font-family:'Playfair Display',serif;font-size:22px;color:var(--corald);">Groups &amp; Splits</div>
      <div style="font-size:13px;font-weight:700;color:var(--muted);">Splitwise-style expense sharing</div>
    </div>
    <button class="fab-btn" onclick="openGroupModal()">+ New Group</button>
  </div>`;

  if (!groups.length) {
    el.innerHTML += `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No groups yet</div><div class="empty-sub">Create a group for trips, flatmates or dining</div></div>`;
    return;
  }

  el.innerHTML += `<div class="split-layout">
    <div>
      <div class="lbl" style="margin-bottom:10px;">YOUR GROUPS</div>
      ${groups.map(g => renderGroupCard(g)).join("")}
    </div>
    <div id="group-detail">${g ? renderGroupDetail(g) : renderGroupDetailEmpty()}</div>
  </div>`;
}

function renderGroupCard(g) {
  const balances = calcGroupBalances(g);
  const myBal = balances[currentUser.name] || 0;
  const active = activeGroupId === g.id;
  return `<div class="group-card ${active ? "active" : ""}" onclick="selectGroup('${g.id}')">
    <div class="group-head">
      <div class="group-avatar" style="background:var(--peach);">${g.emoji}</div>
      <div>
        <div class="group-name">${g.name}</div>
        <div class="group-meta">${g.members.length} members · ${g.expenses?.length || 0} expenses</div>
      </div>
    </div>
    <div class="group-bal">
      <div class="group-bal-item" style="background:${myBal >= 0 ? "var(--mint)" : "var(--blush)"};">
        <div class="group-bal-lbl" style="color:${myBal >= 0 ? "var(--teald)" : "var(--rose)"};">${myBal >= 0 ? "YOU GET" : "YOU OWE"}</div>
        <div class="group-bal-val" style="color:${myBal >= 0 ? "var(--teald)" : "var(--rose)"};">${INR(Math.abs(myBal))}</div>
      </div>
      <div class="group-bal-item" style="background:var(--sky);">
        <div class="group-bal-lbl" style="color:var(--blue);">TOTAL SPENT</div>
        <div class="group-bal-val" style="color:var(--blue);">${INR((g.expenses || []).reduce((s, e) => s + e.amount, 0))}</div>
      </div>
    </div>
  </div>`;
}

function renderGroupDetailEmpty() {
  return `<div class="card" style="text-align:center;padding:40px 20px;"><div style="font-size:44px;margin-bottom:12px;">👈</div><div style="font-family:'Playfair Display',serif;font-size:18px;color:var(--muted);">Select a group</div></div>`;
}

function renderGroupDetail(g) {
  const balances = calcGroupBalances(g);
  const settlements = calcSettlements(g);
  const expenses = g.expenses || [];

  return `<div>
    <!-- Group header -->
    <div class="card fade-up" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:30px;">${g.emoji}</div>
          <div>
            <div style="font-weight:900;font-size:18px;">${g.name}</div>
            <div style="font-size:12px;font-weight:700;color:var(--muted);">${g.members.length} members</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="fab-btn" onclick="openGexpModal('${g.id}')">+ Expense</button>
          <button onclick="deleteGroup('${g.id}')" style="background:none;border:1.5px solid var(--border);border-radius:12px;padding:8px 12px;cursor:pointer;font-size:13px;color:var(--muted);">🗑</button>
        </div>
      </div>
      <!-- Members & balances -->
      <div class="lbl" style="margin-bottom:8px;">MEMBER BALANCES</div>
      ${g.members.map((m, i) => `<div class="member-row">
        <div class="member-avatar" style="background:${COLORS[i % COLORS.length]};">${m.name[0].toUpperCase()}</div>
        <div class="member-name">${m.name}${m.name === currentUser.name ? " (you)" : ""}</div>
        <div class="member-bal" style="color:${(balances[m.name] || 0) >= 0 ? "var(--teald)" : "var(--rose)"};">
          ${(balances[m.name] || 0) >= 0 ? "+" : ""}${INR(balances[m.name] || 0)}
        </div>
      </div>`).join("")}
    </div>

    <!-- Settlements -->
    ${settlements.length > 0 ? `<div class="card fade-up" style="margin-bottom:12px;">
      <div class="lbl" style="margin-bottom:10px;">WHO PAYS WHOM</div>
      ${settlements.map(s => `<div class="settle-row">
        <div class="member-avatar" style="width:32px;height:32px;font-size:13px;background:${COLORS[g.members.findIndex(m => m.name === s.from) % COLORS.length] || "#ccc"};">${s.from[0].toUpperCase()}</div>
        <div style="font-size:13px;font-weight:700;flex:1;">${s.from}</div>
        <div class="settle-arrow">→</div>
        <div style="font-size:13px;font-weight:700;flex:1;">${s.to}</div>
        <button class="settle-amt-btn" onclick="markSettled('${g.id}','${s.from}','${s.to}',${s.amount})">${INR(s.amount)} Settle</button>
      </div>`).join("")}
    </div>`: ""}

    <!-- Expenses list -->
    <div class="card fade-up">
      <div class="lbl" style="margin-bottom:10px;">EXPENSES (${expenses.length})</div>
      ${expenses.length === 0 ? `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;font-weight:700;">No expenses yet. Add one!</div>` : ""}
      ${expenses.slice().reverse().map(e => `<div class="expense-item">
        <div class="expense-icon" style="background:var(--peach);">🧾</div>
        <div class="expense-desc">
          <div class="expense-name">${e.desc}</div>
          <div class="expense-payer">Paid by <strong>${e.paidBy}</strong> · ${e.date}</div>
        </div>
        <div class="expense-amt">
          <div class="expense-total">${INR(e.amount)}</div>
          <div class="expense-share" style="color:var(--muted);">÷ ${g.members.length}</div>
        </div>
        <button class="del-btn" onclick="delGroupExpense('${g.id}','${e.id}')">🗑</button>
      </div>`).join("")}
    </div>
  </div>`;
}

function calcGroupBalances(g) {
  const bal = {};
  g.members.forEach(m => bal[m.name] = 0);
  (g.expenses || []).forEach(exp => {
    const perPerson = exp.amount / g.members.length;
    // payer gets credit
    bal[exp.paidBy] = (bal[exp.paidBy] || 0) + exp.amount;
    // everyone owes their share
    g.members.forEach(m => { bal[m.name] = (bal[m.name] || 0) - perPerson; });
  });
  // apply settlements
  (g.settlements || []).forEach(s => {
    bal[s.from] = (bal[s.from] || 0) + s.amount;
    bal[s.to] = (bal[s.to] || 0) - s.amount;
  });
  return bal;
}

function calcSettlements(g) {
  const bal = calcGroupBalances(g);
  const debtors = Object.entries(bal).filter(([, v]) => v < -0.01).map(([n, v]) => ({ name: n, amt: -v })).sort((a, b) => b.amt - a.amt);
  const creditors = Object.entries(bal).filter(([, v]) => v > 0.01).map(([n, v]) => ({ name: n, amt: v })).sort((a, b) => b.amt - a.amt);
  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0.5) settlements.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(pay) });
    debtors[i].amt -= pay; creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return settlements;
}

function selectGroup(id) {
  activeGroupId = id;
  destroyCharts();
  renderSplit(document.getElementById("page-body"));
}

function deleteGroup(id) {
  if (!confirm("Delete this group and all its expenses?")) return;
  groups = groups.filter(g => g.id !== id);
  if (activeGroupId === id) activeGroupId = null;
  saveAll(); renderSplit(document.getElementById("page-body"));
}

function delGroupExpense(gid, eid) {
  if (!confirm("Remove this expense?")) return;
  const g = groups.find(g => g.id === gid);
  if (g) { g.expenses = g.expenses.filter(e => e.id !== eid); saveAll(); renderSplit(document.getElementById("page-body")); }
}

function markSettled(gid, from, to, amount) {
  const g = groups.find(g => g.id === gid);
  if (!g) return;
  if (!g.settlements) g.settlements = [];
  g.settlements.push({ id: genId(), from, to, amount, date: new Date().toISOString().slice(0, 10) });
  saveAll(); renderSplit(document.getElementById("page-body"));
}

// ── GROUP MODAL ───────────────────────────────
let memberFields = [currentUser?.name || ""];

function openGroupModal() {
  memberFields = [currentUser?.name || ""];
  document.getElementById("gm-name").value = "";
  renderMemberFields();
  document.getElementById("group-modal-bg").classList.add("open");
}
function closeGroupModal() { document.getElementById("group-modal-bg").classList.remove("open"); }

function renderMemberFields() {
  document.getElementById("members-list").innerHTML = memberFields.map((m, i) => `
    <div class="member-input-row">
      <input class="ifield" style="margin-bottom:0;" placeholder="Member name" value="${m}" oninput="memberFields[${i}]=this.value" ${i === 0 ? "readonly" : ""}/>
      ${i > 0 ? `<button class="remove-member" onclick="removeMember(${i})">✕</button>` : "<span style='width:26px;'></span>"}
    </div>`).join("");
}
function addMemberField() { memberFields.push(""); renderMemberFields(); }
function removeMember(i) { memberFields.splice(i, 1); renderMemberFields(); }

function saveGroup() {
  const name = document.getElementById("gm-name").value.trim();
  const emoji = document.getElementById("gm-emoji").value;
  const members = memberFields.map(m => m.trim()).filter(Boolean);
  if (!name) { alert("Enter a group name"); return; }
  if (members.length < 2) { alert("Add at least 2 members"); return; }
  groups.push({ id: genId(), name, emoji, members: members.map(n => ({ id: genId(), name: n })), expenses: [], settlements: [] });
  saveAll(); closeGroupModal();
  renderSplit(document.getElementById("page-body"));
}

// ── GROUP EXPENSE MODAL ───────────────────────
let currentGroupId = null;

function openGexpModal(gid) {
  currentGroupId = gid;
  const g = groups.find(g => g.id === gid);
  if (!g) return;
  document.getElementById("ge-amt").value = "";
  document.getElementById("ge-desc").value = "";
  document.getElementById("ge-date").value = new Date().toISOString().slice(0, 10);
  splitType = "equal";
  document.querySelectorAll(".split-type-btn").forEach((b, i) => b.classList.toggle("on", i === 0));
  const payer = document.getElementById("ge-payer");
  payer.innerHTML = g.members.map(m => `<option value="${m.name}" ${m.name === currentUser.name ? "selected" : ""}>${m.name}</option>`).join("");
  updateSplitBreakdown();
  document.getElementById("gexp-modal-bg").classList.add("open");
}
function closeGexpModal() { document.getElementById("gexp-modal-bg").classList.remove("open"); }

function setSplitType(t, btn) {
  splitType = t;
  document.querySelectorAll(".split-type-btn").forEach(b => b.classList.remove("on"));
  btn.classList.add("on");
  updateSplitBreakdown();
}

function updateSplitBreakdown() {
  const g = groups.find(g => g.id === currentGroupId);
  if (!g) return;
  const amt = parseFloat(document.getElementById("ge-amt").value) || 0;
  const wrap = document.getElementById("split-breakdown-wrap");
  if (!wrap) return;
  if (!amt) { wrap.innerHTML = ""; return; }

  if (splitType === "equal") {
    const per = amt / g.members.length;
    wrap.innerHTML = `<div class="split-breakdown"><div style="font-size:12px;font-weight:800;color:var(--teald);margin-bottom:6px;">EQUAL SPLIT</div>${g.members.map(m => `<div class="split-breakdown-row"><span>${m.name}</span><span style="font-weight:900;">${INR(Math.round(per))}</span></div>`).join("")}</div>`;
  } else if (splitType === "percent") {
    wrap.innerHTML = `<div class="split-breakdown"><div style="font-size:12px;font-weight:800;color:var(--teald);margin-bottom:6px;">SET PERCENTAGES (must total 100%)</div>${g.members.map(m => `<div class="split-breakdown-row"><span>${m.name}</span><input type="number" id="pct-${m.name.replace(/\s/g, '_')}" placeholder="%" style="width:64px;border:1.5px solid var(--border);border-radius:8px;padding:4px 8px;font-weight:700;font-size:13px;" oninput="updateSplitBreakdown()"/></div>`).join("")}</div>`;
  } else {
    wrap.innerHTML = `<div class="split-breakdown"><div style="font-size:12px;font-weight:800;color:var(--teald);margin-bottom:6px;">ENTER EXACT AMOUNTS</div>${g.members.map(m => `<div class="split-breakdown-row"><span>${m.name}</span><input type="number" id="exact-${m.name.replace(/\s/g, '_')}" placeholder="₹" style="width:80px;border:1.5px solid var(--border);border-radius:8px;padding:4px 8px;font-weight:700;font-size:13px;"/></div>`).join("")}</div>`;
  }
}

function saveGroupExpense() {
  const g = groups.find(g => g.id === currentGroupId);
  if (!g) return;
  const amt = parseFloat(document.getElementById("ge-amt").value);
  const desc = document.getElementById("ge-desc").value || "Expense";
  const date = document.getElementById("ge-date").value || new Date().toISOString().slice(0, 10);
  const paidBy = document.getElementById("ge-payer").value;
  if (!amt || isNaN(amt)) { alert("Enter a valid amount"); return; }

  let shares = {};
  if (splitType === "equal") {
    const per = amt / g.members.length;
    g.members.forEach(m => shares[m.name] = per);
  } else if (splitType === "percent") {
    let total = 0;
    g.members.forEach(m => { const v = parseFloat(document.getElementById(`pct-${m.name.replace(/\s/g, "_")}`)?.value || 0); shares[m.name] = amt * v / 100; total += v; });
    if (Math.abs(total - 100) > 0.5) { alert("Percentages must total 100%"); return; }
  } else {
    let total = 0;
    g.members.forEach(m => { const v = parseFloat(document.getElementById(`exact-${m.name.replace(/\s/g, "_")}`)?.value || 0); shares[m.name] = v; total += v; });
    if (Math.abs(total - amt) > 1) { alert(`Exact amounts must total ${INR(amt)}`); return; }
  }

  if (!g.expenses) g.expenses = [];
  g.expenses.push({ id: genId(), desc, amount: amt, paidBy, splitType, shares, date });
  saveAll(); closeGexpModal();
  renderSplit(document.getElementById("page-body"));
}

// ── GOALS ─────────────────────────────────────
function renderGoals(el) {
  const te = totExp(), exps = monthExps();
  el.innerHTML = `<div class="goals-grid fade-up" id="goals-grid"></div>`;
  const grid = document.getElementById("goals-grid");
  goals.forEach(g => {
    const spent = g.cat === "all" ? te : exps.filter(e => e.cat === g.cat).reduce((s, e) => s + e.amount, 0);
    const pct = Math.min(100, (spent / g.target) * 100);
    const over = spent > g.target;
    const c = catOf(g.cat);
    grid.innerHTML += `<div class="goal-card">
      <div class="goal-head">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="goal-icon-wrap" style="background:${c.bg};">${c.em}</div>
          <div><div style="font-weight:800;font-size:15px;">${g.label}</div><div style="font-size:11px;font-weight:700;color:var(--muted);">${g.cat === "all" ? "All categories" : c.label}</div></div>
        </div>
        <button class="close-btn" onclick="delGoal('${g.id}')">✕</button>
      </div>
      <div class="goal-amounts"><span style="color:var(--muted);">${INR(spent)} spent</span><span style="color:${over ? "#D04040" : "var(--teald)"};">of ${INR(g.target)}</span></div>
      <div class="prog-bg"><div class="prog-fill" style="width:${pct}%;background:${over ? "linear-gradient(90deg,#D04040,var(--rose))" : "linear-gradient(90deg,var(--teal),var(--teald))"}"></div></div>
      <div class="goal-status" style="color:${over ? "#D04040" : "var(--muted)"};">${over ? `⚠ Over budget by ${INR(spent - g.target)}` : `${INR(g.target - spent)} remaining · ${pct.toFixed(0)}% used`}</div>
    </div>`;
  });
  // Add goal form
  const catOpts = `<option value="all">All Categories</option>${CATS.filter(c => c.id !== "income").map(c => `<option value="${c.id}">${c.em} ${c.label}</option>`).join("")}`;
  grid.innerHTML += `<div class="goal-card" style="border-style:dashed;">
    <div style="font-family:'Playfair Display',serif;font-size:18px;color:var(--corald);margin-bottom:14px;">+ New Goal</div>
    <input class="ifield" id="g-label" placeholder="Goal name e.g. Monthly Budget"/>
    <input class="ifield" id="g-target" type="number" placeholder="Target amount (₹)"/>
    <select class="ifield" id="g-cat">${catOpts}</select>
    <button class="save-btn" onclick="saveGoal()">Add Goal</button>
  </div>`;
}
function saveGoal() {
  const label = document.getElementById("g-label").value.trim();
  const target = parseFloat(document.getElementById("g-target").value);
  const cat = document.getElementById("g-cat").value;
  if (!label || !target) { alert("Fill all fields"); return; }
  goals.push({ id: genId(), label, target, cat });
  saveAll(); render();
}
function delGoal(id) { if (!confirm("Remove this goal?")) return; goals = goals.filter(g => g.id !== id); saveAll(); render(); }

// ── INSIGHTS ──────────────────────────────────
function renderInsights(el) {
  const te = totExp(), ti = totInc(), sr = parseFloat(savR()), cd = catData(), me = monthE(), exps = monthExps();
  const top = cd[0];
  const msgs = [];
  if (te > 0) {
    if (top) msgs.push({ em: "📊", bg: "var(--peach)", ac: "var(--corald)", txt: `Biggest spend: <strong>${top.label}</strong> at ${INR(top.value)} (${((top.value / te) * 100).toFixed(0)}% of total).` });
    if (sr < 20 && ti > 0) msgs.push({ em: "⚠️", bg: "#FFE8E8", ac: "#D04040", txt: `Saving only ${savR()}% this month. Aim for at least <strong>20%</strong> of income.` });
    if (sr >= 30) msgs.push({ em: "⭐", bg: "var(--mint)", ac: "var(--teald)", txt: `Saving <strong>${savR()}%</strong> this month — excellent financial discipline!` });
    const foodAmt = exps.filter(e => e.cat === "food").reduce((s, e) => s + e.amount, 0);
    if (foodAmt > te * 0.35) msgs.push({ em: "🍜", bg: "var(--lemon)", ac: "var(--yellow)", txt: `Food is <strong>${((foodAmt / te) * 100).toFixed(0)}%</strong> of spending. Home cooking could cut this.` });
    const recurAmt = me.filter(e => e.recur).reduce((s, e) => s + e.amount, 0);
    if (recurAmt > 0) msgs.push({ em: "🔁", bg: "var(--lavender)", ac: "var(--lilac)", txt: `<strong>${INR(recurAmt)}/month</strong> in recurring charges. Review if all still needed.` });
  }

  const tagMap = me.filter(e => e.tag).reduce((acc, e) => { acc[e.tag] = (acc[e.tag] || 0) + e.amount; return acc; }, {});
  const recurItems = me.filter(e => e.recur);

  el.innerHTML = `
  <div style="background:linear-gradient(135deg,var(--peach),var(--lemon));border-radius:22px;padding:18px 20px;margin-bottom:14px;border:1.5px solid rgba(255,179,71,.25);" class="fade-up">
    <div style="font-family:'Playfair Display',serif;font-size:24px;color:var(--corald);">Smart Tips</div>
    <div style="font-size:13px;font-weight:700;color:var(--muted);margin-top:4px;">Based on your actual spending this month.</div>
  </div>
  ${msgs.length === 0 ? `<div class="empty-state"><div class="empty-icon">💡</div><div class="empty-title">Add expenses to unlock insights</div></div>` : ""}
  ${msgs.map((m, i) => `<div class="insight-card fade-up" style="background:${m.bg};border-left-color:${m.ac};animation-delay:${i * .06}s;"><div class="insight-icon">${m.em}</div><div class="insight-txt">${m.txt}</div></div>`).join("")}
  ${Object.keys(tagMap).length > 0 ? `<div class="card fade-up" style="margin-top:14px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">🏷️ <span class="lbl">SPENDING BY TAG</span></div>
    ${Object.entries(tagMap).map(([tag, amt]) => `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;"><span class="chip" style="background:var(--lemon);color:var(--yellow);">#${tag}</span><span style="font-weight:900;font-size:14px;">${INR(amt)}</span></div>`).join("")}
  </div>`: ""}
  ${recurItems.length > 0 ? `<div class="card fade-up" style="margin-top:14px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">🔁 <span class="lbl">RECURRING CHARGES</span></div>
    ${recurItems.map(e => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);"><span style="font-size:13px;font-weight:700;">${catOf(e.cat).em} ${e.note || catOf(e.cat).label}</span><span style="font-weight:900;color:var(--rose);">-${INR(e.amount)}</span></div>`).join("")}
    <div style="display:flex;justify-content:space-between;padding-top:10px;font-weight:900;font-size:14px;"><span>Total/month</span><span style="color:var(--rose);">-${INR(recurItems.reduce((s, e) => s + e.amount, 0))}</span></div>
  </div>`: ""}`;
}

// ══════════════════════════════════════════════
// ADD ENTRY MODAL
// ══════════════════════════════════════════════
function openModal() {
  document.getElementById("f-date").value = new Date().toISOString().slice(0, 10);
  buildCatGrid();
  document.getElementById("modal-bg").classList.add("open");
}
function closeModal() {
  document.getElementById("modal-bg").classList.remove("open");
  ["f-amt", "f-note", "f-tag", "f-people"].forEach(id => document.getElementById(id).value = "");
  fRecur = false; fSplitOn = false;
  updateRecurBtn(); updateSplitBtn();
  document.getElementById("split-section").classList.add("hidden");
  document.getElementById("per-preview").classList.add("hidden");
}
function handleModalBg(e) { if (e.target === e.currentTarget) closeModal(); }

function setFType(t) {
  fType = t;
  document.getElementById("tog-exp").className = "tog-btn " + (t === "expense" ? "on" : "off");
  document.getElementById("tog-inc").className = "tog-btn " + (t === "income" ? "on" : "off");
  document.getElementById("split-btn").style.display = t === "expense" ? "flex" : "none";
  buildCatGrid();
}
function buildCatGrid() {
  const grid = document.getElementById("cat-grid");
  if (!grid) return;
  if (fType === "income") { grid.style.display = "none"; return; }
  grid.style.display = "grid";
  grid.innerHTML = CATS.filter(c => c.id !== "income").map(c => `<button class="cat-chip-btn ${fCat === c.id ? "on" : ""}" style="background:${fCat === c.id ? c.bg : "#F8F5F1"};color:${fCat === c.id ? c.ac : "var(--muted)"};border-color:${fCat === c.id ? c.ac : "transparent"};" onclick="selectCat('${c.id}')"><span style="font-size:20px;">${c.em}</span>${c.label}</button>`).join("");
}
function selectCat(id) { fCat = id; buildCatGrid(); }
function toggleRecur() { fRecur = !fRecur; updateRecurBtn(); }
function updateRecurBtn() {
  const btn = document.getElementById("recur-btn");
  btn.style.background = fRecur ? "var(--lavender)" : "var(--border)";
  btn.style.color = fRecur ? "var(--lilac)" : "var(--muted)";
  document.getElementById("recur-chk").textContent = fRecur ? "☑" : "☐";
}
function toggleSplitModal() {
  fSplitOn = !fSplitOn; updateSplitBtn();
  document.getElementById("split-section").classList.toggle("hidden", !fSplitOn);
}
function updateSplitBtn() {
  const btn = document.getElementById("split-btn");
  btn.style.background = fSplitOn ? "var(--mint)" : "var(--border)";
  btn.style.color = fSplitOn ? "var(--teald)" : "var(--muted)";
  document.getElementById("split-chk").textContent = fSplitOn ? "☑" : "☐";
}
function updatePerPreview() {
  const amt = parseFloat(document.getElementById("f-amt").value || 0);
  const ppl = (document.getElementById("f-people").value || "").split(",").map(s => s.trim()).filter(Boolean);
  const prev = document.getElementById("per-preview");
  if (fSplitOn && amt && ppl.length > 1) { prev.classList.remove("hidden"); document.getElementById("per-amt-txt").textContent = `Each pays: ${INR(Math.round(amt / ppl.length))}`; }
  else prev.classList.add("hidden");
}
document.getElementById("f-amt").addEventListener("input", updatePerPreview);

function saveEntry() {
  const amt = parseFloat(document.getElementById("f-amt").value);
  if (!amt || isNaN(amt)) { alert("Enter a valid amount"); return; }
  const note = document.getElementById("f-note").value;
  const date = document.getElementById("f-date").value || new Date().toISOString().slice(0, 10);
  const tag = (document.getElementById("f-tag").value || "").replace("#", "");
  const people = fSplitOn ? (document.getElementById("f-people").value || "").split(",").map(s => s.trim()).filter(Boolean) : [];
  const perPerson = people.length > 1 ? +(amt / people.length).toFixed(2) : null;
  const newEntry = { id: genId(), type: fType, cat: fType === "income" ? "income" : fCat, amount: amt, note, date, people, perPerson, tag, recur: fRecur };

  entries.unshift(newEntry);
  saveAll();      // localStorage, as before
  closeModal();
  render();

  // also save to MySQL
  fetch("http://localhost:3002/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: currentUser.id,
      type: newEntry.type,
      category: newEntry.cat,
      amount: newEntry.amount,
      note: newEntry.note,
      expense_date: newEntry.date
    })
  }).catch(err => console.error("Failed to sync entry to server:", err));
}

// ══════════════════════════════════════════════
// DARK / LIGHT MODE
// ══════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem("spendwise_theme") || "light";
  setTheme(saved);
}

function setTheme(t) {
  document.body.classList.toggle("dark", t === "dark");
  localStorage.setItem("spendwise_theme", t);
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.textContent = t === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark");
  setTheme(isDark ? "light" : "dark");
}

// ══════════════════════════════════════════════
// PROFILE PAGE
// ══════════════════════════════════════════════
function openProfile() {
  closeSidebar();
  curTab = "profile";
  document.getElementById("page-title").textContent = "Profile";
  destroyCharts();
  renderProfile(document.getElementById("page-body"));
}

function renderProfile(el) {
  const u = currentUser;
  el.innerHTML = `
    <div class="profile-wrap fade-up">

      <!-- Hero card -->
      <div class="profile-hero">
        <div class="profile-avatar-big">${u.name[0].toUpperCase()}</div>
        <div>
          <div class="profile-hero-name">${u.name}</div>
          <div class="profile-hero-email">${u.email}</div>
        </div>
      </div>

      <!-- Edit name & email -->
      <div class="card" style="margin-bottom:12px;">
        <div class="profile-section-title">Personal Info</div>
        <input class="ifield" id="p-name" placeholder="Your name" value="${u.name}" />
        <input class="ifield" id="p-email" type="email" placeholder="Email address" value="${u.email}" />
        <button class="profile-save-btn" onclick="saveProfileInfo()">Save Changes</button>
        <div class="profile-msg" id="info-msg"></div>
      </div>

      <!-- Change password -->
      <div class="card" style="margin-bottom:12px;">
        <div class="profile-section-title">Change Password</div>
        <input class="ifield" id="p-curpass" type="password" placeholder="Current password" />
        <input class="ifield" id="p-newpass" type="password" placeholder="New password (min 6 chars)" />
        <input class="ifield" id="p-conpass" type="password" placeholder="Confirm new password" />
        <button class="profile-save-btn" onclick="saveProfilePassword()">Update Password</button>
        <div class="profile-msg" id="pass-msg"></div>
      </div>

      <!-- Danger zone -->
      <div class="card" style="border-color:var(--rose);">
        <div class="profile-section-title" style="color:var(--rose);">Account</div>
        <button onclick="doLogout()" style="width:100%;padding:13px;background:var(--blush);color:var(--rose);border:none;border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;">
          🚪 Sign Out
        </button>
      </div>

    </div>`;
}

async function saveProfileInfo() {
  const name = document.getElementById("p-name").value.trim();
  const email = document.getElementById("p-email").value.trim();
  const msg = document.getElementById("info-msg");
  msg.className = "profile-msg";

  if (!name || !email) { showProfileMsg(msg, "error", "Please fill all fields."); return; }

  try {
    const res = await fetch(`http://localhost:3002/api/auth/update-profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentUser.id, name, email })
    });
    const data = await res.json();
    if (res.ok) {
      currentUser.name = name;
      currentUser.email = email;
      localStorage.setItem("paisa_current_user", JSON.stringify(currentUser));
      document.getElementById("user-name-display").textContent = name;
      document.getElementById("user-email-display").textContent = email;
      document.getElementById("user-avatar").textContent = name[0].toUpperCase();
      showProfileMsg(msg, "success", "✅ Profile updated!");
      renderProfile(document.getElementById("page-body"));
    } else {
      showProfileMsg(msg, "error", data.message || "Update failed.");
    }
  } catch (e) {
    showProfileMsg(msg, "error", "Server error. Please try again.");
  }
}

async function saveProfilePassword() {
  const cur = document.getElementById("p-curpass").value;
  const np = document.getElementById("p-newpass").value;
  const cp = document.getElementById("p-conpass").value;
  const msg = document.getElementById("pass-msg");
  msg.className = "profile-msg";

  if (!cur || !np || !cp) { showProfileMsg(msg, "error", "Fill all password fields."); return; }
  if (np.length < 6) { showProfileMsg(msg, "error", "New password must be at least 6 characters."); return; }
  if (np !== cp) { showProfileMsg(msg, "error", "New passwords don't match."); return; }

  try {
    const res = await fetch(`http://localhost:3002/api/auth/update-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentUser.id, currentPassword: cur, newPassword: np })
    });
    const data = await res.json();
    if (res.ok) {
      showProfileMsg(msg, "success", "✅ Password updated!");
      document.getElementById("p-curpass").value = "";
      document.getElementById("p-newpass").value = "";
      document.getElementById("p-conpass").value = "";
    } else {
      showProfileMsg(msg, "error", data.message || "Update failed.");
    }
  } catch (e) {
    showProfileMsg(msg, "error", "Server error. Please try again.");
  }
}

function showProfileMsg(el, type, text) {
  el.className = `profile-msg ${type}`;
  el.textContent = text;
  setTimeout(() => { el.className = "profile-msg"; }, 3500);
}
// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    buildCatGrid();
    initTheme();

    const u = localStorage.getItem("paisa_current_user");
    if (u) {
        try { loginSuccess(JSON.parse(u)); } catch (e) { }
    }
});