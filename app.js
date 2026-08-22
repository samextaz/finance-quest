const KEY = "financeQuest_v4_2";
const DEFAULT = {
  balance: 0,
  savings: 0,
  savingsGoal: 0,
  deferred: 0,
  bills: [],
  credits: [],
  expenses: [],
  incomes: [],
  completedCredits: [],
  settings: {
    overdraft: 100,
    salaryEuropcar: 0,
    salaryDominos: 0,
    ticketsRestaurant: 0,
    monthProgressKey: ""
  }
};

let state = load();
let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let chartMode = "freedom";

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function load() {
  try {
    const x = localStorage.getItem(KEY);
    return x ? merge(clone(DEFAULT), JSON.parse(x)) : clone(DEFAULT);
  } catch (_) { return clone(DEFAULT); }
}
function merge(a, b) {
  return {
    ...a,
    ...b,
    settings: { ...a.settings, ...(b.settings || {}) },
    bills: b.bills || [],
    credits: b.credits || [],
    expenses: b.expenses || [],
    incomes: b.incomes || [],
    completedCredits: b.completedCredits || []
  };
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function $(id) { return document.getElementById(id); }
function num(v) { return Number(String(v ?? 0).replace(",", ".")) || 0; }
function money(v) { return num(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
function iso(d) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
function localDate(key) { return new Date(key + "T12:00:00"); }
function uid(p) { return p + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function monthLabel(d) { return MONTHS[d.getMonth()] + " " + d.getFullYear(); }

/* =============================
   CRÉDITS / ÉCHÉANCES
   ============================= */
function creditTotalMonths(c) { return Math.max(1, Math.round(num(c.totalMonths || c.months || c.remaining || 1))); }
function creditStart(c) { return localDate(c.startDate || iso(new Date())); }
function addMonthsPreserveDay(date, months) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const targetMonth = d.getMonth() + months;
  const lastDay = new Date(d.getFullYear(), targetMonth + 1, 0).getDate();
  return new Date(d.getFullYear(), targetMonth, Math.min(date.getDate(), lastDay), 12);
}
function creditInstallmentDate(c, index) {
  return addMonthsPreserveDay(creditStart(c), index - 1);
}
function creditPaidCount(c, asOf = new Date()) {
  const total = creditTotalMonths(c);
  let paid = 0;
  for (let i = 1; i <= total; i++) {
    if (creditInstallmentDate(c, i) <= asOf) paid++;
  }
  return Math.min(total, paid);
}
function creditStatus(c, asOf = new Date()) {
  const total = creditTotalMonths(c);
  const paid = creditPaidCount(c, asOf);
  return { total, paid, remaining: Math.max(0, total - paid) };
}
function creditEndDate(c) { return creditInstallmentDate(c, creditTotalMonths(c)); }
function activeCredits() { return state.credits.filter(c => creditStatus(c).remaining > 0); }
function monthlyCredits() { return activeCredits().reduce((s, c) => s + num(c.monthly), 0); }
function debtRemaining() { return activeCredits().reduce((s, c) => s + num(c.monthly) * creditStatus(c).remaining, 0); }

function recurringBills() {
  return state.bills.filter(b => b.active !== false).reduce((s, b) => s + num(b.amount), 0);
}
function recurringIncome() {
  return state.incomes.filter(i => i.type === "recurrent").reduce((s, i) => s + num(i.amount), 0);
}
function pendingIncome() {
  return state.incomes.filter(i => !i.received).reduce((s, i) => s + num(i.amount), 0);
}
function monthExpenses() {
  const n = new Date();
  return state.expenses.filter(e => {
    const d = localDate(e.date);
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s, e) => s + num(e.amount), 0);
}
function monthDeferred() {
  const n = new Date();
  return state.expenses.filter(e => {
    const d = localDate(e.date);
    return e.payment === "deferred" && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s, e) => s + num(e.amount), 0);
}
function forecast() {
  return num(state.balance) + pendingIncome() + recurringIncome() - recurringBills() - monthlyCredits() - monthDeferred() - monthExpenses();
}
function freedom() {
  const inc = Math.max(1, recurringIncome());
  const margin = Math.max(0, inc - recurringBills() - monthlyCredits());
  const creditScore = Math.max(0, 1 - monthlyCredits() / inc);
  const savingsScore = Math.min(1, state.savings / Math.max(1, inc * 6));
  return Math.round((margin / inc) * 45 + creditScore * 35 + savingsScore * 20);
}

/* =============================
   NAVIGATION
   ============================= */
function setup() {
  document.querySelectorAll(".nav-btn").forEach(b => b.onclick = () => show(b.dataset.screen));
  $("settingsBtn").onclick = settingsModal;
  $("simulateBtn").onclick = simulation;
  $("prevMonth").onclick = () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); renderCalendar(); };
  $("nextMonth").onclick = () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); renderCalendar(); };
  $("todayBtn").onclick = () => { viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); renderCalendar(); };
  $("addCreditBtn").onclick = () => openDay(iso(new Date()), true);
  $("modalClose").onclick = closeModal;
  $("modal").onclick = e => { if (e.target === $("modal")) closeModal(); };
  document.querySelectorAll(".view-tab").forEach(b => b.onclick = () => { chartMode = b.dataset.view; renderEvolution(); });
  renderAll();
}
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id)?.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.screen === id));
  if (id === "calendarScreen") renderCalendar();
  if (id === "creditsScreen") renderCredits();
  if (id === "evolutionScreen") renderEvolution();
}
function openModal(title, body) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = body;
  $("modal").classList.remove("hidden");
}
function closeModal() {
  $("modal").classList.add("hidden");
  $("modalBody").innerHTML = "";
}

