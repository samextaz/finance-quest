/* =========================================================
   FINANCE QUEST — V2
   BLOC 1/4 — DONNÉES ET OUTILS
   ========================================================= */

"use strict";


/* =========================================================
   DONNÉES PRINCIPALES
   ========================================================= */

const DEFAULT_DATA = {

  balance: 74,

  savings: 0,

  savingsGoal: 500,

  deferred: 0,

  income: 0,

  expenses: [],

  bills: [],

  credits: [

    {
      id: "voiture",
      name: "Voiture",
      monthly: 420.23,
      remaining: 16,
      original: 6723.68
    },

    {
      id: "tv",
      name: "TV",
      monthly: 55,
      remaining: 35,
      original: 1925
    },

    {
      id: "regroupement",
      name: "Regroupement",
      monthly: 50,
      remaining: 23,
      original: 1150
    },

    {
      id: "apple",
      name: "Apple",
      monthly: 61.63,
      remaining: 14,
      original: 862.82
    },

    {
      id: "etudes",
      name: "Études",
      monthly: 66.10,
      remaining: 11,
      original: 727.10
    },

    {
      id: "tablette",
      name: "Tablette",
      monthly: 17,
      remaining: 12,
      original: 204
    },

    {
      id: "amazon",
      name: "Amazon Noël",
      monthly: 21.76,
      remaining: 2,
      original: 43.52
    },

    {
      id: "manette",
      name: "Manette",
      monthly: 23.92,
      remaining: 3,
      original: 71.76
    }

  ],

  incomes: [],

  xp: 0,

  level: 1,

  badge: "🥉 Débutant",

  settings: {

    salaryEuropcar: 1500,

    salaryDominos: 330,

    mealTickets: 200,

    exceptionalIncome: 0,

    exceptionalSale: 0,

    rent: 250,

    insurance: 49.83,

    sport: 40,

    budgetFood: 170,

    phone: 25,

    spotify: 12,

    xbox: 20

  }

};


/* =========================================================
   CHARGEMENT / SAUVEGARDE
   ========================================================= */

const STORAGE_KEY = "financeQuestV2";


function cloneDefaultData() {

  return JSON.parse(
    JSON.stringify(DEFAULT_DATA)
  );

}


function loadData() {

  try {

    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {

      return cloneDefaultData();

    }

    const parsed =
      JSON.parse(saved);

    return mergeData(
      cloneDefaultData(),
      parsed
    );

  } catch (error) {

    console.error(
      "Erreur de chargement Finance Quest:",
      error
    );

    return cloneDefaultData();

  }

}


function mergeData(base, saved) {

  const result = {
    ...base,
    ...saved
  };

  result.settings = {
    ...base.settings,
    ...(saved.settings || {})
  };

  result.expenses =
    Array.isArray(saved.expenses)
      ? saved.expenses
      : [];

  result.bills =
    Array.isArray(saved.bills)
      ? saved.bills
      : [];

  result.credits =
    Array.isArray(saved.credits)
      ? saved.credits
      : base.credits;

  result.incomes =
    Array.isArray(saved.incomes)
      ? saved.incomes
      : [];

  return result;

}


let data = loadData();


function saveData() {

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

  } catch (error) {

    console.error(
      "Impossible de sauvegarder:",
      error
    );

  }

}


/* =========================================================
   OUTILS
   ========================================================= */

