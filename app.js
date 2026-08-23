const KEY = "financeQuest_v4_3";
const THEME_KEY = "financeQuest_theme";
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
    monthProgressKey: "",
    startingBalance: null
  }
};

let state = load();
upgradeStoredState();
settleDueOperations();
let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let chartMode = "balance";

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function settleDueOperations() {
  const today = new Date();
  const tk = todayKey();
  let changed = false;
  state.incomes.forEach(i => {
    if (i.type === "oneoff" && i.date && i.date <= tk && !i.received) {
      state.balance += num(i.amount);
      i.received = true;
      changed = true;
    }
    if (i.type === "recurrent") {
      const due = recurringDateForMonth(i.day, today.getFullYear(), today.getMonth());
      if (iso(due) <= tk && i.lastAppliedMonth !== monthKey(today)) {
        state.balance += num(i.amount);
        i.lastAppliedMonth = monthKey(today);
        changed = true;
      }
    }
  });
  state.expenses.forEach(e => {
    const due = e.payment === "deferred" ? deferredDebitDate(e) : e.date;
    if (due && due <= tk && !e.balanceApplied) {
      state.balance -= num(e.amount);
      e.balanceApplied = true;
      changed = true;
    }
  });
  state.credits.forEach(c => {
    ensureCreditLedger(c);
    for (let i = 1; i <= creditTotalMonths(c); i++) {
      if (iso(creditInstallmentDate(c, i)) <= tk && !c.appliedInstallments.includes(i)) {
        state.balance -= num(c.monthly);
        c.appliedInstallments.push(i);
        changed = true;
      }
    }
  });
  const currentMonth = monthKey(today);
  state.bills.forEach(b => {
    const due = recurringDateForMonth(b.day, today.getFullYear(), today.getMonth());
    const started = !b.startDate || b.startDate <= tk;
    if (b.active !== false && started && iso(due) <= tk && b.lastAppliedMonth !== currentMonth) {
      state.balance -= num(b.amount);
      b.lastAppliedMonth = currentMonth;
      changed = true;
    }
  });
  if (changed) save();
}