/* =============================
   ACCUEIL
   ============================= */
function renderHome() {
  $("currentBalance").textContent = money(state.balance);
  $("monthForecast").textContent = money(forecast());
  $("deferredTotal").textContent = money(state.deferred);
  $("incomePending").textContent = money(pendingIncome());
  $("billsPending").textContent = money(recurringBills() + monthlyCredits());
  $("monthExpenses").textContent = money(monthExpenses());
  $("monthIncome").textContent = money(recurringIncome() + state.incomes.filter(i => i.type === "oneoff" && i.received).reduce((s, i) => s + num(i.amount), 0));
  $("creditMonthlyTotal").textContent = money(monthlyCredits());
  $("savingsTotal").textContent = money(state.savings);
  const f = freedom();
  $("freedomIndex").textContent = f + " %";
  $("freedomText").textContent = f < 35 ? "Situation à consolider." : f < 60 ? "Trajectoire encourageante." : "Bonne progression.";
  $("projectionMini").innerHTML = projection(3).map(r => `<div class="projection-row"><span>${esc(r.label)}</span><strong>${money(r.savings)}</strong><span>${money(r.credits)}/mois</span></div>`).join("");
  $("alertBox").innerHTML = forecast() < 0
    ? `<div class="panel sim-negative">🔴 Prévision négative : ${money(forecast())}</div>`
    : forecast() < 100
      ? `<div class="panel">🟠 Marge faible : ${money(forecast())}</div>`
      : `<div class="panel sim-positive">🟢 Prévision positive : ${money(forecast())}</div>`;
}

/* =============================
   CALENDRIER
   ============================= */