function money(value) {

  const number =
    Number(value) || 0;

  return number.toLocaleString(
    "fr-FR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ) + " €";

}


function numberValue(value) {

  if (
    typeof value === "string"
  ) {

    value =
      value
        .replace(",", ".")
        .replace(/[^\d.-]/g, "");

  }

  return Number(value) || 0;

}


function todayISO() {

  const date = new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function monthKey(date) {

  const d =
    date instanceof Date
      ? date
      : new Date(date);

  return (
    d.getFullYear() +
    "-" +
    String(
      d.getMonth() + 1
    ).padStart(2, "0")
  );

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function getElement(id) {

  return document.getElementById(id);

}


/* =========================================================
   CALCULS FINANCIERS
   ========================================================= */

function creditMonthlyTotal() {

  return data.credits.reduce(
    (total, credit) =>
      total +
      numberValue(credit.monthly),
    0
  );

}


function creditDebtTotal() {

  return data.credits.reduce(
    (total, credit) =>
      total +
      (
        numberValue(credit.monthly) *
        numberValue(credit.remaining)
      ),
    0
  );

}


function expensesTotal() {

  return data.expenses.reduce(
    (total, expense) =>
      total +
      numberValue(expense.amount),
    0
  );

}


function incomesTotal() {

  return data.incomes.reduce(
    (total, income) =>
      total +
      numberValue(income.amount),
    0
  );

}


function billsTotal() {

  return data.bills.reduce(
    (total, bill) =>
      total +
      numberValue(bill.amount),
    0
  );

}


function currentMonthExpenses() {

  const current =
    monthKey(new Date());

  return data.expenses
    .filter(
      expense =>
        monthKey(expense.date) === current
    )
    .reduce(
      (total, expense) =>
        total +
        numberValue(expense.amount),
      0
    );

}


function currentMonthIncome() {

  const current =
    monthKey(new Date());

  return data.incomes
    .filter(
      income =>
        monthKey(income.date) === current
    )
    .reduce(
      (total, income) =>
        total +
        numberValue(income.amount),
      0
    );

}


/* =========================================================
   PREVISION DE FIN DE MOIS
   ========================================================= */

function getMonthEndForecast() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    now.getMonth();

  const lastDay =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  let forecast =
    numberValue(data.balance);

  const monthlyIncome =
    numberValue(
      data.settings.salaryEuropcar
    ) +
    numberValue(
      data.settings.salaryDominos
    );

  const receivedIncome =
    currentMonthIncome();

  const remainingIncome =
    Math.max(
      0,
      monthlyIncome - receivedIncome
    );

  forecast += remainingIncome;

  forecast -=
    currentMonthExpenses();

  forecast -=
    billsTotal();

  forecast -=
    creditMonthlyTotal();

  return forecast;

}


/* =========================================================
   XP / NIVEAUX
   ========================================================= */

function updateLevel() {

  const xp =
    Math.max(
      0,
      Number(data.xp) || 0
    );

  data.level =
    Math.floor(xp / 100) + 1;

  const badges = [

    {
      min: 0,
      name: "🥉 Débutant"
    },

    {
      min: 100,
      name: "🥈 Gestionnaire"
    },

    {
      min: 300,
      name: "🥇 Épargnant"
    },

    {
      min: 600,
      name: "💎 Stratège"
    },

    {
      min: 1000,
      name: "👑 Maître financier"
    }

  ];

  let current =
    badges[0];

  badges.forEach(
    badge => {

      if (xp >= badge.min) {

        current = badge;

      }

    }
  );

  data.badge =
    current.name;

}


function addXP(amount) {

  data.xp =
    Math.max(
      0,
      Number(data.xp || 0) +
      Number(amount || 0)
    );

  updateLevel();

  saveData();

}


/* =========================================================
   EXPORT GLOBAL
   ========================================================= */

window.FinanceQuest = {

  getData: () => data,

  saveData,

  money,

  addXP,

  creditMonthlyTotal,

  creditDebtTotal,

  getMonthEndForecast

};


/* =========================================================
   FIN DU BLOC 1
   ========================================================= */
/* =========================================================
   FINANCE QUEST — V2
   BLOC 2/4 — NAVIGATION, AFFICHAGE ET DEPENSES
   ========================================================= */


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

  const buttons =
    document.querySelectorAll(
      "nav button[data-s]"
    );

  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const screenId =
          button.dataset.s;

        showScreen(screenId);

      }
    );

  });

}


function showScreen(screenId) {

  const screens =
    document.querySelectorAll(
      ".screen"
    );

  screens.forEach(screen => {

    screen.classList.remove(
      "active"
    );

  });


  const target =
    getElement(screenId);

  if (target) {

    target.classList.add(
      "active"
    );

  }


  const buttons =
    document.querySelectorAll(
      "nav button[data-s]"
    );

  buttons.forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.s === screenId
    );

  });


  if (screenId === "home") {

    render();

  }

  if (screenId === "expensesScreen") {

    renderExpenses();

  }

  if (screenId === "calendarScreen") {

    renderCalendar();

  }

  if (screenId === "billsScreen") {

    renderBills();

  }

  if (screenId === "creditsScreen") {

    renderCredits();

  }

  if (screenId === "savingScreen") {

    renderSavings();

  }

  if (screenId === "evolutionScreen") {

    renderEvolution();

  }

}


/* =========================================================
   ACCUEIL
   ========================================================= */