function load() {
  try {
    const x = localStorage.getItem(KEY);
    return x ? merge(clone(DEFAULT), JSON.parse(x)) : clone(DEFAULT);
  } catch (_) { return clone(DEFAULT); }
}
function upgradeStoredState() {
  let changed = false;
  state.expenses.forEach(e => {
    // Les versions précédentes débitaient déjà toute dépense immédiate datée
    // d'aujourd'hui ou du passé au moment de sa création.
    if (e.payment !== "deferred" && e.balanceApplied === undefined && e.date <= todayKey()) {
      e.balanceApplied = true;
      changed = true;
    }
  });
  state.credits.forEach(c => {
    if (!Array.isArray(c.appliedInstallments)) {
      c.appliedInstallments = c.balanceAdjustedForFirstPayment ? [1] : [];
      changed = true;
    }
  });
  if (state.settings.startingBalance === null || state.settings.startingBalance === undefined) {
    // Conserve exactement le solde des anciennes données, tout en créant une
    // base séparée pour les prochaines modifications du solde de départ.
    state.settings.startingBalance = num(state.balance) - recordedCalendarImpact();
    changed = true;
  }
  if (changed) save();
}
function merge(a, b) {
  return {
    ...a,
    ...b,
    settings: { ...a.settings, ...(b.settings || {}) },
    bills: Array.isArray(b.bills) ? b.bills : [],
    credits: Array.isArray(b.credits) ? b.credits : [],
    expenses: Array.isArray(b.expenses) ? b.expenses : [],
    incomes: Array.isArray(b.incomes) ? b.incomes : [],
    completedCredits: Array.isArray(b.completedCredits) ? b.completedCredits : []
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
function todayKey() { return iso(new Date()); }
function isFutureDate(key) { return key > todayKey(); }
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function monthLabel(d) { return MONTHS[d.getMonth()] + " " + d.getFullYear(); }
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function sameMonth(key, d) { const x = localDate(key); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); }
function recurringDateForMonth(day, year, month) {
  const safeDay = Math.min(31, Math.max(1, Math.round(num(day))));
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(safeDay, lastDay), 12);
}
function deferredDebitDate(expense) {
  if (expense.deferredDebitDate) return expense.deferredDebitDate;
  const date = localDate(expense.date);
  return iso(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
}
function recordedCalendarImpact() {
  const incomes = state.incomes.reduce((sum, income) => {
    if (income.type === "oneoff" && income.received) return sum + num(income.amount);
    if (income.type === "recurrent" && income.lastAppliedMonth) return sum + num(income.amount);
    return sum;
  }, 0);
  const expenses = state.expenses.filter(expense => expense.balanceApplied).reduce((sum, expense) => sum + num(expense.amount), 0);
  const credits = state.credits.reduce((sum, credit) => {
    ensureCreditLedger(credit);
    return sum + num(credit.monthly) * credit.appliedInstallments.length;
  }, 0);
  const bills = state.bills.filter(bill => bill.lastAppliedMonth).reduce((sum, bill) => sum + num(bill.amount), 0);
  return incomes - expenses - credits - bills;
}
function rebuildBalanceFromCalendar() {
  state.balance = num(state.settings.startingBalance) + recordedCalendarImpact();
}

/* =============================
   CRÉDITS / ÉCHÉANCES
   ============================= */
function creditTotalMonths(c) { return Math.max(1, Math.round(num(c.totalMonths || c.months || c.remaining || 1))); }
function creditStart(c) { return localDate(c.startDate || todayKey()); }
function addMonthsPreserveDay(date, months) {
  const base = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const targetMonth = base.getMonth() + months;
  const lastDay = new Date(base.getFullYear(), targetMonth + 1, 0).getDate();
  return new Date(base.getFullYear(), targetMonth, Math.min(date.getDate(), lastDay), 12);
}
function creditInstallmentDate(c, index) { return addMonthsPreserveDay(creditStart(c), index - 1); }
function ensureCreditLedger(c) {
  if (!Array.isArray(c.appliedInstallments)) c.appliedInstallments = c.balanceAdjustedForFirstPayment ? [1] : [];
}
function creditPaidCount(c, asOf = new Date()) {
  const total = creditTotalMonths(c);
  let paid = 0;
  const asOfKey = iso(asOf);
  for (let i = 1; i <= total; i++) if (iso(creditInstallmentDate(c, i)) <= asOfKey) paid++;
  return Math.min(total, paid);
}
function creditStatus(c, asOf = new Date()) {
  const total = creditTotalMonths(c);
  const paid = creditPaidCount(c, asOf);
  return { total, paid, remaining: Math.max(0, total - paid) };
}
function creditEndDate(c) { return creditInstallmentDate(c, creditTotalMonths(c)); }
function activeCredits(asOf = new Date()) { return state.credits.filter(c => creditStatus(c, asOf).remaining > 0); }
function monthlyCredits(asOf = new Date()) { return activeCredits(asOf).reduce((s, c) => s + num(c.monthly), 0); }
function debtRemaining(asOf = new Date()) { return activeCredits(asOf).reduce((s, c) => s + num(c.monthly) * creditStatus(c, asOf).remaining, 0); }
function creditFutureInstallmentsThrough(c, startDate, endDate) {
  let total = 0;
  for (let i = 1; i <= creditTotalMonths(c); i++) {
    const d = creditInstallmentDate(c, i);
    if (d > startDate && d <= endDate) total += num(c.monthly);
  }
  return total;
}

/* =============================
   OPÉRATIONS / CALCULS
   ============================= */
function recurringBills() { return state.bills.filter(b => b.active !== false).reduce((s, b) => s + num(b.amount), 0); }
function recurringIncome() { return state.incomes.filter(i => i.type === "recurrent").reduce((s, i) => s + num(i.amount), 0); }
function futureOneOffIncomeThrough(endDate) {
  return state.incomes.filter(i => i.type === "oneoff" && i.date > todayKey() && localDate(i.date) <= endDate).reduce((s, i) => s + num(i.amount), 0);
}
function recurringIncomeThroughMonth(endDate) {
  const now = new Date();
  return state.incomes.filter(i => i.type === "recurrent").reduce((sum, i) => {
    const due = recurringDateForMonth(i.day, now.getFullYear(), now.getMonth());
    return sum + (iso(due) > todayKey() && due <= endDate ? num(i.amount) : 0);
  }, 0);
}
function pendingIncome() {
  const oneOff = state.incomes.filter(i => i.type === "oneoff" && i.date && i.date > todayKey()).reduce((s, i) => s + num(i.amount), 0);
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 12);
  return oneOff + recurringIncomeThroughMonth(end);
}
function monthExpenses() {
  const n = new Date();
  return state.expenses.filter(e => sameMonth(e.date, n)).reduce((s, e) => s + num(e.amount), 0);
}
function monthDeferred() {
  const n = new Date();
  return state.expenses.filter(e => e.payment === "deferred" && !e.balanceApplied && sameMonth(e.date, n)).reduce((s, e) => s + num(e.amount), 0);
}
function futureDeferredThrough(endDate) {
  return state.expenses.filter(e => e.payment === "deferred" && !e.balanceApplied && deferredDebitDate(e) > todayKey() && localDate(deferredDebitDate(e)) <= endDate).reduce((s, e) => s + num(e.amount), 0);
}
function recurringBillsThroughMonth(endDate) {
  const now = new Date();
  return state.bills.filter(b => b.active !== false).reduce((sum, b) => {
    const due = recurringDateForMonth(b.day, now.getFullYear(), now.getMonth());
    // A subscription already paid today/past is already included in state.balance.
    // A subscription scheduled for later this month must be included in the forecast.
    return sum + (iso(due) > todayKey() && due <= endDate ? num(b.amount) : 0);
  }, 0);
}
function oneOffIncomeThroughMonth(endDate) { return futureOneOffIncomeThrough(endDate); }
function futureCreditThrough(endDate) {
  const now = new Date();
  return state.credits.reduce((sum, c) => sum + creditFutureInstallmentsThrough(c, now, endDate), 0);
}
function futureImmediateExpensesThrough(endDate) {
  return state.expenses.filter(e => e.payment !== "deferred" && e.date > todayKey() && localDate(e.date) <= endDate).reduce((s, e) => s + num(e.amount), 0);
}
function forecast() {
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 12);
  return num(state.balance)
    + oneOffIncomeThroughMonth(end)
    + recurringIncomeThroughMonth(end)
    - recurringBillsThroughMonth(end)
    - futureCreditThrough(end)
    - futureDeferredThrough(end)
    - futureImmediateExpensesThrough(end);
}
function billsDueNowOrLater() {
  const now = new Date();
  const billTotal = state.bills.filter(b => {
    const started = !b.startDate || b.startDate <= todayKey();
    return b.active !== false && started && iso(recurringDateForMonth(b.day, now.getFullYear(), now.getMonth())) > todayKey();
  }).reduce((s, b) => s + num(b.amount), 0);
  const creditTotal = state.credits.reduce((s, c) => s + creditFutureInstallmentsThrough(c, now, new Date(now.getFullYear(), now.getMonth() + 1, 0, 12)), 0);
  const deferred = state.expenses.filter(e => e.payment === "deferred" && !e.balanceApplied && deferredDebitDate(e) > todayKey() && sameMonth(deferredDebitDate(e), now)).reduce((s, e) => s + num(e.amount), 0);
  return billTotal + creditTotal + deferred;
}
function monthIncomeReceived() {
  const n = new Date();
  return state.incomes.filter(i => (i.type === "recurrent" && i.lastAppliedMonth === monthKey(n)) || (i.type !== "recurrent" && sameMonth(i.date, n) && i.date <= todayKey())).reduce((s, i) => s + num(i.amount), 0);
}
function monthCreditTotal() { return state.credits.reduce((s, c) => s + (creditStatus(c).paid > 0 && sameMonth(iso(creditStart(c)), new Date()) ? 0 : 0), 0); }