function dayEvents(date) {
  const k = iso(date), day = date.getDate(), events = [];

  state.incomes.forEach(i => {
    if (i.type === "oneoff" && i.date === k) events.push({ type: "income", text: "💰 +" + money(i.amount), name: i.label });
    if (i.type === "recurrent" && num(i.day) === day) events.push({ type: "income", text: "💰 +" + money(i.amount), name: i.label });
  });

  state.expenses.forEach(e => {
    if (e.date === k) events.push({ type: e.payment === "deferred" ? "deferred" : "expense", text: (e.payment === "deferred" ? "💳 " : "🛒 ") + money(e.amount), name: e.category });
  });

  state.bills.forEach(b => {
    if (num(b.day) === day && b.active !== false) events.push({ type: "credit", text: "🔄 " + b.name + " -" + money(b.amount), name: b.name });
  });

  state.credits.forEach(c => {
    const total = creditTotalMonths(c);
    for (let i = 1; i <= total; i++) {
      const due = creditInstallmentDate(c, i);
      if (iso(due) !== k) continue;
      const status = creditStatus(c, new Date());
      const isPaid = due <= new Date();
      const remainingAfter = Math.max(0, total - i);
      events.push({
        type: "credit",
        creditId: c.id,
        installment: i,
        total,
        paid: isPaid,
        text: `🏦 ${c.name} -${money(c.monthly)} · ${i}/${total}`,
        detail: `${i}/${total} · reste ${money(remainingAfter * num(c.monthly))}`,
        name: c.name,
        currentRemaining: status.remaining
      });
    }
  });

  return events;
}
function renderCalendar() {
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  $("calendarTitle").textContent = monthLabel(viewMonth);
  let html = "";
  for (let i = 0; i < offset; i++) html += `<div class="calendar-blank"></div>`;
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(y, m, d), today = iso(date) === iso(new Date()), ev = dayEvents(date);
    html += `<button class="calendar-day ${today ? "today" : ""}" data-date="${iso(date)}"><span class="calendar-day-number">${d}</span>${ev.slice(0, 5).map(e => `<span class="event event-${e.type}">${e.text}</span>`).join("")}</button>`;
  }
  $("calendarGrid").innerHTML = html;
  document.querySelectorAll("[data-date]").forEach(b => b.onclick = () => openDay(b.dataset.date, false));
}
function openDay(dateKey, fromCredits = false) {
  const date = localDate(dateKey), events = dayEvents(date);
  let eventHtml = events.length
    ? events.map(e => `<div class="day-event-row"><strong>${e.text}</strong><span class="muted">${esc(e.detail || e.name || "")}</span></div>`).join("")
    : `<p class="muted">Aucune opération.</p>`;
  const extra = fromCredits ? `<p class="muted">Tu peux créer ton crédit depuis cette date.</p>` : "";
  const body = `<button class="primary" id="newOperation">＋ Nouvelle opération</button><div class="panel">${eventHtml}</div>${extra}`;
  openModal("📅 " + date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), body);
  $("newOperation").onclick = () => openOperation(dateKey);
}

/* =============================
   NOUVELLE OPÉRATION
   ============================= */