function renderHome() {

  const balance =
    getElement("balance");

  const forecast =
    getElement("forecast");

  const deferred =
    getElement("deferred");

  const incomeDue =
    getElement("incomeDue");

  const billsDue =
    getElement("billsDue");

  const saving =
    getElement("saving");

  const goal =
    getElement("goal");

  const savebar =
    getElement("savebar");

  const level =
    getElement("level");

  const xp =
    getElement("xp");

  const xpbar =
    getElement("xpbar");

  const badge =
    getElement("badge");

  const expenses =
    getElement("expenses");

  const income =
    getElement("income");

  const credits =
    getElement("credits");

  const fuel =
    getElement("fuel");


  if (balance) {

    balance.textContent =
      money(data.balance);

  }


  if (forecast) {

    forecast.textContent =
      money(
        getMonthEndForecast()
      );

  }


  if (deferred) {

    deferred.textContent =
      money(data.deferred);

  }


  if (incomeDue) {

    incomeDue.textContent =
      money(
        data.incomes
          .filter(
            item =>
              !item.received
          )
          .reduce(
            (sum, item) =>
              sum +
              numberValue(item.amount),
            0
          )
      );

  }


  if (billsDue) {

    billsDue.textContent =
      money(
        billsTotal()
      );

  }


  if (saving) {

    saving.textContent =
      money(data.savings);

  }


  if (goal) {

    goal.textContent =
      money(data.savingsGoal);

  }


  if (savebar) {

    const percent =
      data.savingsGoal > 0
        ? (
            data.savings /
            data.savingsGoal
          ) * 100
        : 0;

    savebar.style.width =
      Math.min(
        100,
        Math.max(
          0,
          percent
        )
      ) + "%";

  }


  updateLevel();


  if (level) {

    level.textContent =
      data.level;

  }


  if (xp) {

    const currentXP =
      data.xp % 100;

    xp.textContent =
      `${currentXP} / 100`;

  }


  if (xpbar) {

    const currentXP =
      data.xp % 100;

    xpbar.style.width =
      currentXP + "%";

  }


  if (badge) {

    badge.textContent =
      data.badge;

  }


  if (expenses) {

    expenses.textContent =
      money(
        currentMonthExpenses()
      );

  }


  if (income) {

    income.textContent =
      money(
        currentMonthIncome()
      );

  }


  if (credits) {

    credits.textContent =
      money(
        creditMonthlyTotal()
      );

  }


  if (fuel) {

    const fuelTotal =
      data.expenses
        .filter(
          item =>
            item.category ===
            "Carburant"
        )
        .reduce(
          (sum, item) =>
            sum +
            numberValue(item.amount),
          0
        );

    fuel.textContent =
      money(fuelTotal);

  }


  renderFinanceAlert();

}


/* =========================================================
   ALERTE FINANCIERE
   ========================================================= */

function renderFinanceAlert() {

  const container =
    getElement(
      "financeAlert"
    );

  if (!container) {

    return;

  }


  const forecast =
    getMonthEndForecast();


  let message = "";


  if (forecast < 0) {

    message =
      "⚠️ Attention : ta prévision de fin de mois est négative.";

  }

  else if (forecast < 100) {

    message =
      "🟠 Prudence : ta marge de sécurité est faible.";

  }

  else if (forecast < 300) {

    message =
      "🟡 Situation correcte : garde un œil sur les dépenses.";

  }

  else {

    message =
      "🟢 Bonne trajectoire : tu gardes une marge positive.";

  }


  container.innerHTML =
    `<div class="panel">${escapeHTML(message)}</div>`;

}


/* =========================================================
   DEPENSES
   ========================================================= */

function renderExpenses() {

  const container =
    getElement(
      "expenseList"
    );

  if (!container) {

    return;

  }


  if (
    data.expenses.length === 0
  ) {

    container.innerHTML = `

      <div class="panel">

        <b>
          Aucune dépense
        </b>

        <p class="muted">
          Ajoute ta première dépense
          avec le bouton +.
        </p>

        <button
          class="primary"
          id="emptyExpenseAdd"
        >
          ＋ Ajouter une dépense
        </button>

      </div>

    `;


    const addButton =
      getElement(
        "emptyExpenseAdd"
      );

    if (addButton) {

      addButton.addEventListener(
        "click",
        () => openExpenseModal()
      );

    }

    return;

  }


  const sorted =
    [...data.expenses]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      );


  container.innerHTML =
    sorted.map(
      expense => `

        <div class="panel">

          <div class="summary">

            <div>

              <strong>
                ${escapeHTML(
                  expense.label
                )}
              </strong>

              <small>
                ${escapeHTML(
                  expense.category
                )}
              </small>

            </div>

            <div>

              <strong>
                -${money(
                  expense.amount
                )}
              </strong>

              <small>
                ${escapeHTML(
                  expense.date
                )}
              </small>

            </div>

          </div>

          <button
            class="danger expense-delete"
            data-id="${escapeHTML(
              expense.id
            )}"
          >
            Supprimer
          </button>

        </div>

      `
    )
    .join("");


  container
    .querySelectorAll(
      ".expense-delete"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteExpense(
            button.dataset.id
          );

        }
      );

    });

}


function addExpense(
  label,
  amount,
  category,
  date = todayISO()
) {

  const value =
    numberValue(amount);


  if (
    !label ||
    value <= 0
  ) {

    return false;

  }


  const expense = {

    id:
      "expense_" +
      Date.now(),

    label:
      label.trim(),

    amount:
      value,

    category:
      category || "Divers",

    date

  };


  data.expenses.push(
    expense
  );


  data.balance -=
    value;


  addXP(10);

  saveData();

  render();

  renderExpenses();

  renderCalendar();

  return true;

}