/* =============================
   NAVIGATION
   ============================= */
function setup() {
  setupTheme();
  document.querySelectorAll(".nav-btn").forEach(b => b.onclick = () => show(b.dataset.screen));
  $("settingsBtn").onclick = settingsModal;
  $("themeToggle").onclick = toggleTheme;
  $("simulateBtn").onclick = simulation;
  $("prevMonth").onclick = () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); renderCalendar(); };
  $("nextMonth").onclick = () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); renderCalendar(); };
  $("todayBtn").onclick = () => { viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); renderCalendar(); };
  $("addCreditBtn").onclick = () => openDay(todayKey(), true);
  $("resetCreditsBtn").onclick = resetCredits;
  $("modalClose").onclick = closeModal;
  $("modal").onclick = e => { if (e.target === $("modal")) closeModal(); };
  document.querySelectorAll(".view-tab").forEach(b => b.onclick = () => { chartMode = b.dataset.view; renderEvolution(); });
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
function closeModal() { $("modal").classList.add("hidden"); $("modalBody").innerHTML = ""; }
function setupTheme() {
  let theme = "dark";
  try { theme = localStorage.getItem(THEME_KEY) || "dark"; } catch (_) {}
  applyTheme(theme);
}
function applyTheme(theme) {
  const isLight = theme === "light";
  document.documentElement.dataset.theme = isLight ? "light" : "dark";
  const button = $("themeToggle");
  if (button) {
    button.textContent = isLight ? "☾" : "☀︎";
    button.setAttribute("aria-label", isLight ? "Activer le mode sombre" : "Activer le mode clair");
    button.title = isLight ? "Mode sombre" : "Mode clair";
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isLight ? "#f2f2f7" : "#0b0b0f");
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
  applyTheme(next);
}