function openOperation(defaultDate) {
  openModal("➕ Nouvelle opération", `<div class="choice-grid"><button class="choice-btn" data-op="expense">💳 Dépense</button><button class="choice-btn" data-op="income">💰 Revenu</button><button class="choice-btn" data-op="credit">🏦 Paiement fractionné</button><button class="choice-btn" data-op="bill">🔄 Prélèvement récurrent</button></div><div id="opForm" class="panel muted">Choisis un type.</div>`);
  document.querySelectorAll("[data-op]").forEach(b => b.onclick = () => renderOperationForm(b.dataset.op, defaultDate));
}
function renderOperationForm(type, date) {
  const box = $("opForm");
  if (type === "expense") {
    box.innerHTML = `<div class="form-group"><label>Montant (€)</label><input id="oa" type="number" step="0.01"></div><div class="form-group"><label>Nature</label><select id="on"><option>Alimentation</option><option>Carburant</option><option>Loisirs</option><option>Parfums</option><option>Sport</option><option>Maison</option><option>Transport</option><option>Divers</option></select></div><div class="form-group"><label>Mode de paiement</label><select id="op"><option value="deferred">💳 Carte — débit différé</option><option value="instant">💳 Carte — débit immédiat</option><option value="cash">💵 Espèces</option><option value="transfer">🏦 Virement</option></select></div><button class="primary" id="saveOp">Enregistrer</button>`;
    $("saveOp").onclick = () => {
      const amount = num($("oa").value), payment = $("op").value;
      if (amount <= 0) return alert("Montant invalide.");
      state.expenses.push({ id: uid("exp"), date, amount, category: $("on").value, payment });
      if (payment === "deferred") state.deferred += amount; else state.balance -= amount;
      save(); closeModal(); renderAll();
    };
  }
  if (type === "income") {
    box.innerHTML = `<div class="form-group"><label>Origine</label><input id="ol" placeholder="Vente, espèces déposées..."></div><div class="form-group"><label>Montant (€)</label><input id="oa" type="number" step="0.01"></div><button class="primary" id="saveOp">Enregistrer</button>`;
    $("saveOp").onclick = () => {
      const amount = num($("oa").value);
      if (amount <= 0) return alert("Montant invalide.");
      state.incomes.push({ id: uid("inc"), label: $("ol").value.trim() || "Revenu", amount, date, type: "oneoff", received: true });
      state.balance += amount;
      save(); closeModal(); renderAll();
    };
  }
  if (type === "credit") {
    box.innerHTML = `<div class="form-group"><label>Organisme / nom</label><input id="cl" placeholder="PayPal..."></div><div class="form-group"><label>Mensualité (€)</label><input id="cm" type="number" step="0.01"></div><div class="form-group"><label>Nombre total de mensualités</label><input id="cr" type="number" min="1" value="4"></div><p class="muted">La 1re mensualité est considérée comme payée le jour de l'achat. Les suivantes seront automatiquement programmées chaque mois.</p><button class="primary" id="saveOp">Créer le crédit</button>`;
    $("saveOp").onclick = () => {
      const monthly = num($("cm").value), months = Math.max(1, Math.round(num($("cr").value))), d = localDate(date);
      if (monthly <= 0) return alert("Mensualité invalide.");
      const credit = { id: uid("credit"), name: $("cl").value.trim() || "Nouveau crédit", monthly, totalMonths: months, startDate: date, day: d.getDate() };
      state.credits.push(credit);
      if (d <= new Date()) {
        state.balance -= monthly;
      }
      save(); closeModal(); renderAll();
    };
  }
  if (type === "bill") {
    box.innerHTML = `<div class="form-group"><label>Nom</label><input id="bl" placeholder="Loyer, Spotify..."></div><div class="form-group"><label>Montant (€)</label><input id="ba" type="number" step="0.01"></div><div class="form-group"><label>Jour du mois</label><input id="bd" type="number" min="1" max="31" value="${localDate(date).getDate()}"></div><button class="primary" id="saveOp">Créer le prélèvement</button>`;
    $("saveOp").onclick = () => {
      const amount = num($("ba").value);
      if (amount <= 0) return alert("Montant invalide.");
      state.bills.push({ id: uid("bill"), name: $("bl").value.trim() || "Prélèvement", amount, day: Math.min(31, Math.max(1, Math.round(num($("bd").value)))), active: true });
      save(); closeModal(); renderAll();
    };
  }
}

/* =============================
   CRÉDITS
   ============================= */