function deleteExpense(id) {

  const index =
    data.expenses.findIndex(
      item =>
        item.id === id
    );


  if (index === -1) {

    return;

  }


  const expense =
    data.expenses[index];


  data.balance +=
    numberValue(
      expense.amount
    );


  data.expenses.splice(
    index,
    1
  );


  saveData();

  render();

  renderExpenses();

  renderCalendar();

}


/* =========================================================
   MODALE DEPENSE
   ========================================================= */

function openExpenseModal() {

  const modal =
    getElement("modal");

  const content =
    getElement(
      "modalContent"
    );

  if (!modal || !content) {

    return;

  }


  content.innerHTML = `

    <label>
      Libellé

      <input
        id="expenseLabel"
        type="text"
        placeholder="Ex. Carrefour"
      >

    </label>


    <label>
      Montant (€)

      <input
        id="expenseAmount"
        type="number"
        step="0.01"
        inputmode="decimal"
        placeholder="0,00"
      >

    </label>


    <label>
      Catégorie

      <select
        id="expenseCategory"
      >

        <option>
          Alimentation
        </option>

        <option>
          Carburant
        </option>

        <option>
          Logement
        </option>

        <option>
          Loisirs
        </option>

        <option>
          Parfums
        </option>

        <option>
          Sport
        </option>

        <option>
          Abonnements
        </option>

        <option>
          Vêtements
        </option>

        <option>
          Vacances
        </option>

        <option>
          Divers
        </option>

      </select>

    </label>


    <label>
      Date

      <input
        id="expenseDate"
        type="date"
        value="${todayISO()}"
      >

    </label>


    <button
      class="primary"
      id="confirmExpense"
    >
      Enregistrer
    </button>

  `;


  modal.classList.remove(
    "hidden"
  );


  const confirm =
    getElement(
      "confirmExpense"
    );


  if (confirm) {

    confirm.addEventListener(
      "click",
      () => {

        const label =
          getElement(
            "expenseLabel"
          ).value;

        const amount =
          getElement(
            "expenseAmount"
          ).value;

        const category =
          getElement(
            "expenseCategory"
          ).value;

        const date =
          getElement(
            "expenseDate"
          ).value ||
          todayISO();


        const success =
          addExpense(
            label,
            amount,
            category,
            date
          );


        if (success) {

          closeModal();

        }

      }
    );

  }

}


/* =========================================================
   FIN DU BLOC 2
   ========================================================= */
/* =========================================================
   FINANCE QUEST — V2
   BLOC 3/4 — PRELEVEMENTS, CREDITS, CALENDRIER
   ========================================================= */


/* =========================================================
   FERMETURE DE LA MODALE
   ========================================================= */

function closeModal() {

  const modal =
    getElement("modal");

  if (modal) {

    modal.classList.add("hidden");

  }

}


/* =========================================================
   PRELEVEMENTS
   ========================================================= */

function renderBills() {

  const container =
    getElement("billList");

  if (!container) return;


  if (data.bills.length === 0) {

    container.innerHTML = `
      <div class="panel">
        <b>Aucun prélèvement ajouté</b>
        <p class="muted">
          Les prélèvements récurrents apparaîtront ici.
        </p>
        <button
          class="primary"
          id="addBillButton"
        >
          ＋ Ajouter un prélèvement
        </button>
      </div>
    `;

    getElement("addBillButton")
      ?.addEventListener(
        "click",
        openBillModal
      );

    return;

  }


  container.innerHTML =
    data.bills.map(
      bill => `

        <div class="panel">

          <div class="summary">

            <div>
              <strong>
                ${escapeHTML(bill.name)}
              </strong>

              <small>
                Tous les mois • le ${bill.day}
              </small>
            </div>

            <div>
              <strong>
                ${money(bill.amount)}
              </strong>

              <small>
                ${bill.active ? "Actif" : "Terminé"}
              </small>
            </div>

          </div>

          <button
            class="danger bill-delete"
            data-id="${escapeHTML(bill.id)}"
          >
            Supprimer
          </button>

        </div>

      `
    ).join("");


  container
    .querySelectorAll(".bill-delete")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => deleteBill(
          button.dataset.id
        )
      );

    });

}


function openBillModal() {

  const modal =
    getElement("modal");

  const content =
    getElement("modalContent");

  if (!modal || !content) return;


  content.innerHTML = `

    <label>
      Nom du prélèvement

      <input
        id="billName"
        type="text"
        placeholder="Ex. Loyer"
      >
    </label>


    <label>
      Montant (€)

      <input
        id="billAmount"
        type="number"
        step="0.01"
        inputmode="decimal"
      >
    </label>


    <label>
      Jour du mois

      <input
        id="billDay"
        type="number"
        min="1"
        max="31"
        value="5"
      >
    </label>


    <button
      class="primary"
      id="confirmBill"
    >
      Ajouter
    </button>

  `;


  modal.classList.remove("hidden");


  getElement("confirmBill")
    ?.addEventListener(
      "click",
      () => {

        const name =
          getElement("billName").value.trim();

        const amount =
          numberValue(
            getElement("billAmount").value
          );

        const day =
          Math.min(
            31,
            Math.max(
              1,
              Number(
                getElement("billDay").value
              ) || 1
            )
          );


        if (!name || amount <= 0) return;


        data.bills.push({

          id:
            "bill_" + Date.now(),

          name,

          amount,

          day,

          active: true

        });


        saveData();

        closeModal();

        render();

        renderBills();

        renderCalendar();

      }
    );

}