/* =============================
   ACCUEIL
   ============================= */
function renderHome() {
  $("currentBalance").textContent = money(state.balance);
  $("monthForecast").textContent = money(forecast());
  $("deferredTotal").textContent = money(monthDeferred());
  $("incomePending").textContent = money(pendingIncome());
  $("billsPending").textContent = money(billsDueNowOrLater());
  $("monthExpenses").textContent = money(monthExpenses());
  $("monthIncome").textContent = money(monthIncomeReceived());
  $("debtRemainingTotal").textContent = money(debtRemaining());
  $("savingsTotal").textContent = money(state.savings);
  $("projectionMini").innerHTML = projection(6).map(r => `<div class="projection-row"><span>${esc(r.label)}</span><strong>${money(r.balance)}</strong><span>${money(r.credits)}/mois</span></div>`).join("");
  const f = forecast();
  $("alertBox").innerHTML = f < 0
    ? `<div class="panel sim-negative">🔴 Prévision négative : ${money(f)}</div>`
    : f < 100
      ? `<div class="panel">🟠 Marge faible : ${money(f)}</div>`
      : `<div class="panel sim-positive">🟢 Prévision positive : ${money(f)}</div>`;
}

/* =============================
   CALENDRIER
   ============================= */
function dayEvents(date) {
  const k = iso(date), day = date.getDate(), events = [];
  state.incomes.forEach(i => {
    if (i.type === "oneoff" && i.date === k) events.push({ type: "income", text: "💰 +" + money(i.amount), detail: i.label || "Revenu", name: i.label });
    if (i.type === "recurrent" && iso(recurringDateForMonth(i.day, date.getFullYear(), date.getMonth())) === k) events.push({ type: "income", text: "💰 +" + money(i.amount), detail: i.label || "Revenu récurrent", name: i.label });
  });
  state.expenses.forEach(e => {
    if (e.date === k) events.push({ type: e.payment === "deferred" ? "deferred" : "expense", text: (e.payment === "deferred" ? "💳 " : "🛒 ") + money(e.amount), detail: `${e.category || "Dépense"}${e.payment === "deferred" ? " · débit différé" : ""}`, name: e.category });
  });
  state.bills.forEach(b => {
    if (b.active !== false && iso(recurringDateForMonth(b.day, date.getFullYear(), date.getMonth())) === k) events.push({ type: "credit", text: "🔄 " + b.name + " -" + money(b.amount), detail: "Prélèvement récurrent", name: b.name });
  });
  state.credits.forEach(c => {
    const total = creditTotalMonths(c);
    for (let i = 1; i <= total; i++) {
      const due = creditInstallmentDate(c, i);
      if (iso(due) !== k) continue;
      ensureCreditLedger(c);
      const isPaid = c.appliedInstallments.includes(i);
      const remainingAfter = Math.max(0, total - i);
      events.push({
        type: "credit", creditId: c.id, installment: i, total, paid: isPaid,
        text: `🏦 ${c.name} -${money(c.monthly)} · ${i}/${total}`,
        detail: `${i}/${total} · restant après paiement ${money(remainingAfter * num(c.monthly))}`,
        name: c.name
      });
    }
  });
  return events;
}
function renderCalendar() {
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const last = new Date(y, m + 1, 0);
  $("calendarTitle").textContent = monthLabel(viewMonth);
  let html = "";
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(y, m, d), today = iso(date) === todayKey(), ev = dayEvents(date);
    const events = ev.length
      ? ev.map(e => `<span class="event event-${e.type}">${e.text}</span>`).join("")
      : `<span class="event-empty">Aucune opération</span>`;
    html += `<button class="calendar-day calendar-list-day ${today ? "today" : ""} ${ev.length ? "has-events" : ""}" data-date="${iso(date)}"><span class="calendar-day-date"><small>${esc(date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""))}</small><strong>${d}</strong></span><span class="calendar-day-events">${events}</span></button>`;
  }
  $("calendarGrid").innerHTML = html;
  document.querySelectorAll("[data-date]").forEach(b => b.onclick = () => openDay(b.dataset.date, false));
}
function openDay(dateKey, fromCredits = false) {
  const date = localDate(dateKey), events = dayEvents(date);
  const eventHtml = events.length ? events.map(e => `<div class="day-event-row"><strong>${e.text}</strong><span class="muted">${esc(e.detail || e.name || "")}</span></div>`).join("") : `<p class="muted">Aucune opération.</p>`;
  const extra = fromCredits ? `<p class="muted">Tu peux créer ton crédit depuis cette date.</p>` : "";
  openModal("📅 " + date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), `<button class="primary" id="newOperation">＋ Nouvelle opération</button><div class="panel">${eventHtml}</div>${extra}`);
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
      const expense = { id: uid("exp"), date, amount, category: $("on").value, payment, balanceApplied: false };
      if (payment === "deferred") expense.deferredDebitDate = iso(new Date(localDate(date).getFullYear(), localDate(date).getMonth() + 1, 0, 12));
      state.expenses.push(expense);
      if (!isFutureDate(date) && payment !== "deferred") { state.balance -= amount; expense.balanceApplied = true; }
      save(); closeModal(); renderAll();
    };
  }
  if (type === "income") {
    box.innerHTML = `<div class="form-group"><label>Origine</label><input id="ol" placeholder="Europcar, Domino's, vente..."></div><div class="form-group"><label>Montant (€)</label><input id="oa" type="number" step="0.01"></div><div class="form-group"><label>Fréquence</label><select id="of"><option value="oneoff">Ponctuel</option><option value="recurrent">Chaque mois</option></select></div><p class="muted">Un revenu futur reste dans « Revenus à recevoir » et ne modifie pas le solde réel avant sa date.</p><button class="primary" id="saveOp">Enregistrer</button>`;
    $("saveOp").onclick = () => {
      const amount = num($("oa").value);
      if (amount <= 0) return alert("Montant invalide.");
      const type = $("of").value, future = isFutureDate(date);
      const income = { id: uid("inc"), label: $("ol").value.trim() || "Revenu", amount, date, type, received: type === "oneoff" && !future };
      if (type === "recurrent") { income.day = localDate(date).getDate(); income.lastAppliedMonth = ""; }
      state.incomes.push(income);
      if (type === "oneoff" && !future) state.balance += amount;
      if (type === "recurrent" && !future) { state.balance += amount; income.lastAppliedMonth = monthKey(new Date()); }
      save(); closeModal(); renderAll();
    };
  }
  if (type === "credit") {
    box.innerHTML = `<div class="form-group"><label>Organisme / nom</label><input id="cl" placeholder="PayPal, Cofidis..."></div><div class="form-group"><label>Mensualité (€)</label><input id="cm" type="number" step="0.01"></div><div class="form-group"><label>Nombre total de mensualités</label><input id="cr" type="number" min="1" value="4"></div><p class="muted">La 1re mensualité est payée le jour de l'achat. Les suivantes sont programmées chaque mois, jusqu'à la dernière.</p><button class="primary" id="saveOp">Créer le crédit</button>`;
    $("saveOp").onclick = () => {
      const monthly = num($("cm").value), months = Math.max(1, Math.round(num($("cr").value))), d = localDate(date), pastOrToday = !isFutureDate(date);
      if (monthly <= 0) return alert("Mensualité invalide.");
      const credit = { id: uid("credit"), name: $("cl").value.trim() || "Nouveau crédit", monthly, totalMonths: months, startDate: date, day: d.getDate(), firstPaymentApplied: pastOrToday, balanceAdjustedForFirstPayment: pastOrToday, appliedInstallments: pastOrToday ? [1] : [] };
      state.credits.push(credit);
      if (pastOrToday) state.balance -= monthly;
      save(); closeModal(); renderAll();
    };
  }
  if (type === "bill") {
    box.innerHTML = `<div class="form-group"><label>Nom</label><input id="bl" placeholder="Loyer, Spotify..."></div><div class="form-group"><label>Montant (€)</label><input id="ba" type="number" step="0.01"></div><div class="form-group"><label>Jour du mois</label><input id="bd" type="number" min="1" max="31" value="${localDate(date).getDate()}"></div><button class="primary" id="saveOp">Créer le prélèvement</button>`;
    $("saveOp").onclick = () => {
      const amount = num($("ba").value);
      if (amount <= 0) return alert("Montant invalide.");
      const day = Math.min(31, Math.max(1, Math.round(num($("bd").value))));
      const bill = { id: uid("bill"), name: $("bl").value.trim() || "Prélèvement", amount, day, startDate: date, active: true, lastAppliedMonth: "" };
      state.bills.push(bill);
      const now = new Date();
       const dueThisMonth = recurringDateForMonth(day, now.getFullYear(), now.getMonth());
       if (date <= todayKey() && iso(dueThisMonth) <= todayKey()) {
         state.balance -= amount;
         bill.lastAppliedMonth = monthKey(now);
       }
      save(); closeModal(); renderAll();
    };
  }
}