function renderCredits() {
  const active = activeCredits();
  const completed = state.credits.filter(c => creditStatus(c).remaining === 0);
  $("creditsMonthlySummary").textContent = money(monthlyCredits());
  $("debtSummary").textContent = money(debtRemaining());
  $("activeCreditCount").textContent = active.length;
  $("completedCreditCount").textContent = completed.length;

  $("creditList").innerHTML = active.length ? active.map(c => {
    const st = creditStatus(c);
    const end = creditEndDate(c);
    return `<div class="credit-row"><div><h3>${esc(c.name)}</h3><div class="muted">${st.remaining} mensualité${st.remaining > 1 ? "s" : ""} restante${st.remaining > 1 ? "s" : ""} · ${st.paid}/${st.total} déjà payée${st.paid > 1 ? "s" : ""}</div><div class="muted">Dette restante : <strong>${money(num(c.monthly) * st.remaining)}</strong> · fin ${esc(end.toLocaleDateString("fr-FR"))}</div></div><div class="credit-right"><strong>${money(c.monthly)}</strong><span class="muted">/mois</span><br><button class="small-btn" data-edit="${c.id}">✏️ Modifier</button><button class="danger" data-del="${c.id}">Supprimer</button></div></div>`;
  }).join("") : `<div class="panel">Aucun crédit actif.</div>`;

  document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    if (confirm("Supprimer ce crédit ?")) {
      state.credits = state.credits.filter(c => c.id !== b.dataset.del);
      save(); renderAll();
    }
  });
  document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editCredit(b.dataset.edit));

  $("completedCreditList").innerHTML = completed.length
    ? `<div class="panel"><div class="panel-title">🏆 Crédits terminés</div>${completed.map(c => `<p>🎉 ${esc(c.name)} — terminé le ${esc(creditEndDate(c).toLocaleDateString("fr-FR"))}</p>`).join("")}</div>`
    : "";
}
function editCredit(id) {
  const c = state.credits.find(x => x.id === id);
  if (!c) return;
  const st = creditStatus(c);
  openModal("✏️ Modifier le crédit", `<div class="panel"><p><strong>${esc(c.name)}</strong></p><p class="muted">Actuellement : ${st.paid}/${st.total} payée${st.paid > 1 ? "s" : "s"}, ${st.remaining} restante${st.remaining > 1 ? "s" : ""}.</p></div><div class="form-group"><label>Organisme / nom</label><input id="el" value="${esc(c.name)}"></div><div class="form-group"><label>Mensualité (€)</label><input id="em" type="number" step="0.01" value="${num(c.monthly)}"></div><div class="form-group"><label>Nombre total de mensualités</label><input id="er" type="number" min="1" value="${creditTotalMonths(c)}"></div><div class="form-group"><label>Date du premier paiement</label><input id="ed" type="date" value="${esc(c.startDate)}"></div><p class="muted">La modification recalcule le calendrier à partir de la nouvelle date et du nouveau nombre de mensualités.</p><div class="form-actions"><button class="primary" id="saveEdit">Enregistrer</button><button class="small-btn" id="cancelEdit">Annuler</button></div>`);
  $("cancelEdit").onclick = closeModal;
  $("saveEdit").onclick = () => {
    const monthly = num($("em").value), total = Math.max(1, Math.round(num($("er").value))), start = $("ed").value;
    if (monthly <= 0 || !start) return alert("Vérifie les valeurs.");
    c.name = $("el").value.trim() || "Crédit";
    c.monthly = monthly;
    c.totalMonths = total;
    c.startDate = start;
    c.day = localDate(start).getDate();
    save(); closeModal(); renderAll();
  };
}

/* =============================
   ÉVOLUTION / PROJECTION
   ============================= */
function projection(months) {
  const credits = state.credits.map(c => ({ ...c }));
  let s = state.savings, rows = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() + i, 1);
    const cm = credits.reduce((a, c) => {
      const st = creditStatus(c, d);
      return a + (st.remaining > 0 ? num(c.monthly) : 0);
    }, 0);
    const free = Math.max(0, recurringIncome() - recurringBills() - cm);
    s += free;
    rows.push({ label: monthLabel(d), savings: s, credits: cm, freedom: projectedFreedom(s, cm) });
  }
  return rows;
}
function projectedFreedom(s, c) {
  const income = Math.max(1, recurringIncome()), margin = Math.max(0, income - c);
  return Math.round((margin / income) * 60 + Math.min(1, s / Math.max(1, income * 6)) * 40);
}
function renderEvolution() {
  drawChart();
  $("projectionTable").innerHTML = projection(12).map(r => `<div class="projection-row"><span>${esc(r.label)}</span><strong>${money(r.savings)}</strong><span>${money(r.credits)}/mois</span></div>`).join("");
  document.querySelectorAll(".view-tab").forEach(b => b.classList.toggle("active", b.dataset.view === chartMode));
}
function drawChart() {
  const c = $("evolutionChart");
  if (!c) return;
  const r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  c.width = r.width * dpr; c.height = r.height * dpr;
  const x = c.getContext("2d"); x.scale(dpr, dpr);
  const rows = projection(24), vals = rows.map(z => chartMode === "credits" ? z.credits : chartMode === "savings" ? z.savings : z.freedom);
  const max = Math.max(...vals, 1), w = r.width, h = r.height, p = 30;
  x.clearRect(0, 0, w, h); x.strokeStyle = "rgba(148,163,184,.15)";
  for (let i = 0; i < 5; i++) { const y = p + (h - 2 * p) * i / 4; x.beginPath(); x.moveTo(p, y); x.lineTo(w - p, y); x.stroke(); }
  const color = chartMode === "credits" ? "#ef4444" : chartMode === "savings" ? "#22c55e" : "#3b82f6";
  x.strokeStyle = color; x.lineWidth = 3; x.beginPath();
  vals.forEach((v, i) => { const xx = p + (w - 2 * p) * i / (vals.length - 1), yy = h - p - (v / max) * (h - 2 * p); i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); });
  x.stroke();
  x.fillStyle = "#94a3b8"; x.font = "10px sans-serif";
  rows.forEach((z, i) => { if (i % 4 === 0) { const xx = p + (w - 2 * p) * i / (rows.length - 1); x.fillText(z.label.slice(0, 3), xx - 7, h - 8); } });
}