function deleteBill(id) {

  data.bills =
    data.bills.filter(
      bill =>
        bill.id !== id
    );

  saveData();

  render();

  renderBills();

  renderCalendar();

}


/* =========================================================
   CREDITS
   ========================================================= */

function renderCredits() {

  const container =
    getElement("creditList");

  if (!container) return;


  const totalMonthly =
    creditMonthlyTotal();

  const totalDebt =
    creditDebtTotal();


  const totalElement =
    getElement("creditTotal");

  const debtElement =
    getElement("debtTotal");


  if (totalElement) {

    totalElement.textContent =
      money(totalMonthly);

  }


  if (debtElement) {

    debtElement.textContent =
      money(totalDebt);

  }


  if (data.credits.length === 0) {

    container.innerHTML = `
      <div class="panel">
        <b>Aucun crédit</b>
        <p class="muted">
          Tu pourras ajouter un crédit ici.
        </p>
        <button
          class="primary"
          id="addCreditButton"
        >
          ＋ Ajouter un crédit
        </button>
      </div>
    `;

    getElement("addCreditButton")
      ?.addEventListener(
        "click",
        openCreditModal
      );

    return;

  }


  container.innerHTML =
    data.credits.map(
      credit => `

        <div class="panel">

          <div class="summary">

            <div>

              <strong>
                ${escapeHTML(credit.name)}
              </strong>

              <small>
                ${credit.remaining}
                mensualités restantes
              </small>

            </div>


            <div>

              <strong>
                ${money(credit.monthly)}/mois
              </strong>

              <small>
                ${money(
                  credit.monthly *
                  credit.remaining
                )}
                restant
              </small>

            </div>

          </div>


          <button
            class="danger credit-delete"
            data-id="${escapeHTML(credit.id)}"
          >
            Supprimer
          </button>

        </div>

      `
    ).join("");


  container
    .querySelectorAll(".credit-delete")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteCredit(
            button.dataset.id
          );

        }
      );

    });


  const add =
    document.createElement("button");

  add.className =
    "primary";

  add.textContent =
    "＋ Ajouter un crédit";

  add.addEventListener(
    "click",
    openCreditModal
  );

  container.appendChild(add);

}


function openCreditModal() {

  const modal =
    getElement("modal");

  const content =
    getElement("modalContent");

  if (!modal || !content) return;


  content.innerHTML = `

    <label>
      Nom du crédit

      <input
        id="creditName"
        type="text"
        placeholder="Ex. Téléphone"
      >
    </label>


    <label>
      Mensualité (€)

      <input
        id="creditMonthly"
        type="number"
        step="0.01"
        inputmode="decimal"
      >
    </label>


    <label>
      Mensualités restantes

      <input
        id="creditRemaining"
        type="number"
        min="1"
        value="12"
      >
    </label>


    <button
      class="primary"
      id="confirmCredit"
    >
      Ajouter le crédit
    </button>

  `;


  modal.classList.remove("hidden");


  getElement("confirmCredit")
    ?.addEventListener(
      "click",
      () => {

        const name =
          getElement("creditName").value.trim();

        const monthly =
          numberValue(
            getElement("creditMonthly").value
          );

        const remaining =
          Math.max(
            1,
            Number(
              getElement("creditRemaining").value
            ) || 1
          );


        if (!name || monthly <= 0) return;


        data.credits.push({

          id:
            "credit_" + Date.now(),

          name,

          monthly,

          remaining,

          original:
            monthly * remaining

        });


        saveData();

        closeModal();

        render();

        renderCredits();

        renderCalendar();

        renderEvolution();

      }
    );

}


function deleteCredit(id) {

  data.credits =
    data.credits.filter(
      credit =>
        credit.id !== id
    );

  saveData();

  render();

  renderCredits();

  renderCalendar();

  renderEvolution();

}


/* =========================================================
   CALENDRIER
   ========================================================= */