/* =============================
   CRÉDITS
   ============================= */
function renderCredits() {
  const active = activeCredits(), completed = state.credits.filter(c => creditStatus(c).remaining === 0);
  $("creditsMonthlySummary").textContent = money(monthlyCredits());
  $("debtSummary").textContent = money(debtRemaining());
  $("activeCreditCount").textContent = active.length;
  $("completedCreditCount").textContent = completed.length;
  $("creditList").innerHTML = active.length ? active.map(c => {
    const st = creditStatus(c), end = creditEndDate(c);
    return `<div class="credit-row"><div><h3>${esc(c.name)}</h3><div class="muted">${st.remaining} mensualité${st.remaining > 1 ? "s" : ""} restante${st.remaining > 1 ? "s" : ""} · ${st.paid}/${st.total} déjà payée${st.paid > 1 ? "s" : ""}</div><div class="muted">Dette restante : <strong>${money(num(c.monthly) * st.remaining)}</strong> · fin ${esc(end.toLocaleDateString("fr-FR"))}</div></div><div class="credit-right"><strong>${money(c.monthly)}</strong><span class="muted">/mois</span><br><button class="small-btn" data-edit="${c.id}">✏️ Modifier</button><button class="danger" data-del="${c.id}">Supprimer</button></div></div>`;
  }).join("") : `<div class="panel">Aucun crédit actif.</div>`;
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const c = state.credits.find(x => x.id === b.dataset.del); if (!c) return;
    if (confirm("Supprimer ce crédit ?")) {
      ensureCreditLedger(c);
      // On annule uniquement les débits que Finance Quest avait lui-même
      // inscrits dans son solde : aucun débit fantôme ne reste après suppression.
      state.balance += num(c.monthly) * c.appliedInstallments.length;
      state.credits = state.credits.filter(x => x.id !== b.dataset.del);
      save(); renderAll();
    }
  });
  document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editCredit(b.dataset.edit));
  $("completedCreditList").innerHTML = completed.length ? `<div class="panel"><div class="panel-title">🏆 Crédits terminés</div>${completed.map(c => `<p>🎉 ${esc(c.name)} — terminé le ${esc(creditEndDate(c).toLocaleDateString("fr-FR"))}</p>`).join("")}</div>` : "";
}
function editCredit(id) {
  const c = state.credits.find(x => x.id === id); if (!c) return;
  ensureCreditLedger(c);
  const oldMonthly = num(c.monthly), oldAppliedInstallments = [...c.appliedInstallments];
  const st = creditStatus(c);
  openModal("✏️ Modifier le crédit", `<div class="panel"><p><strong>${esc(c.name)}</strong></p><p class="muted">Actuellement : ${st.paid}/${st.total} payée${st.paid > 1 ? "s" : "s"}, ${st.remaining} restante${st.remaining > 1 ? "s" : ""}.</p></div><div class="form-group"><label>Organisme / nom</label><input id="el" value="${esc(c.name)}"></div><div class="form-group"><label>Mensualité (€)</label><input id="em" type="number" step="0.01" value="${num(c.monthly)}"></div><div class="form-group"><label>Nombre total de mensualités</label><input id="er" type="number" min="1" value="${creditTotalMonths(c)}"></div><div class="form-group"><label>Date du premier paiement</label><input id="ed" type="date" value="${esc(c.startDate)}"></div><p class="muted">Le calendrier et la dette restante seront recalculés.</p><div class="form-actions"><button class="primary" id="saveEdit">Enregistrer</button><button class="small-btn" id="cancelEdit">Annuler</button></div>`);
  $("cancelEdit").onclick = closeModal;
  $("saveEdit").onclick = () => {
    const monthly = num($("em").value), total = Math.max(1, Math.round(num($("er").value))), start = $("ed").value;
    if (monthly <= 0 || !start) return alert("Vérifie les valeurs.");
    // On retire les échéances déjà inscrites, puis on réapplique exactement
    // celles qui sont réellement dues avec le nouveau calendrier.
    state.balance += oldMonthly * oldAppliedInstallments.length;
    c.name = $("el").value.trim() || "Crédit";
    c.monthly = monthly; c.totalMonths = total; c.startDate = start; c.day = localDate(start).getDate();
    c.appliedInstallments = [];
    for (let i = 1; i <= total; i++) {
      if (iso(creditInstallmentDate(c, i)) <= todayKey()) c.appliedInstallments.push(i);
    }
    c.firstPaymentApplied = c.appliedInstallments.includes(1);
    c.balanceAdjustedForFirstPayment = c.firstPaymentApplied;
    state.balance -= monthly * c.appliedInstallments.length;
    save(); closeModal(); renderAll();
  };
}
function resetCredits() {
  if (!state.credits.length) return alert("Aucun crédit à effacer.");
  const firstWarning = confirm("Effacer tous les crédits enregistrés ? Les échéances disparaîtront aussi du calendrier.");
  if (!firstWarning) return;
  const finalWarning = confirm("Dernière confirmation : cette action supprime tous les crédits. Continuer ?");
  if (!finalWarning) return;
  const appliedTotal = state.credits.reduce((sum, credit) => {
    ensureCreditLedger(credit);
    return sum + num(credit.monthly) * credit.appliedInstallments.length;
  }, 0);
  state.balance += appliedTotal;
  state.credits = [];
  save();
  renderAll();
}