/* =============================
   PARAMÈTRES / SIMULATION
   ============================= */
function settingsModal() {
  openModal("⚙️ Paramètres", `<div class="form-group"><label>Solde actuel (€)</label><input id="sb" type="number" step="0.01" value="${state.balance}"></div><div class="form-group"><label>Découvert autorisé (€)</label><input id="so" type="number" step="0.01" value="${state.settings.overdraft}"></div><div class="form-group"><label>Salaire Europcar (€)</label><input id="se" type="number" step="0.01" value="${state.settings.salaryEuropcar}"></div><div class="form-group"><label>Salaire Domino's (€)</label><input id="sd" type="number" step="0.01" value="${state.settings.salaryDominos}"></div><div class="form-group"><label>Tickets restaurant (€)</label><input id="st" type="number" step="0.01" value="${state.settings.ticketsRestaurant}"></div><div class="form-group"><label>Épargne actuelle (€)</label><input id="ss" type="number" step="0.01" value="${state.savings}"></div><div class="form-actions"><button class="primary" id="saveSet">Enregistrer</button><button class="danger" id="resetAll">Tout remettre à zéro</button></div>`);
  $("saveSet").onclick = () => { state.balance = num($("sb").value); state.settings.overdraft = num($("so").value); state.settings.salaryEuropcar = num($("se").value); state.settings.salaryDominos = num($("sd").value); state.settings.ticketsRestaurant = num($("st").value); state.savings = num($("ss").value); save(); closeModal(); renderAll(); };
  $("resetAll").onclick = () => { if (confirm("Effacer toutes les données ?")) { state = clone(DEFAULT); save(); closeModal(); renderAll(); } };
}
function simulation() {
  openModal("🔮 Simulation", `<div class="form-group"><label>Revenu ponctuel (€)</label><input id="si" type="number" step="0.01" value="0"></div><div class="form-group"><label>Dépense immédiate (€)</label><input id="sx" type="number" step="0.01" value="0"></div><div class="form-group"><label>Nouveau crédit — mensualité (€)</label><input id="sc" type="number" step="0.01" value="0"></div><div class="form-group"><label>Durée (mois)</label><input id="sm" type="number" min="1" value="4"></div><div id="sr" class="sim-card">Entre les valeurs puis calcule.</div><button class="primary" id="goSim">Calculer</button>`);
  $("goSim").onclick = () => {
    const inc = num($("si").value), exp = num($("sx").value), cr = num($("sc").value), m = Math.max(1, Math.round(num($("sm").value))), base = forecast(), next = base + inc - exp - cr;
    $("sr").innerHTML = `<p>Prévision actuelle : <strong>${money(base)}</strong></p><p>Prévision simulée : <strong>${money(next)}</strong></p><p>Crédits actuels : <strong>${money(monthlyCredits())}/mois</strong></p><p>Avec nouveau crédit : <strong>${money(monthlyCredits() + cr)}/mois</strong></p><p>Coût total du nouveau crédit : <strong>${money(cr * m)}</strong></p>`;
  };
}

function renderAll() { renderHome(); renderCalendar(); renderCredits(); renderEvolution(); }
function init() { setup(); renderAll(); }
document.addEventListener("DOMContentLoaded", init);