function renderCalendar() {

  const container =
    getElement("calendarView");

  if (!container) return;


  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    now.getMonth();

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  const offset =
    firstDay === 0
      ? 6
      : firstDay - 1;


  const monthName =
    now.toLocaleDateString(
      "fr-FR",
      {
        month: "long",
        year: "numeric"
      }
    );


  let html = `

    <div class="calendar">

      <h3>
        📅 ${escapeHTML(
          monthName.charAt(0).toUpperCase() +
          monthName.slice(1)
        )}
      </h3>

      <div class="calendar-grid">

        <div>Lun</div>
        <div>Mar</div>
        <div>Mer</div>
        <div>Jeu</div>
        <div>Ven</div>
        <div>Sam</div>
        <div>Dim</div>

  `;


  for (
    let i = 0;
    i < offset;
    i++
  ) {

    html += `
      <div class="calendar-empty"></div>
    `;

  }


  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {

    const date =
      new Date(
        year,
        month,
        day
      );


    const iso =
      `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;


    const expenses =
      data.expenses.filter(
        item =>
          item.date === iso
      );


    const incomes =
      data.incomes.filter(
        item =>
          item.date === iso
      );


    const bills =
      data.bills.filter(
        item =>
          Number(item.day) === day &&
          item.active
      );


    const today =
      date.toDateString() ===
      new Date().toDateString();


    html += `

      <div
        class="calendar-day ${
          today ? "today" : ""
        }"
      >

        <strong>
          ${day}
        </strong>

        ${
          incomes.length
            ? `<span class="calendar-income">
                +${money(
                  incomes.reduce(
                    (s,i) =>
                      s + numberValue(i.amount),
                    0
                  )
                )}
              </span>`
            : ""
        }

        ${
          expenses.length
            ? `<span class="calendar-expense">
                -${money(
                  expenses.reduce(
                    (s,e) =>
                      s + numberValue(e.amount),
                    0
                  )
                )}
              </span>`
            : ""
        }

        ${
          bills.length
            ? `<span class="calendar-bill">
                -${money(
                  bills.reduce(
                    (s,b) =>
                      s + numberValue(b.amount),
                    0
                  )
                )}
              </span>`
            : ""
        }

      </div>

    `;

  }


  html += `

      </div>

    </div>

    <div class="panel">

      <b>
        📌 Légende
      </b>

      <p class="muted">
        🟢 Revenus &nbsp;
        🔴 Dépenses &nbsp;
        🟠 Prélèvements
      </p>

    </div>

  `;


  container.innerHTML =
    html;

}


/* =========================================================
   FIN DU BLOC 3
   ========================================================= */
/* =========================================================
   FINANCE QUEST — V2
   BLOC 4/4 — EPARGNE, REVENUS, SIMULATION, EVOLUTION
   ========================================================= */


/* =========================================================
   EPARGNE
   ========================================================= */

function renderSavings() {

  const big =
    getElement("savingBig");

  const list =
    getElement("goalList");


  if (big) {

    big.textContent =
      money(data.savings);

  }


  if (!list) return;


  const percent =
    data.savingsGoal > 0
      ? Math.min(
          100,
          (data.savings /
            data.savingsGoal) * 100
        )
      : 0;


  list.innerHTML = `

    <div class="panel">

      <b>
        🎯 Objectif d'épargne
      </b>

      <div class="bar">
        <i style="width:${percent}%"></i>
      </div>

      <p>
        <strong>
          ${money(data.savings)}
        </strong>

        /
        
        ${money(data.savingsGoal)}
      </p>

      <button
        class="primary"
        id="savingAction"
      >
        ＋ Modifier mon épargne
      </button>

    </div>

  `;


  getElement("savingAction")
    ?.addEventListener(
      "click",
      openSavingModal
    );

}


function openSavingModal() {

  const modal =
    getElement("modal");

  const content =
    getElement("modalContent");

  if (!modal || !content) return;


  content.innerHTML = `

    <label>
      Épargne actuelle (€)

      <input
        id="savingAmount"
        type="number"
        step="0.01"
        inputmode="decimal"
        value="${data.savings}"
      >
    </label>


    <label>
      Objectif (€)

      <input
        id="savingGoal"
        type="number"
        step="0.01"
        inputmode="decimal"
        value="${data.savingsGoal}"
      >
    </label>


    <button
      class="primary"
      id="confirmSaving"
    >
      Enregistrer
    </button>

  `;


  modal.classList.remove("hidden");


  getElement("confirmSaving")
    ?.addEventListener(
      "click",
      () => {

        data.savings =
          Math.max(
            0,
            numberValue(
              getElement(
                "savingAmount"
              ).value
            )
          );


        data.savingsGoal =
          Math.max(
            1,
            numberValue(
              getElement(
                "savingGoal"
              ).value
            )
          );


        saveData();

        closeModal();

        render();

        renderSavings();

        renderEvolution();

      }
    );

}


/* =========================================================
   REVENUS PONCTUELS
   ========================================================= */

function addIncome(
  label,
  amount,
  date = todayISO()
) {

  const value =
    numberValue(amount);


  if (
    !label ||
    value <= 0
  ) {

    return false;

  }


  data.incomes.push({

    id:
      "income_" + Date.now(),

    label:
      label.trim(),

    amount:
      value,

    date,

    received: true

  });


  data.balance +=
    value;


  addXP(10);

  saveData();

  render();

  renderCalendar();

  return true;

}


function openIncomeModal() {

  const modal =
    getElement("modal");

  const content =
    getElement("modalContent");

  if (!modal || !content) return;


  content.innerHTML = `

    <label>
      Origine du revenu

      <input
        id="incomeLabel"
        type="text"
        placeholder="Ex. Vente Leboncoin"
      >
    </label>


    <label>
      Montant (€)

      <input
        id="incomeAmount"
        type="number"
        step="0.01"
        inputmode="decimal"
        placeholder="0,00"
      >
    </label>


    <label>
      Date

      <input
        id="incomeDate"
        type="date"
        value="${todayISO()}"
      >
    </label>


    <button
      class="primary"
      id="confirmIncome"
    >
      ＋ Ajouter le revenu
    </button>

  `;


  modal.classList.remove("hidden");


  getElement("confirmIncome")
    ?.addEventListener(
      "click",
      () => {

        const label =
          getElement(
            "incomeLabel"
          ).value.trim();

        const amount =
          getElement(
            "incomeAmount"
          ).value;

        const date =
          getElement(
            "incomeDate"
          ).value ||
          todayISO();


        if (
          addIncome(
            label,
            amount,
            date
          )
        ) {

          closeModal();

        }

      }
    );

}


/* =========================================================
   SIMULATION FINANCIERE
   ========================================================= */

function openSimulationModal() {

  const modal =
    getElement("modal");

  const content =
    getElement("modalContent");

  if (!modal || !content) return;


  const currentForecast =
    getMonthEndForecast();


  content.innerHTML = `

    <h3>
      🔮 Simulation
    </h3>


    <p class="muted">
      Teste une modification sans
      changer tes vraies données.
    </p>


    <label>
      Revenu supplémentaire (€)

      <input
        id="simIncome"
        type="number"
        step="0.01"
        inputmode="decimal"
        value="0"
      >
    </label>


    <label>
      Nouvelle dépense mensuelle (€)

      <input
        id="simExpense"
        type="number"
        step="0.01"
        inputmode="decimal"
        value="0"
      >
    </label>


    <label>
      Nouveau crédit — mensualité (€)

      <input
        id="simCredit"
        type="number"
        step="0.01"
        inputmode="decimal"
        value="0"
      >
    </label>


    <label>
      Durée du nouveau crédit

      <input
        id="simMonths"
        type="number"
        min="1"
        value="12"
      >
    </label>


    <div class="panel">

      <b>
        Prévision actuelle
      </b>

      <strong>
        ${money(currentForecast)}
      </strong>

    </div>


    <div
      id="simulationResult"
      class="panel"
    >
      Entre tes chiffres pour simuler.
    </div>


    <button
      class="primary"
      id="calculateSimulation"
    >
      Calculer
    </button>

  `;


  modal.classList.remove("hidden");


  getElement("calculateSimulation")
    ?.addEventListener(
      "click",
      calculateSimulation
    );

}


function calculateSimulation() {

  const income =
    numberValue(
      getElement(
        "simIncome"
      ).value
    );


  const expense =
    numberValue(
      getElement(
        "simExpense"
      ).value
    );


  const credit =
    numberValue(
      getElement(
        "simCredit"
      ).value
    );


  const months =
    Math.max(
      1,
      Number(
        getElement(
          "simMonths"
        ).value
      ) || 1
    );


  const current =
    getMonthEndForecast();


  const newForecast =
    current +
    income -
    expense -
    credit;


  const currentCredits =
    creditMonthlyTotal();


  const newCredits =
    currentCredits +
    credit;


  const difference =
    newForecast - current;


  const result =
    getElement(
      "simulationResult"
    );


  if (!result) return;


  result.innerHTML = `

    <b>
      Résultat de la simulation
    </b>

    <p>
      Prévision actuelle :
      <strong>
        ${money(current)}
      </strong>
    </p>

    <p>
      Nouvelle prévision :
      <strong>
        ${money(newForecast)}
      </strong>
    </p>

    <p>
      Impact :
      <strong>
        ${difference >= 0 ? "+" : ""}
        ${money(difference)}
      </strong>
    </p>

    ${
      credit > 0
        ? `
          <p>
            💳 Charge de crédits :
            <strong>
              ${money(newCredits)}/mois
            </strong>
          </p>

          <p>
            ⏳ Nouveau crédit :
            ${months} mensualités
          </p>
        `
        : ""
    }

  `;

}


/* =========================================================
   EVOLUTION / LIBERTE FINANCIERE
   ========================================================= */

function renderEvolution() {

  const container =
    getElement(
      "evolutionView"
    );

  if (!container) return;


  const monthlyCredits =
    creditMonthlyTotal();


  const debt =
    creditDebtTotal();


  const savings =
    numberValue(
      data.savings
    );


  const freedom =
    savings -
    debt;


  const creditPercent =
    debt > 0
      ? Math.min(
          100,
          debt / 100
        )
      : 0;


  container.innerHTML = `

    <div class="panel">

      <b>
        🔴 Crédits
      </b>

      <h3>
        ${money(debt)}
      </h3>

      <p class="muted">
        Charge mensuelle :
        ${money(monthlyCredits)}
      </p>

      <div class="bar">
        <i
          style="
            width:${creditPercent}%;
          "
        ></i>
      </div>

    </div>


    <div class="panel">

      <b>
        🟢 Épargne
      </b>

      <h3>
        ${money(savings)}
      </h3>

      <p class="muted">
        Objectif :
        ${money(data.savingsGoal)}
      </p>

    </div>


    <div class="panel">

      <b>
        🔵 Liberté financière
      </b>

      <h3>
        ${money(freedom)}
      </h3>

      <p class="muted">
        Épargne − dette restante
      </p>

    </div>


    <div class="panel">

      <b>
        📉 Prochaines fins de crédits
      </b>

      ${
        data.credits.length
          ? data.credits
              .slice()
              .sort(
                (a,b) =>
                  a.remaining -
                  b.remaining
              )
              .slice(0,3)
              .map(
                credit => `
                  <p>
                    ${escapeHTML(
                      credit.name
                    )}
                    :
                    <strong>
                      ${credit.remaining}
                      mois
                    </strong>
                  </p>
                `
              )
              .join("")
          : `
              <p class="muted">
                Aucun crédit en cours.
              </p>
            `
      }

    </div>

  `;

}


/* =========================================================
   PARAMETRES
   ========================================================= */

function openSettings() {

  const modal =
    getElement("modal");

  const content =
    getElement("modalContent");

  if (!modal || !content) return;


  content.innerHTML = `

    <h3>
      ⚙️ Paramètres
    </h3>


    <label>
      Solde actuel (€)

      <input
        id="settingBalance"
        type="number"
        step="0.01"
        value="${data.balance}"
      >
    </label>


    <label>
      Salaire Europcar (€)

      <input
        id="settingSalary1"
        type="number"
        step="0.01"
        value="${data.settings.salaryEuropcar}"
      >
    </label>


    <label>
      Salaire Domino's (€)

      <input
        id="settingSalary2"
        type="number"
        step="0.01"
        value="${data.settings.salaryDominos}"
      >
    </label>


    <label>
      Objectif épargne (€)

      <input
        id="settingGoal"
        type="number"
        step="0.01"
        value="${data.savingsGoal}"
      >
    </label>


    <button
      class="primary"
      id="saveSettings"
    >
      Enregistrer les paramètres
    </button>


    <button
      class="primary"
      id="addIncomeSettings"
    >
      💶 Ajouter un revenu ponctuel
    </button>

  `;


  modal.classList.remove(
    "hidden"
  );


  getElement("saveSettings")
    ?.addEventListener(
      "click",
      () => {

        data.balance =
          numberValue(
            getElement(
              "settingBalance"
            ).value
          );


        data.settings.salaryEuropcar =
          numberValue(
            getElement(
              "settingSalary1"
            ).value
          );


        data.settings.salaryDominos =
          numberValue(
            getElement(
              "settingSalary2"
            ).value
          );


        data.savingsGoal =
          Math.max(
            1,
            numberValue(
              getElement(
                "settingGoal"
              ).value
            )
          );


        saveData();

        closeModal();

        render();

        renderSavings();

      }
    );


  getElement("addIncomeSettings")
    ?.addEventListener(
      "click",
      openIncomeModal
    );

}


/* =========================================================
   INITIALISATION
   ========================================================= */

function setupSettings() {

  getElement("settings")
    ?.addEventListener(
      "click",
      openSettings
    );


  getElement("add")
    ?.addEventListener(
      "click",
      openExpenseModal
    );


  getElement("close")
    ?.addEventListener(
      "click",
      closeModal
    );


  getElement("modal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target.id === "modal"
        ) {

          closeModal();

        }

      }
    );


  getElement(
    "simulationButton"
  )?.addEventListener(
    "click",
    openSimulationModal
  );


  getElement(
    "calendarSimulationButton"
  )?.addEventListener(
    "click",
    openSimulationModal
  );


  getElement(
    "evolutionSimulationButton"
  )?.addEventListener(
    "click",
    openSimulationModal
  );

}


function render() {

  updateLevel();

  renderHome();

}


/* =========================================================
   DEMARRAGE
   ========================================================= */

function init() {

  setupNavigation();

  setupSettings();

  render();

  renderExpenses();

  renderBills();

  renderCredits();

  renderSavings();

  renderCalendar();

  renderEvolution();

}


/* =========================================================
   LANCEMENT
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

} else {

  init();

}


/* =========================================================
   FINANCE QUEST V2 — FIN DU FICHIER
   ========================================================= */