/* =============================
   ÉVOLUTION / PROJECTION
   ============================= */
function projection(months) {
  const rows = [];
  let simulated = forecast();
  for (let i = 0; i < months; i++) {
    const start = new Date(new Date().getFullYear(), new Date().getMonth() + i, 1, 12);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
    if (i > 0) {
      const income = state.incomes.reduce((s, x) => {
        if (x.type === "recurrent") return s + num(x.amount);
        return x.type === "oneoff" && x.date && localDate(x.date) >= start && localDate(x.date) <= end ? s + num(x.amount) : s;
      }, 0);
      const bills = state.bills.filter(b => b.active !== false).reduce((s, b) => {
        const due = recurringDateForMonth(b.day, start.getFullYear(), start.getMonth());
        const started = !b.startDate || localDate(b.startDate) <= due;
        return s + (started && due >= start && due <= end ? num(b.amount) : 0);
      }, 0);
      const credits = state.credits.reduce((s, c) => {
        for (let n = 1; n <= creditTotalMonths(c); n++) {
          const d = creditInstallmentDate(c, n);
          if (d >= start && d <= end) s += num(c.monthly);
        }
        return s;
      }, 0);
      const deferred = state.expenses.filter(e => e.payment === "deferred" && localDate(e.date) >= start && localDate(e.date) <= end).reduce((s, e) => s + num(e.amount), 0);
      const immediate = state.expenses.filter(e => e.payment !== "deferred" && localDate(e.date) >= start && localDate(e.date) <= end).reduce((s, e) => s + num(e.amount), 0);
      simulated += income - bills - credits - deferred - immediate;
    }
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
    const cm = state.credits.reduce((s, c) => {
      const st = creditStatus(c, monthEnd);
      return s + (st.remaining > 0 ? num(c.monthly) : 0);
    }, 0);
    rows.push({ label: monthLabel(start), balance: simulated, savings: num(state.savings), credits: cm });
  }
  return rows;
}
function renderEvolution() {
  drawChart();
  $("projectionTable").innerHTML = projection(12).map(r => `<div class="projection-row"><span>${esc(r.label)}</span><strong>${money(r.balance)}</strong><span>${money(r.credits)}/mois</span></div>`).join("");
  document.querySelectorAll(".view-tab").forEach(b => b.classList.toggle("active", b.dataset.view === chartMode));
}
function drawChart() {
  const c = $("evolutionChart"); if (!c) return;
  const r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
  const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rows = projection(24), vals = rows.map(z => chartMode === "credits" ? z.credits : chartMode === "savings" ? z.savings : z.balance);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0), range = Math.max(1, max - min), w = r.width, h = r.height, p = 30;
  x.clearRect(0, 0, w, h); x.strokeStyle = "rgba(148,163,184,.15)";
  for (let i = 0; i < 5; i++) { const y = p + (h - 2 * p) * i / 4; x.beginPath(); x.moveTo(p, y); x.lineTo(w - p, y); x.stroke(); }
  const color = chartMode === "credits" ? "#ef4444" : chartMode === "savings" ? "#22c55e" : "#3b82f6";
  x.strokeStyle = color; x.lineWidth = 3; x.beginPath();
  vals.forEach((v, i) => { const xx = p + (w - 2 * p) * i / (vals.length - 1), yy = h - p - ((v - min) / range) * (h - 2 * p); i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); });
  x.stroke();
  x.fillStyle = "#94a3b8"; x.font = "10px sans-serif";
  rows.forEach((z, i) => { if (i % 4 === 0) { const xx = p + (w - 2 * p) * i / (rows.length - 1); x.fillText(z.label.slice(0, 3), xx - 7, h - 8); } });
}

