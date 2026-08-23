const KEY = "financeQuest_v4_4";
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
  subscriptions: [],
  settings: {
    overdraft: 100,
    salaryEuropcar: 0,
    salaryDominos: 0,
    ticketsRestaurant: 0,
    monthProgressKey: ""
  }
};

let state = load();
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
  });
  const currentMonth = monthKey(today);
  state.bills.forEach(b => {
    const day = Math.min(31, Math.max(1, Math.round(num(b.day))));
    if (b.active !== false && today.getDate() >= day && b.lastAppliedMonth !== currentMonth) {
      state.balance -= num(b.amount);
      b.lastAppliedMonth = currentMonth;
      changed = true;
    }
  });
  state.subscriptions.forEach(sub => {
    if (sub.active === false || !sub.startDate) return;
    const due = subscriptionDueOnOrBeforeToday(sub);
    if (due && due <= todayKey() && sub.lastAppliedDue !== due) {
      state.balance -= num(sub.amount);
      sub.lastAppliedDue = due;
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
function merge(a, b) {
  return {
    ...a,
    ...b,
    settings: { ...a.settings, ...(b.settings || {}) },
    bills: Array.isArray(b.bills) ? b.bills : [],
    credits: Array.isArray(b.credits) ? b.credits : [],
    expenses: Array.isArray(b.expenses) ? b.expenses : [],
    incomes: Array.isArray(b.incomes) ? b.incomes : [],
    completedCredits: Array.isArray(b.completedCredits) ? b.completedCredits : [],
    subscriptions: Array.isArray(b.subscriptions) ? b.subscriptions : []
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
function creditPaidCount(c, asOf = new Date()) {
  const total = creditTotalMonths(c);
  let paid = 0;
  for (let i = 1; i <= total; i++) if (creditInstallmentDate(c, i) <= asOf) paid++;
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
   ABONNEMENTS
   ============================= */
function subscriptionFrequencyLabel(f) { return f === "yearly" ? "annuel" : "mensuel"; }
function subscriptionDueDateForMonth(sub, year, month) {
  const start = localDate(sub.startDate || todayKey());
  if (sub.frequency === "yearly" && (year < start.getFullYear() || (year === start.getFullYear() && month < start.getMonth()))) return null;
  if (sub.frequency === "monthly" && new Date(year, month + 1, 0).getTime() < new Date(start.getFullYear(), start.getMonth(), 1).getTime()) return null;
  if (sub.frequency === "yearly" && year === start.getFullYear() && month < start.getMonth()) return null;
  if (sub.frequency === "yearly" && month !== start.getMonth()) return null;
  const day = Math.min(start.getDate(), new Date(year, month + 1, 0).getDate());
  const d = new Date(year, month, day, 12);
  return d >= start ? d : null;
}
function subscriptionDueOnOrBeforeToday(sub) {
  const today = new Date();
  const start = localDate(sub.startDate || todayKey());
  if (start > today) return null;
  if (sub.frequency === "yearly") {
    let year = today.getFullYear();
    let d = new Date(year, start.getMonth(), Math.min(start.getDate(), new Date(year, start.getMonth()+1, 0).getDate()), 12);
    if (d > today) year--;
    d = new Date(year, start.getMonth(), Math.min(start.getDate(), new Date(year, start.getMonth()+1, 0).getDate()), 12);
    if (d < start) return null;
    return iso(d);
  }
  const day = Math.min(start.getDate(), new Date(today.getFullYear(), today.getMonth()+1, 0).getDate());
  let d = new Date(today.getFullYear(), today.getMonth(), day, 12);
  if (d > today) d = new Date(today.getFullYear(), today.getMonth()-1, Math.min(start.getDate(), new Date(today.getFullYear(), today.getMonth(), 0).getDate()), 12);
  if (d < start) return null;
  return iso(d);
}
function subscriptionMonthlyEquivalent(sub) { return sub.frequency === "yearly" ? num(sub.amount) / 12 : num(sub.amount); }
function subscriptionAnnualCost(sub) { return sub.frequency === "yearly" ? num(sub.amount) : num(sub.amount) * 12; }
function activeSubscriptions() { return state.subscriptions.filter(s => s.active !== false); }
function subscriptionsMonthlyTotal() { return activeSubscriptions().reduce((s, sub) => s + subscriptionMonthlyEquivalent(sub), 0); }
function subscriptionsAnnualTotal() { return activeSubscriptions().reduce((s, sub) => s + subscriptionAnnualCost(sub), 0); }
function subscriptionsThrough(endDate) {
  const now = new Date(); now.setHours(12,0,0,0);
  const today = todayKey();
  return activeSubscriptions().reduce((sum, sub) => {
    const s = localDate(sub.startDate || today);
    if (s > endDate) return sum;
    let total = 0;
    if (sub.frequency === "yearly") {
      for (let y = s.getFullYear(); y <= endDate.getFullYear(); y++) {
        const d = new Date(y, s.getMonth(), Math.min(s.getDate(), new Date(y, s.getMonth()+1,0).getDate()), 12);
        const key = iso(d);
        // Only future instalments belong in the forecast. A due date already applied
        // to the real balance must never be counted a second time.
        if (d > now && d <= endDate && key !== sub.lastAppliedDue) total += num(sub.amount);
      }
    } else {
      let cursor = new Date(s.getFullYear(), s.getMonth(), 1, 12);
      for (let i=0; i<120 && cursor <= endDate; i++) {
        const d = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(s.getDate(), new Date(cursor.getFullYear(), cursor.getMonth()+1,0).getDate()), 12);
        const key = iso(d);
        if (d > now && d <= endDate && d >= s && key !== sub.lastAppliedDue) total += num(sub.amount);
        cursor = new Date(cursor.getFullYear(), cursor.getMonth()+1, 1, 12);
      }
    }
    return sum + total;
  }, 0);
}

/* =============================
   OPÉRATIONS / CALCULS
   ============================= */
function recurringBills() { return state.bills.filter(b => b.active !== false).reduce((s, b) => s + num(b.amount), 0); }
function recurringIncome() { return state.incomes.filter(i => i.type === "recurrent").reduce((s, i) => s + num(i.amount), 0); }
function futureOneOffIncomeThrough(endDate) {
  return state.incomes.filter(i => i.type === "oneoff" && i.date > todayKey() && localDate(i.date) <= endDate).reduce((s, i) => s + num(i.amount), 0);
}
function pendingIncome() {
  return state.incomes.filter(i => i.date && i.date > todayKey()).reduce((s, i) => s + num(i.amount), 0);
}
function monthExpenses() {
  const n = new Date();
  return state.expenses.filter(e => sameMonth(e.date, n)).reduce((s, e) => s + num(e.amount), 0);
}
function monthDeferred() {
  const n = new Date();
  return state.expenses.filter(e => e.payment === "deferred" && sameMonth(e.date, n)).reduce((s, e) => s + num(e.amount), 0);
}
function futureDeferredThrough(endDate) {
  return state.expenses.filter(e => e.payment === "deferred" && e.date >= todayKey() && localDate(e.date) <= endDate).reduce((s, e) => s + num(e.amount), 0);
}
function recurringBillsThroughMonth(endDate) {
  const now = new Date();
  return state.bills.filter(b => b.active !== false).reduce((sum, b) => {
    const day = Math.min(31, Math.max(1, Math.round(num(b.day))));
    const due = new Date(now.getFullYear(), now.getMonth(), day, 12);
    return sum + (due > now && due <= endDate ? num(b.amount) : 0);
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
    - recurringBillsThroughMonth(end)
    - futureCreditThrough(end)
    - futureDeferredThrough(end)
    - futureImmediateExpensesThrough(end)
    - subscriptionsThrough(end);
}
function billsDueNowOrLater() {
  const now = new Date();
  const day = now.getDate();
  const billTotal = state.bills.filter(b => b.active !== false && num(b.day) > day).reduce((s, b) => s + num(b.amount), 0);
  const creditTotal = state.credits.reduce((s, c) => s + creditFutureInstallmentsThrough(c, now, new Date(now.getFullYear(), now.getMonth() + 1, 0, 12)), 0);
  const deferred = state.expenses.filter(e => e.payment === "deferred" && e.date >= todayKey() && sameMonth(e.date, now)).reduce((s, e) => s + num(e.amount), 0);
  const subTotal = activeSubscriptions().reduce((s, sub) => {
    const d = subscriptionDueDateForMonth(sub, now.getFullYear(), now.getMonth());
    return s + (d && d >= now ? num(sub.amount) : 0);
  }, 0);
  return billTotal + creditTotal + deferred + subTotal;
}
function monthIncomeReceived() {
  const n = new Date();
  return state.incomes.filter(i => sameMonth(i.date, n) && i.date <= todayKey()).reduce((s, i) => s + num(i.amount), 0);
}
function monthCreditTotal() { return state.credits.reduce((s, c) => s + (creditStatus(c).paid > 0 && sameMonth(iso(creditStart(c)), new Date()) ? 0 : 0), 0); }

/* =============================
   NAVIGATION
   ============================= */
function setup() {
  document.querySelectorAll(".nav-btn").forEach(b => b.onclick = () => show(b.dataset.screen));
  $("settingsBtn").onclick = settingsModal;
  $("simulateBtn").onclick = simulation;
  $("prevMonth").onclick = () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); renderCalendar(); };
  $("nextMonth").onclick = () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); renderCalendar(); };
  $("addCreditBtn").onclick = () => openOperation(todayKey(), "credit");
  $("addSubscriptionBtn").onclick = () => openOperation(todayKey(), "subscription");
  $("modalClose").onclick = closeModal;
  $("modal").onclick = e => { if (e.target === $("modal")) closeModal(); };
  document.querySelectorAll(".view-tab").forEach(b => b.onclick = () => { chartMode = b.dataset.view; renderEvolution(); });
  let touchStartX = null, touchStartY = null;
  const cal = $("calendarGrid");
  cal.addEventListener("touchstart", e => { const t=e.changedTouches[0]; touchStartX=t.clientX; touchStartY=t.clientY; }, {passive:true});
  cal.addEventListener("touchend", e => {
    if (touchStartX === null) return;
    const t=e.changedTouches[0], dx=t.clientX-touchStartX, dy=t.clientY-touchStartY;
    touchStartX=touchStartY=null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)*1.3) {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + (dx < 0 ? 1 : -1), 1);
      renderCalendar();
    }
  }, {passive:true});
}
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id)?.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.screen === id));
  if (id === "calendarScreen") renderCalendar();
  if (id === "creditsScreen") renderCredits();
  if (id === "subscriptionsScreen") renderSubscriptions();
  if (id === "evolutionScreen") renderEvolution();
}
function openModal(title, body) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = body;
  $("modal").classList.remove("hidden");
}
function closeModal() { $("modal").classList.add("hidden"); $("modalBody").innerHTML = ""; }

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
  if ($("debtTotalHome")) $("debtTotalHome").textContent = money(debtRemaining());
  if ($("creditMonthlyTotal")) $("creditMonthlyTotal").textContent = money(monthlyCredits());
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
    if (i.type === "oneoff" && i.date === k) events.push({ type: "income", text: "💰 +" + money(i.amount), detail: `${i.label || "Revenu"}${i.note ? " · 📝 " + i.note : ""}`, name: i.label });
    if (i.type === "recurrent" && num(i.day) === day) events.push({ type: "income", text: "💰 +" + money(i.amount), detail: i.label || "Revenu récurrent", name: i.label });
  });
  state.expenses.forEach(e => {
    if (e.date === k) events.push({ type: e.payment === "deferred" ? "deferred" : "expense", text: (e.payment === "deferred" ? "💳 " : "🛒 ") + money(e.amount), detail: `${e.category || "Dépense"}${e.payment === "deferred" ? " · débit différé" : ""}${e.note ? " · 📝 " + e.note : ""}`, name: e.category });
  });
  state.bills.forEach(b => {
    if (num(b.day) === day && b.active !== false) events.push({ type: "credit", text: "🔄 " + b.name + " -" + money(b.amount), detail: `Prélèvement récurrent${b.note ? " · 📝 " + b.note : ""}`, name: b.name });
  });
  activeSubscriptions().forEach(sub => {
    const due = subscriptionDueDateForMonth(sub, date.getFullYear(), date.getMonth());
    if (due && iso(due) === k) events.push({ type: "credit", subscriptionId: sub.id, text: `🔄 ${sub.name} -${money(sub.amount)}`, detail: `${subscriptionFrequencyLabel(sub.frequency)} · abonnement${sub.note ? " · 📝 " + sub.note : ""}`, name: sub.name });
  });
  state.credits.forEach(c => {
    const total = creditTotalMonths(c);
    for (let i = 1; i <= total; i++) {
      const due = creditInstallmentDate(c, i);
      if (iso(due) !== k) continue;
      const isPaid = due <= new Date();
      const remainingAfter = Math.max(0, total - i);
      events.push({
        type: "credit", creditId: c.id, installment: i, total, paid: isPaid,
        text: `🏦 ${c.name} -${money(c.monthly)} · ${i}/${total}`,
        detail: `${i}/${total} · restant après paiement ${money(remainingAfter * num(c.monthly))}${c.note ? " · 📝 " + c.note : ""}`,
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
    const weekday = date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
    const eventsHtml = ev.length
      ? ev.slice(0, 5).map(e => `<span class="event event-${e.type}">${e.text}</span>`).join("")
      : `<span class="calendar-empty">Aucune opération</span>`;
    html += `<button class="calendar-day vertical-day ${today ? "today" : ""}" data-date="${iso(date)}"><span class="calendar-date"><span class="calendar-weekday">${weekday}</span><span class="calendar-day-number">${d}</span></span><span class="calendar-events">${eventsHtml}</span></button>`;
  }
  $("calendarGrid").innerHTML = html;
  document.querySelectorAll("[data-date]").forEach(b => b.onclick = () => openDay(b.dataset.date, false));
}

function openDay(dateKey, fromCredits = false) {
  const date = localDate(dateKey), events = dayEvents(date);
  const eventHtml = events.length ? events.map(e => `<div class="day-event-row"><strong>${e.text}</strong><span class="muted">${esc(e.detail || e.name || "")}</span></div>`).join("") : `<p class="muted">Aucune opération.</p>`;
  const extra = fromCredits ? `<p class="muted">Tu peux créer ton crédit depuis cette date.</p>` : "";
  openModal("📅 " + date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), `<button class="primary" id="newOperation">＋ Nouvelle opération</button><div class="panel">${eventHtml}</div>${extra}`);
  $("newOperation").onclick = () => openOperation(dateKey, "calendar");
}

/* =============================
   NOUVELLE OPÉRATION
   ============================= */
function openOperation(defaultDate, context = "calendar") {
  const choicesByContext = {
    calendar: [
      ["expense", "💳 Dépense"],
      ["income", "💰 Revenu"],
      ["credit", "🏦 Paiement fractionné"],
      ["subscription", "🎵 Abonnement"]
    ],
    credit: [
      ["expense", "💳 Dépense"],
      ["credit", "🏦 Paiement fractionné"]
    ],
    subscription: [
      ["subscription", "🎵 Abonnement"]
    ]
  };
  const choices = (choicesByContext[context] || choicesByContext.calendar)
    .map(([type, label]) => `<button class="choice-btn" data-op="${type}">${label}</button>`)
    .join("");
  openModal("➕ Nouvelle opération", `<div class="choice-grid">${choices}</div><div id="opForm" class="panel muted">Choisis un type.</div>`);
  document.querySelectorAll("[data-op]").forEach(b => b.onclick = () => renderOperationForm(b.dataset.op, defaultDate));
}

function renderOperationForm(type, date) {
  const box = $("opForm");
  if (type === "expense") {
    box.innerHTML = `<div class="form-group"><label>Montant (€)</label><input id="oa" type="number" step="0.01"></div><div class="form-group"><label>Nature</label><select id="on"><option>Alimentation</option><option>Carburant</option><option>Loisirs</option><option>Parfums</option><option>Sport</option><option>Maison</option><option>Transport</option><option>Divers</option></select></div><div class="form-group"><label>Mode de paiement</label><select id="op"><option value="deferred">💳 Carte — débit différé</option><option value="instant">💳 Carte — débit immédiat</option><option value="cash">💵 Espèces</option><option value="transfer">🏦 Virement</option></select></div><div class="form-group"><label>Note / commentaire (facultatif)</label><textarea id="onote" rows="2" placeholder="Ex. paiement anticipé important..."></textarea></div><button class="primary" id="saveOp">Enregistrer</button>`;
    $("saveOp").onclick = () => {
      const amount = num($("oa").value), payment = $("op").value;
      if (amount <= 0) return alert("Montant invalide.");
      state.expenses.push({ id: uid("exp"), date, amount, category: $("on").value, payment, note: $("onote").value.trim() });
      if (!isFutureDate(date) && payment !== "deferred") state.balance -= amount;
      save(); closeModal(); renderAll();
    };
  }
  if (type === "income") {
    box.innerHTML = `<div class="form-group"><label>Origine</label><input id="ol" placeholder="Europcar, Domino's, vente..."></div><div class="form-group"><label>Montant (€)</label><input id="oa" type="number" step="0.01"></div><div class="form-group"><label>Note / commentaire (facultatif)</label><textarea id="onote" rows="2"></textarea></div><p class="muted">Une date future reste dans « Revenus à recevoir » et ne modifie pas le solde réel avant son arrivée.</p><button class="primary" id="saveOp">Enregistrer</button>`;
    $("saveOp").onclick = () => {
      const amount = num($("oa").value);
      if (amount <= 0) return alert("Montant invalide.");
      const future = isFutureDate(date);
      state.incomes.push({ id: uid("inc"), label: $("ol").value.trim() || "Revenu", amount, date, type: "oneoff", received: !future, note: $("onote").value.trim() });
      if (!future) state.balance += amount;
      save(); closeModal(); renderAll();
    };
  }
  if (type === "credit") {
    box.innerHTML = `<div class="form-group"><label>Organisme / nom</label><input id="cl" placeholder="PayPal, Cofidis..."></div><div class="form-group"><label>Mensualité (€)</label><input id="cm" type="number" step="0.01"></div><div class="form-group"><label>Nombre total de mensualités</label><input id="cr" type="number" min="1" value="4"></div><div class="form-group"><label>Date du premier paiement</label><input id="cd" type="date" value="${esc(date)}"></div><div class="form-group"><label>Note / commentaire (facultatif)</label><textarea id="cnote" rows="2"></textarea></div><p class="muted">La 1re mensualité est payée le jour de l'achat. Les suivantes sont programmées chaque mois, jusqu'à la dernière.</p><button class="primary" id="saveOp">Créer le crédit</button>`;
    $("saveOp").onclick = () => {
      const monthly = num($("cm").value), months = Math.max(1, Math.round(num($("cr").value))), start = $("cd").value || date, d = localDate(start), pastOrToday = !isFutureDate(start);
      if (monthly <= 0) return alert("Mensualité invalide.");
      const credit = { id: uid("credit"), name: $("cl").value.trim() || "Nouveau crédit", monthly, totalMonths: months, startDate: start, day: d.getDate(), firstPaymentApplied: pastOrToday, balanceAdjustedForFirstPayment: pastOrToday, note: $("cnote").value.trim() };
      state.credits.push(credit);
      if (pastOrToday) state.balance -= monthly;
      save(); closeModal(); renderAll();
    };
  }
  if (type === "subscription") {
    box.innerHTML = `<div class="form-group"><label>Nom de l'abonnement</label><input id="sl" placeholder="Spotify, Netflix..."></div><div class="form-group"><label>Montant (€)</label><input id="sa" type="number" step="0.01"></div><div class="form-group"><label>Fréquence</label><select id="sf"><option value="monthly">Mensuel</option><option value="yearly">Annuel</option></select></div><div class="form-group"><label>Prochain prélèvement</label><input id="sd" type="date" value="${esc(date)}"></div><div class="form-group"><label>Catégorie</label><select id="scat"><option>Streaming</option><option>Téléphonie</option><option>Sport</option><option>Logiciel</option><option>Assurance</option><option>Maison</option><option>Autre</option></select></div><div class="form-group"><label>Note / commentaire (facultatif)</label><textarea id="snote" rows="2"></textarea></div><button class="primary" id="saveOp">Ajouter l'abonnement</button>`;
    $("saveOp").onclick = () => {
      const amount = num($("sa").value), start = $("sd").value || date;
      if (amount <= 0 || !start) return alert("Vérifie les valeurs.");
      const sub = { id: uid("sub"), name: $("sl").value.trim() || "Abonnement", amount, frequency: $("sf").value, startDate: start, category: $("scat").value, active: true, lastAppliedDue: "", note: $("snote").value.trim() };
      state.subscriptions.push(sub);
      const due = subscriptionDueOnOrBeforeToday(sub);
      if (due && due <= todayKey()) { state.balance -= amount; sub.lastAppliedDue = due; }
      save(); closeModal(); renderAll();
    };
  }
  if (type === "bill") {
    box.innerHTML = `<div class="form-group"><label>Nom</label><input id="bl" placeholder="Loyer, Spotify..."></div><div class="form-group"><label>Montant (€)</label><input id="ba" type="number" step="0.01"></div><div class="form-group"><label>Jour du mois</label><input id="bd" type="number" min="1" max="31" value="${localDate(date).getDate()}"></div><div class="form-group"><label>Note / commentaire (facultatif)</label><textarea id="bnote" rows="2"></textarea></div><button class="primary" id="saveOp">Créer le prélèvement</button>`;
    $("saveOp").onclick = () => {
      const amount = num($("ba").value);
      if (amount <= 0) return alert("Montant invalide.");
      const day = Math.min(31, Math.max(1, Math.round(num($("bd").value))));
      const bill = { id: uid("bill"), name: $("bl").value.trim() || "Prélèvement", amount, day, active: true, lastAppliedMonth: "", note: $("bnote").value.trim() };
      state.bills.push(bill);
      if (day <= new Date().getDate()) { state.balance -= amount; bill.lastAppliedMonth = monthKey(new Date()); }
      save(); closeModal(); renderAll();
    };
  }
}

/* =============================
   ABONNEMENTS UI
   ============================= */
function renderSubscriptions() {
  const active = activeSubscriptions();
  $("subscriptionMonthlySummary").textContent = money(subscriptionsMonthlyTotal());
  $("subscriptionAnnualSummary").textContent = money(subscriptionsAnnualTotal());
  $("activeSubscriptionCount").textContent = active.length;
  $("subscriptionEquivalent").textContent = money(subscriptionsMonthlyTotal());
  $("subscriptionList").innerHTML = active.length ? active.map(sub => {
    const d = subscriptionDueOnOrBeforeToday(sub);
    const next = nextSubscriptionDate(sub);
    return `<div class="credit-row"><div><h3>${esc(sub.name)}</h3><div class="muted">${money(sub.amount)} · ${subscriptionFrequencyLabel(sub.frequency)}</div><div class="muted">Prochain prélèvement : <strong>${esc(next.toLocaleDateString("fr-FR"))}</strong> · ${money(subscriptionAnnualCost(sub))}/an</div>${sub.note ? `<div class="note-line">📝 ${esc(sub.note)}</div>` : ""}</div><div class="credit-right"><button class="small-btn" data-sub-edit="${sub.id}">✏️ Modifier</button><button class="danger" data-sub-del="${sub.id}">Supprimer</button></div></div>`;
  }).join("") : `<div class="panel">Aucun abonnement actif.</div>`;
  document.querySelectorAll("[data-sub-del]").forEach(b => b.onclick = () => {
    if (!confirm("Supprimer cet abonnement et ses futurs prélèvements ?")) return;
    state.subscriptions = state.subscriptions.filter(s => s.id !== b.dataset.subDel); save(); renderAll();
  });
  document.querySelectorAll("[data-sub-edit]").forEach(b => b.onclick = () => editSubscription(b.dataset.subEdit));
}
function nextSubscriptionDate(sub) {
  const today = new Date(); today.setHours(12,0,0,0);
  const start = localDate(sub.startDate || todayKey());
  if (sub.frequency === "yearly") {
    let d = new Date(today.getFullYear(), start.getMonth(), Math.min(start.getDate(), new Date(today.getFullYear(), start.getMonth()+1,0).getDate()), 12);
    if (d < today) d = new Date(today.getFullYear()+1, start.getMonth(), Math.min(start.getDate(), new Date(today.getFullYear()+1, start.getMonth()+1,0).getDate()), 12);
    if (d < start) d = start;
    return d;
  }
  let d = new Date(today.getFullYear(), today.getMonth(), Math.min(start.getDate(), new Date(today.getFullYear(), today.getMonth()+1,0).getDate()), 12);
  if (d < today) d = new Date(today.getFullYear(), today.getMonth()+1, Math.min(start.getDate(), new Date(today.getFullYear(), today.getMonth()+2,0).getDate()), 12);
  if (d < start) d = start;
  return d;
}
function editSubscription(id) {
  const sub = state.subscriptions.find(s => s.id === id); if (!sub) return;
  openModal("✏️ Modifier l'abonnement", `<div class="form-group"><label>Nom</label><input id="sel" value="${esc(sub.name)}"></div><div class="form-group"><label>Montant (€)</label><input id="sea" type="number" step="0.01" value="${num(sub.amount)}"></div><div class="form-group"><label>Fréquence</label><select id="sef"><option value="monthly" ${sub.frequency === "monthly" ? "selected" : ""}>Mensuel</option><option value="yearly" ${sub.frequency === "yearly" ? "selected" : ""}>Annuel</option></select></div><div class="form-group"><label>Prochain prélèvement</label><input id="sed" type="date" value="${esc(sub.startDate)}"></div><div class="form-group"><label>Catégorie</label><input id="sec" value="${esc(sub.category || "Autre")}"></div><div class="form-group"><label>Note / commentaire</label><textarea id="sen" rows="3">${esc(sub.note || "")}</textarea></div><div class="form-actions"><button class="primary" id="saveSubEdit">Enregistrer</button><button class="small-btn" id="cancelSubEdit">Annuler</button></div>`);
  $("cancelSubEdit").onclick = closeModal;
  $("saveSubEdit").onclick = () => {
    const amount = num($("sea").value), start = $("sed").value;
    if (amount <= 0 || !start) return alert("Vérifie les valeurs.");
    const oldAmount = num(sub.amount), oldAppliedDue = sub.lastAppliedDue;
    sub.name = $("sel").value.trim() || "Abonnement"; sub.amount = amount; sub.frequency = $("sef").value; sub.startDate = start; sub.category = $("sec").value.trim() || "Autre"; sub.note = $("sen").value.trim();
    const newDue = subscriptionDueOnOrBeforeToday(sub);
    if (oldAppliedDue) {
      if (newDue && newDue <= todayKey()) {
        state.balance += oldAmount - amount;
        sub.lastAppliedDue = newDue;
      } else {
        state.balance += oldAmount;
        sub.lastAppliedDue = "";
      }
    } else if (newDue === todayKey()) {
      state.balance -= amount;
      sub.lastAppliedDue = newDue;
    }
    save(); closeModal(); renderAll();
  };
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
    return `<div class="credit-row"><div><h3>${esc(c.name)}</h3><div class="muted">${st.remaining} mensualité${st.remaining > 1 ? "s" : ""} restante${st.remaining > 1 ? "s" : ""} · ${st.paid}/${st.total} déjà payée${st.paid > 1 ? "s" : ""}</div><div class="muted">Dette restante : <strong>${money(num(c.monthly) * st.remaining)}</strong> · fin ${esc(end.toLocaleDateString("fr-FR"))}</div>${c.note ? `<div class="note-line">📝 ${esc(c.note)}</div>` : ""}</div><div class="credit-right"><strong>${money(c.monthly)}</strong><span class="muted">/mois</span><br><button class="small-btn" data-edit="${c.id}">✏️ Modifier</button><button class="danger" data-del="${c.id}">Supprimer</button></div></div>`;
  }).join("") : `<div class="panel">Aucun crédit actif.</div>`;
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const c = state.credits.find(x => x.id === b.dataset.del); if (!c) return;
    if (confirm("Supprimer ce crédit ?")) {
      if (c.balanceAdjustedForFirstPayment) state.balance += num(c.monthly);
      state.credits = state.credits.filter(x => x.id !== b.dataset.del);
      save(); renderAll();
    }
  });
  document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editCredit(b.dataset.edit));
  $("completedCreditList").innerHTML = completed.length ? `<div class="panel"><div class="panel-title">🏆 Crédits terminés</div>${completed.map(c => `<p>🎉 ${esc(c.name)} — terminé le ${esc(creditEndDate(c).toLocaleDateString("fr-FR"))}</p>`).join("")}</div>` : "";
}
function editCredit(id) {
  const c = state.credits.find(x => x.id === id); if (!c) return;
  const oldMonthly = num(c.monthly), oldApplied = !!c.balanceAdjustedForFirstPayment;
  const st = creditStatus(c);
  openModal("✏️ Modifier le crédit", `<div class="panel"><p><strong>${esc(c.name)}</strong></p><p class="muted">Actuellement : ${st.paid}/${st.total} payée${st.paid > 1 ? "s" : "s"}, ${st.remaining} restante${st.remaining > 1 ? "s" : ""}.</p></div><div class="form-group"><label>Organisme / nom</label><input id="el" value="${esc(c.name)}"></div><div class="form-group"><label>Mensualité (€)</label><input id="em" type="number" step="0.01" value="${num(c.monthly)}"></div><div class="form-group"><label>Nombre total de mensualités</label><input id="er" type="number" min="1" value="${creditTotalMonths(c)}"></div><div class="form-group"><label>Date du premier paiement</label><input id="ed" type="date" value="${esc(c.startDate)}"></div><div class="form-group"><label>Note / commentaire</label><textarea id="enote" rows="3">${esc(c.note || "")}</textarea></div><p class="muted">Le calendrier et la dette restante seront recalculés.</p><div class="form-actions"><button class="primary" id="saveEdit">Enregistrer</button><button class="small-btn" id="cancelEdit">Annuler</button></div>`);
  $("cancelEdit").onclick = closeModal;
  $("saveEdit").onclick = () => {
    const monthly = num($("em").value), total = Math.max(1, Math.round(num($("er").value))), start = $("ed").value;
    if (monthly <= 0 || !start) return alert("Vérifie les valeurs.");
    const newApplied = !isFutureDate(start) && (oldApplied || start === todayKey());
    if (oldApplied) state.balance += oldMonthly;
    c.name = $("el").value.trim() || "Crédit";
    c.monthly = monthly; c.totalMonths = total; c.startDate = start; c.day = localDate(start).getDate(); c.note = $("enote").value.trim();
    c.firstPaymentApplied = newApplied;
    c.balanceAdjustedForFirstPayment = newApplied;
    if (newApplied) state.balance -= monthly;
    save(); closeModal(); renderAll();
  };
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
        const day = Math.min(31, Math.max(1, Math.round(num(b.day))));
        return s + (new Date(start.getFullYear(), start.getMonth(), day, 12) >= start && new Date(start.getFullYear(), start.getMonth(), day, 12) <= end ? num(b.amount) : 0);
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
      const subscriptions = activeSubscriptions().reduce((s, sub) => { const d = subscriptionDueDateForMonth(sub, start.getFullYear(), start.getMonth()); return s + (d && d >= start && d <= end ? num(sub.amount) : 0); }, 0);
      simulated += income - bills - credits - deferred - immediate - subscriptions;
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


function recalcBalanceFromBase(baseBalance) {
  const base = num(baseBalance);
  let result = base;
  const today = todayKey();

  // Apply all one-off incomes already received.
  state.incomes.forEach(x => {
    if (!x.date) return;
    const d = localDate(x.date);
    if (d && iso(d) <= today && x.type === "oneoff") result += num(x.amount);
  });

  // Apply recurring income only when its current-month payment is already due,
  // unless it is already represented by the base balance via a ledger marker.
  state.incomes.forEach(x => {
    if (!x.date || x.type !== "recurrent") return;
    const d = localDate(x.date);
    if (!d) return;
    const due = recurringDateForMonth(d.getDate(), d.getFullYear(), d.getMonth());
    if (iso(due) <= today && x.lastAppliedMonth !== monthKey(new Date())) result += num(x.amount);
  });

  // Apply already-due credit installments using the existing ledger.
  state.credits.forEach(c => {
    ensureCreditLedger(c);
    const applied = c.appliedInstallments || [];
    result -= num(c.monthly) * applied.length;
  });

  // Apply already-due subscriptions/bills exactly once.
  state.bills.forEach(b => {
    if (b.active === false) return;
    const started = !b.startDate || b.startDate <= today;
    if (!started) return;
    const now = new Date();
    const due = recurringDateForMonth(b.day, now.getFullYear(), now.getMonth());
    if (iso(due) <= today && b.lastAppliedMonth === monthKey(now)) {
      result -= num(b.amount);
    }
  });

  // Apply already-due immediate expenses.
  state.expenses.forEach(e => {
    if (!e.date) return;
    const d = localDate(e.date);
    if (!d || iso(d) > today) return;
    if (e.payment === "deferred") return;
    result -= num(e.amount);
  });

  return result;
}

/* =============================
   PARAMÈTRES / SIMULATION
   ============================= */
function settingsModal() {
  openModal("⚙️ Paramètres", `<div class="form-group"><label>Solde bancaire réel (€)</label><input id="sb" type="number" step="0.01" value="${state.balance}"></div><div class="form-group"><label>Découvert autorisé (€)</label><input id="so" type="number" step="0.01" value="${state.settings.overdraft}"></div><p class="muted">Les salaires et revenus se saisissent désormais dans le calendrier afin de respecter leurs vraies dates. Cette page sert principalement à corriger le solde bancaire réel.</p><div class="form-actions"><button class="primary" id="saveSet">Enregistrer</button><button class="danger" id="resetAll">Tout remettre à zéro</button></div>`);
  $("saveSet").onclick = () => { state.balance = num($("sb").value); state.settings.overdraft = num($("so").value); save(); closeModal(); renderAll(); };
  $("resetAll").onclick = () => { if (confirm("Effacer toutes les données ?")) { state = clone(DEFAULT); save(); closeModal(); renderAll(); } };
}
function simulation() {
  openModal("🔮 Simulation", `<div class="form-group"><label>Revenu ponctuel (€)</label><input id="si" type="number" step="0.01" value="0"></div><div class="form-group"><label>Dépense immédiate (€)</label><input id="sx" type="number" step="0.01" value="0"></div><div class="form-group"><label>Nouveau crédit — mensualité (€)</label><input id="sc" type="number" step="0.01" value="0"></div><div class="form-group"><label>Durée (mois)</label><input id="sm" type="number" min="1" value="4"></div><div id="sr" class="sim-card">Entre les valeurs puis calcule.</div><button class="primary" id="goSim">Calculer</button>`);
  $("goSim").onclick = () => {
    const inc = num($("si").value), exp = num($("sx").value), cr = num($("sc").value), m = Math.max(1, Math.round(num($("sm").value))), base = forecast(), next = base + inc - exp - cr;
    $("sr").innerHTML = `<p>Prévision actuelle : <strong>${money(base)}</strong></p><p>Prévision simulée : <strong>${money(next)}</strong></p><p>Crédits actuels : <strong>${money(monthlyCredits())}/mois</strong></p><p>Avec nouveau crédit : <strong>${money(monthlyCredits() + cr)}/mois</strong></p><p>Coût total du nouveau crédit : <strong>${money(cr * m)}</strong></p>`;
  };
}

function renderAll() { renderHome(); renderCalendar(); renderCredits(); renderSubscriptions(); renderEvolution(); }
function init() { settleDueOperations(); setup(); renderAll(); }
document.addEventListener("DOMContentLoaded", init);