/* =============================
   PARAMÈTRES / SIMULATION
   ============================= */
function settingsModal() {
  openModal("⚙️ Paramètres", `<div class="form-group"><label>Solde de départ (€)</label><input id="sb" type="number" step="0.01" value="${num(state.settings.startingBalance)}"></div><div class="form-group"><label>Découvert autorisé (€)</label><input id="so" type="number" step="0.01" value="${state.settings.overdraft}"></div><p class="muted">Indique le solde avant les opérations du calendrier. Finance Quest y ajoute ou retire ensuite les revenus, dépenses, prélèvements et échéances déjà dus.</p><div class="form-actions"><button class="primary" id="saveSet">Enregistrer</button></div>`);
  $("saveSet").onclick = () => { state.settings.startingBalance = num($("sb").value); state.settings.overdraft = num($("so").value); rebuildBalanceFromCalendar(); save(); closeModal(); renderAll(); };
}
function simulation() {
  openModal("🔮 Simulation", `<div class="form-group"><label>Revenu ponctuel (€)</label><input id="si" type="number" step="0.01" value="0"></div><div class="form-group"><label>Dépense immédiate (€)</label><input id="sx" type="number" step="0.01" value="0"></div><div class="form-group"><label>Nouveau crédit — mensualité (€)</label><input id="sc" type="number" step="0.01" value="0"></div><div class="form-group"><label>Durée (mois)</label><input id="sm" type="number" min="1" value="4"></div><div id="sr" class="sim-card">Entre les valeurs puis calcule.</div><button class="primary" id="goSim">Calculer</button>`);
  $("goSim").onclick = () => {
    const inc = num($("si").value), exp = num($("sx").value), cr = num($("sc").value), m = Math.max(1, Math.round(num($("sm").value))), base = forecast(), next = base + inc - exp - cr;
    $("sr").innerHTML = `<p>Prévision actuelle : <strong>${money(base)}</strong></p><p>Prévision simulée : <strong>${money(next)}</strong></p><p>Crédits actuels : <strong>${money(monthlyCredits())}/mois</strong></p><p>Avec nouveau crédit : <strong>${money(monthlyCredits() + cr)}/mois</strong></p><p>Coût total du nouveau crédit : <strong>${money(cr * m)}</strong></p>`;
  };
}

function renderAll() { renderHome(); renderCalendar(); renderCredits(); renderEvolution(); }
function init() { settleDueOperations(); setup(); renderAll(); }
document.addEventListener("DOMContentLoaded", init);
