/* =========================================================
   FINANCE QUEST — VERSION STABLE
   BLOC 1/4 — DONNEES, SAUVEGARDE ET CALCULS
   ========================================================= */

"use strict";


/* =========================================================
   DONNEES PAR DEFAUT
   ========================================================= */

const DEFAULT_DATA = {

  balance: 74,

  savings: 0,

  savingsGoal: 500,

  deferred: 0,

  expenses: [],

  bills: [],

  incomes: [],

  credits: [

    {
      id: "voiture",
      name: "Voiture",
      monthly: 420.23,
      remaining: 16
    },

    {
      id: "tv",
      name: "TV",
      monthly: 55,
      remaining: 35
    },

    {
      id: "regroupement",
      name: "Regroupement",
      monthly: 50,
      remaining: 23
    },

    {
      id: "apple",
      name: "Apple",
      monthly: 61.63,
      remaining: 14
    },

    {
      id: "etudes",
      name: "Études",
      monthly: 66.10,
      remaining: 11
    },

    {
      id: "tablette",
      name: "Tablette",
      monthly: 17,
      remaining: 12
    },

    {
      id: "amazon",
      name: "Amazon Noël",
      monthly: 21.76,
      remaining: 2
    },

    {
      id: "manette",
      name: "Manette",
      monthly: 23.92,
      remaining: 3
    }

  ],

  xp: 0,

  level: 1,

  badge: "🥉 Débutant",

  settings: {

    salaryEuropcar: 1500,

    salaryDominos: 330,

    mealTickets: 200,

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
   STOCKAGE
   ========================================================= */

const STORAGE_KEY =
  "financeQuestStableV1";


function cloneDefaultData() {

  return JSON.parse(
    JSON.stringify(DEFAULT_DATA)
  );

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


  result.incomes =
    Array.isArray(saved.incomes)
      ? saved.incomes
      : [];


  result.credits =
    Array.isArray(saved.credits)
      ? saved.credits
      : base.credits;


  return result;

}


function loadData() {

  try {

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (!saved) {

      return cloneDefaultData();

    }


    return mergeData(

      cloneDefaultData(),

      JSON.parse(saved)

    );

  }

  catch (error) {

    console.error(
      "Erreur de chargement :",
      error
    );

    return cloneDefaultData();

  }

}


let data =
  loadData();


function saveData() {

  try {

    localStorage.setItem(

      STORAGE_KEY,

      JSON.stringify(data)

    );

  }

  catch (error) {

    console.error(
      "Erreur de sauvegarde :",
      error
    );

  }

}


/* =========================================================
   OUTILS GENERAUX
   ========================================================= */

function getElement(id) {

  return document.getElementById(id);

}


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
        .replace(
          /[^\d.-]/g,
          ""
        );

  }


  return Number(value) || 0;

}


function todayISO() {

  const date =
    new Date();


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


  return (
    year +
    "-" +
    month +
    "-" +
    day
  );

}


function monthKey(value) {

  const date =
    value instanceof Date
      ? value
      : new Date(value);


  return (

    date.getFullYear() +

    "-" +

    String(
      date.getMonth() + 1
    ).padStart(2, "0")

  );

}


function escapeHTML(value) {

  return String(
    value ?? ""
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   CALCULS DES CREDITS
   ========================================================= */

function creditMonthlyTotal() {

  return data.credits.reduce(

    (total, credit) =>

      total +
      numberValue(
        credit.monthly
      ),

    0

  );

}


function creditDebtTotal() {

  return data.credits.reduce(

    (total, credit) =>

      total +

      (
        numberValue(
          credit.monthly
        ) *

        numberValue(
          credit.remaining
        )
      ),

    0

  );

}


/* =========================================================
   DEPENSES
   ========================================================= */

function expensesTotal() {

  return data.expenses.reduce(

    (total, expense) =>

      total +
      numberValue(
        expense.amount
      ),

    0

  );

}


function currentMonthExpenses() {

  const current =
    monthKey(
      new Date()
    );


  return data.expenses

    .filter(

      expense =>

        monthKey(
          expense.date
        ) === current

    )

    .reduce(

      (total, expense) =>

        total +
        numberValue(
          expense.amount
        ),

      0

    );

}


/* =========================================================
   REVENUS
   ========================================================= */

function incomesTotal() {

  return data.incomes.reduce(

    (total, income) =>

      total +
      numberValue(
        income.amount
      ),

    0

  );

}


function currentMonthIncome() {

  const current =
    monthKey(
      new Date()
    );


  return data.incomes

    .filter(

      income =>

        monthKey(
          income.date
        ) === current

    )

    .reduce(

      (total, income) =>

        total +
        numberValue(
          income.amount
        ),

      0

    );

}


/* =========================================================
   PRELEVEMENTS
   ========================================================= */

function billsTotal() {

  return data.bills.reduce(

    (total, bill) =>

      total +
      numberValue(
        bill.amount
      ),

    0

  );

}


/* =========================================================
   PREVISION DE FIN DE MOIS
   ========================================================= */

function getMonthEndForecast() {

  let forecast =
    numberValue(
      data.balance
    );


  const salaries =

    numberValue(
      data.settings.salaryEuropcar
    )

    +

    numberValue(
      data.settings.salaryDominos
    );


  const received =
    currentMonthIncome();


  const remainingSalary =
    Math.max(

      0,

      salaries - received

    );


  forecast +=
    remainingSalary;


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
    Math.floor(
      xp / 100
    ) + 1;


  if (xp >= 1000) {

    data.badge =
      "👑 Maître financier";

  }

  else if (xp >= 600) {

    data.badge =
      "💎 Stratège";

  }

  else if (xp >= 300) {

    data.badge =
      "🥇 Épargnant";

  }

  else if (xp >= 100) {

    data.badge =
      "🥈 Gestionnaire";

  }

  else {

    data.badge =
      "🥉 Débutant";

  }

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
   EXPORT POUR LES AUTRES BLOCS
   ========================================================= */

window.FinanceQuest = {

  getData:
    () => data,

  saveData,

  money,

  numberValue,

  todayISO,

  escapeHTML,

  creditMonthlyTotal,

  creditDebtTotal,

  getMonthEndForecast,

  addXP

};


/* =========================================================
   FIN DU BLOC 1/4
   ========================================================= */
/* =========================================================
   FINANCE QUEST — VERSION STABLE
   BLOC 2/4 — ACCUEIL, NAVIGATION ET DEPENSES
   ========================================================= */


/* =========================================================
   NAVIGATION
   ========================================================= */

function showScreen(screenId) {

  document
    .querySelectorAll(".screen")
    .forEach(screen => {

      screen.classList.remove(
        "active"
      );

    });


  const screen =
    getElement(screenId);


  if (screen) {

    screen.classList.add(
      "active"
    );

  }


  document
    .querySelectorAll(
      "nav button[data-s]"
    )
    .forEach(button => {

      button.classList.toggle(

        "active",

        button.dataset.s ===
        screenId

      );

    });


  if (
    screenId ===
    "home"
  ) {

    renderHome();

  }


  if (
    screenId ===
    "expensesScreen"
  ) {

    renderExpenses();

  }


  if (
    screenId ===
    "calendarScreen"
  ) {

    renderCalendar();

  }


  if (
    screenId ===
    "billsScreen"
  ) {

    renderBills();

  }


  if (
    screenId ===
    "creditsScreen"
  ) {

    renderCredits();

  }


  if (
    screenId ===
    "savingScreen"
  ) {

    renderSavings();

  }


  if (
    screenId ===
    "evolutionScreen"
  ) {

    renderEvolution();

  }

}


/* =========================================================
   INITIALISATION DE LA NAVIGATION
   ========================================================= */

function setupNavigation() {

  document
    .querySelectorAll(
      "nav button[data-s]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showScreen(
            button.dataset.s
          );

        }
      );

    });

}


/* =========================================================
   ACCUEIL
   ========================================================= */

function renderHome() {

  updateLevel();


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
      money(
        data.balance
      );

  }


  if (forecast) {

    forecast.textContent =
      money(
        getMonthEndForecast()
      );

  }


  if (deferred) {

    deferred.textContent =
      money(
        data.deferred
      );

  }


  if (incomeDue) {

    const due =
      data.incomes
        .filter(
          item =>
            !item.received
        )
        .reduce(
          (sum, item) =>
            sum +
            numberValue(
              item.amount
            ),
          0
        );


    incomeDue.textContent =
      money(due);

  }


  if (billsDue) {

    billsDue.textContent =
      money(
        billsTotal()
      );

  }


  if (saving) {

    saving.textContent =
      money(
        data.savings
      );

  }


  if (goal) {

    goal.textContent =
      money(
        data.savingsGoal
      );

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


  if (level) {

    level.textContent =
      data.level;

  }


  if (xp) {

    const currentXP =
      data.xp % 100;


    xp.textContent =
      currentXP +
      " / 100";

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

    const salaryTotal =

      numberValue(
        data.settings.salaryEuropcar
      )

      +

      numberValue(
        data.settings.salaryDominos
      )

      +

      currentMonthIncome();


    income.textContent =
      money(
        salaryTotal
      );

  }


  if (credits) {

    credits.textContent =
      money(
        creditMonthlyTotal()
      );

  }


  if (fuel) {

    const totalFuel =
      data.expenses

        .filter(
          item =>
            item.category ===
            "Carburant"
        )

        .reduce(
          (sum, item) =>
            sum +
            numberValue(
              item.amount
            ),
          0
        );


    fuel.textContent =
      money(totalFuel);

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


  let message;


  if (forecast < 0) {

    message =
      "🔴 Attention : la prévision de fin de mois est négative.";

  }

  else if (forecast < 100) {

    message =
      "🟠 Prudence : ta marge de sécurité est faible.";

  }

  else if (forecast < 300) {

    message =
      "🟡 Situation correcte : garde une marge de sécurité.";

  }

  else {

    message =
      "🟢 Bonne trajectoire : ta prévision reste positive.";

  }


  container.innerHTML = `

    <div class="panel">

      ${escapeHTML(message)}

    </div>

  `;

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


  let html = `

    <button
      class="primary"
      id="expenseAddButton"
    >
      ＋ Ajouter une dépense
    </button>

  `;


  if (
    data.expenses.length === 0
  ) {

    html += `

      <div class="panel">

        <b>
          Aucune dépense enregistrée
        </b>

        <p class="muted">

          Ajoute une dépense pour
          commencer ton suivi.

        </p>

      </div>

    `;


    container.innerHTML =
      html;


    getElement(
      "expenseAddButton"
    )?.addEventListener(
      "click",
      openExpenseModal
    );


    return;

  }


  const sorted =
    [...data.expenses]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      );


  html +=

    sorted
      .map(
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

                <small>

                  ${escapeHTML(
                    expense.date
                  )}

                </small>

              </div>


              <div>

                <strong>

                  -${money(
                    expense.amount
                  )}

                </strong>

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


  container.innerHTML =
    html;


  getElement(
    "expenseAddButton"
  )?.addEventListener(
    "click",
    openExpenseModal
  );


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


/* =========================================================
   AJOUT DEPENSE
   ========================================================= */

function addExpense(
  label,
  amount,
  category,
  date
) {

  const value =
    numberValue(
      amount
    );


  if (
    !label ||
    value <= 0
  ) {

    alert(
      "Indique un libellé et un montant valide."
    );

    return false;

  }


  data.expenses.push({

    id:
      "expense_" +
      Date.now(),

    label:
      label.trim(),

    amount:
      value,

    category:
      category ||
      "Divers",

    date:
      date ||
      todayISO()

  });


  data.balance -=
    value;


  addXP(10);

  saveData();

  renderHome();

  renderExpenses();

  renderCalendar();

  return true;

}


/* =========================================================
   SUPPRESSION DEPENSE
   ========================================================= */

function deleteExpense(id) {

  const index =
    data.expenses.findIndex(
      expense =>
        expense.id === id
    );


  if (
    index === -1
  ) {

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

  renderHome();

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


  if (
    !modal ||
    !content
  ) {

    return;

  }


  content.innerHTML = `

    <div class="modalhead">

      <h3>
        Ajouter une dépense
      </h3>

      <button
        id="dynamicClose"
      >
        ✕
      </button>

    </div>


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


  getElement(
    "dynamicClose"
  )?.addEventListener(
    "click",
    closeModal
  );


  getElement(
    "confirmExpense"
  )?.addEventListener(
    "click",
    () => {

      const success =
        addExpense(

          getElement(
            "expenseLabel"
          ).value,

          getElement(
            "expenseAmount"
          ).value,

          getElement(
            "expenseCategory"
          ).value,

          getElement(
            "expenseDate"
          ).value

        );


      if (success) {

        closeModal();

      }

    }
  );

}


/* =========================================================
   FIN DU BLOC 2/4
   ========================================================= */
/* =========================================================
   FINANCE QUEST — VERSION STABLE
   BLOC 3/4 — PRELEVEMENTS, CREDITS ET CALENDRIER
   ========================================================= */


/* =========================================================
   FERMETURE MODALE
   ========================================================= */

function closeModal() {

  const modal =
    getElement("modal");

  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   PRELEVEMENTS
   ========================================================= */

function renderBills() {

  const container =
    getElement("billList");


  if (!container) {

    return;

  }


  let html = `

    <button
      class="primary"
      id="billAddButton"
    >
      ＋ Ajouter un prélèvement
    </button>

  `;


  if (
    data.bills.length === 0
  ) {

    html += `

      <div class="panel">

        <b>
          Aucun prélèvement
        </b>

        <p class="muted">

          Ajoute ici ton loyer,
          assurance, abonnements,
          etc.

        </p>

      </div>

    `;


    container.innerHTML =
      html;


    getElement(
      "billAddButton"
    )?.addEventListener(
      "click",
      openBillModal
    );


    return;

  }


  html +=

    data.bills
      .map(
        bill => `

          <div class="panel">

            <div class="summary">

              <div>

                <strong>

                  ${escapeHTML(
                    bill.name
                  )}

                </strong>

                <small>

                  Tous les mois
                  · jour ${bill.day}

                </small>

              </div>


              <div>

                <strong>

                  -${money(
                    bill.amount
                  )}

                </strong>

                <small>

                  ${
                    bill.active
                      ? "Actif"
                      : "Désactivé"
                  }

                </small>

              </div>

            </div>


            <button
              class="danger bill-delete"
              data-id="${escapeHTML(
                bill.id
              )}"
            >
              Supprimer
            </button>

          </div>

        `
      )
      .join("");


  container.innerHTML =
    html;


  getElement(
    "billAddButton"
  )?.addEventListener(
    "click",
    openBillModal
  );


  container
    .querySelectorAll(
      ".bill-delete"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteBill(
            button.dataset.id
          );

        }
      );

    });

}


/* =========================================================
   AJOUT PRELEVEMENT
   ========================================================= */

function openBillModal() {

  const modal =
    getElement("modal");


  const content =
    getElement(
      "modalContent"
    );


  if (
    !modal ||
    !content
  ) {

    return;

  }


  content.innerHTML = `

    <div class="modalhead">

      <h3>
        Ajouter un prélèvement
      </h3>

      <button
        id="dynamicClose"
      >
        ✕
      </button>

    </div>


    <label>

      Nom

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
        placeholder="250"
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


  modal.classList.remove(
    "hidden"
  );


  getElement(
    "dynamicClose"
  )?.addEventListener(
    "click",
    closeModal
  );


  getElement(
    "confirmBill"
  )?.addEventListener(
    "click",
    () => {

      const name =
        getElement(
          "billName"
        ).value.trim();


      const amount =
        numberValue(
          getElement(
            "billAmount"
          ).value
        );


      const day =
        Math.min(
          31,
          Math.max(
            1,
            Number(
              getElement(
                "billDay"
              ).value
            ) || 1
          )
        );


      if (
        !name ||
        amount <= 0
      ) {

        alert(
          "Indique un nom et un montant valide."
        );

        return;

      }


      data.bills.push({

        id:
          "bill_" +
          Date.now(),

        name,

        amount,

        day,

        active:
          true

      });


      saveData();

      closeModal();

      renderHome();

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

  renderHome();

  renderBills();

  renderCalendar();

}


/* =========================================================
   CREDITS
   ========================================================= */

function renderCredits() {

  const container =
    getElement(
      "creditList"
    );


  if (!container) {

    return;

  }


  const monthly =
    creditMonthlyTotal();


  const debt =
    creditDebtTotal();


  const totalElement =
    getElement(
      "creditTotal"
    );


  const debtElement =
    getElement(
      "debtTotal"
    );


  if (totalElement) {

    totalElement.textContent =
      money(monthly);

  }


  if (debtElement) {

    debtElement.textContent =
      money(debt);

  }


  let html = "";


  if (
    data.credits.length === 0
  ) {

    html = `

      <div class="panel">

        <b>
          Aucun crédit en cours
        </b>

      </div>

    `;

  }

  else {

    html =
      data.credits
        .map(
          credit => `

            <div class="panel">

              <div class="summary">

                <div>

                  <strong>

                    ${escapeHTML(
                      credit.name
                    )}

                  </strong>

                  <small>

                    ${
                      credit.remaining
                    }
                    mensualités restantes

                  </small>

                </div>


                <div>

                  <strong>

                    ${money(
                      credit.monthly
                    )}
                    /mois

                  </strong>

                  <small>

                    Reste environ
                    ${money(
                      credit.monthly *
                      credit.remaining
                    )}

                  </small>

                </div>

              </div>


              <button
                class="danger credit-delete"
                data-id="${escapeHTML(
                  credit.id
                )}"
              >

                Supprimer

              </button>

            </div>

          `
        )
        .join("");

  }


  html += `

    <button
      class="primary"
      id="creditAddButton"
    >

      ＋ Ajouter un crédit

    </button>

  `;


  container.innerHTML =
    html;


  getElement(
    "creditAddButton"
  )?.addEventListener(
    "click",
    openCreditModal
  );


  container
    .querySelectorAll(
      ".credit-delete"
    )
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

}


/* =========================================================
   AJOUT CREDIT
   ========================================================= */

function openCreditModal() {

  const modal =
    getElement("modal");


  const content =
    getElement(
      "modalContent"
    );


  if (
    !modal ||
    !content
  ) {

    return;

  }


  content.innerHTML = `

    <div class="modalhead">

      <h3>
        Ajouter un crédit
      </h3>

      <button
        id="dynamicClose"
      >
        ✕
      </button>

    </div>


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
        placeholder="50"
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


    <label>

      Jour du prélèvement

      <input
        id="creditDay"
        type="number"
        min="1"
        max="31"
        value="5"
      >

    </label>


    <button
      class="primary"
      id="confirmCredit"
    >

      Ajouter le crédit

    </button>

  `;


  modal.classList.remove(
    "hidden"
  );


  getElement(
    "dynamicClose"
  )?.addEventListener(
    "click",
    closeModal
  );


  getElement(
    "confirmCredit"
  )?.addEventListener(
    "click",
    () => {

      const name =
        getElement(
          "creditName"
        ).value.trim();


      const monthly =
        numberValue(
          getElement(
            "creditMonthly"
          ).value
        );


      const remaining =
        Math.max(
          1,
          Number(
            getElement(
              "creditRemaining"
            ).value
          ) || 1
        );


      const day =
        Math.min(
          31,
          Math.max(
            1,
            Number(
              getElement(
                "creditDay"
              ).value
            ) || 5
          )
        );


      if (
        !name ||
        monthly <= 0
      ) {

        alert(
          "Indique le nom et la mensualité du crédit."
        );

        return;

      }


      data.credits.push({

        id:
          "credit_" +
          Date.now(),

        name,

        monthly,

        remaining,

        day

      });


      saveData();

      closeModal();

      renderHome();

      renderCredits();

      renderCalendar();

      renderEvolution();

    }
  );

}


function deleteCredit(id) {

  const index =
    data.credits.findIndex(
      credit =>
        credit.id === id
    );


  if (
    index === -1
  ) {

    return;

  }


  const credit =
    data.credits[index];


  data.credits.splice(
    index,
    1
  );


  saveData();

  renderHome();

  renderCredits();

  renderCalendar();

  renderEvolution();

}


/* =========================================================
   CALENDRIER
   ========================================================= */

function renderCalendar() {

  const container =
    getElement(
      "calendarView"
    );


  if (!container) {

    return;

  }


  const date =
    new Date();


  const year =
    date.getFullYear();


  const month =
    date.getMonth();


  const first =
    new Date(
      year,
      month,
      1
    );


  const last =
    new Date(
      year,
      month + 1,
      0
    );


  let start =
    first.getDay();


  start =
    start === 0
      ? 6
      : start - 1;


  const days =
    last.getDate();


  const monthName =
    date.toLocaleDateString(
      "fr-FR",
      {
        month: "long",
        year: "numeric"
      }
    );


  let html = `

    <div class="panel">

      <h3>

        📅 ${
          monthName
            .charAt(0)
            .toUpperCase()
          +
          monthName.slice(1)
        }

      </h3>


      <div
        class="calendar-grid"
      >

        <div>
          Lun
        </div>

        <div>
          Mar
        </div>

        <div>
          Mer
        </div>

        <div>
          Jeu
        </div>

        <div>
          Ven
        </div>

        <div>
          Sam
        </div>

        <div>
          Dim
        </div>

  `;


  for (
    let i = 0;
    i < start;
    i++
  ) {

    html += `

      <div></div>

    `;

  }


  for (
    let day = 1;
    day <= days;
    day++
  ) {

    const iso =
      `${year}-${String(
        month + 1
      ).padStart(
        2,
        "0"
      )}-${String(
        day
      ).padStart(
        2,
        "0"
      )}`;


    const dayExpenses =
      data.expenses
        .filter(
          expense =>
            expense.date === iso
        );


    const dayIncomes =
      data.incomes
        .filter(
          income =>
            income.date === iso
        );


    const dayBills =
      data.bills
        .filter(
          bill =>
            Number(
              bill.day
            ) === day &&
            bill.active !== false
        );


    const dayCredits =
      data.credits
        .filter(
          credit =>
            Number(
              credit.day || 5
            ) === day &&
            Number(
              credit.remaining
            ) > 0
        );


    const isToday =
      new Date()
        .getDate() === day &&
      new Date()
        .getMonth() === month &&
      new Date()
        .getFullYear() === year;


    html += `

      <div
        class="${
          isToday
            ? "calendar-day today"
            : "calendar-day"
        }"
      >

        <strong>
          ${day}
        </strong>

    `;


    if (
      dayIncomes.length
    ) {

      const total =
        dayIncomes.reduce(
          (sum, income) =>
            sum +
            numberValue(
              income.amount
            ),
          0
        );


      html += `

        <small
          class="calendar-income"
        >

          +${money(total)}

        </small>

      `;

    }


    if (
      dayExpenses.length
    ) {

      const total =
        dayExpenses.reduce(
          (sum, expense) =>
            sum +
            numberValue(
              expense.amount
            ),
          0
        );


      html += `

        <small
          class="calendar-expense"
        >

          -${money(total)}

        </small>

      `;

    }


    if (
      dayBills.length
    ) {

      const total =
        dayBills.reduce(
          (sum, bill) =>
            sum +
            numberValue(
              bill.amount
            ),
          0
        );


      html += `

        <small
          class="calendar-bill"
        >

          -${money(total)}

        </small>

      `;

    }


    if (
      dayCredits.length
    ) {

      const total =
        dayCredits.reduce(
          (sum, credit) =>
            sum +
            numberValue(
              credit.monthly
            ),
          0
        );


      html += `

        <small
          class="calendar-credit"
        >

          -${money(total)}

        </small>

      `;

    }


    html += `

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

        🟢 Revenus
        ·
        🔴 Dépenses
        ·
        🟠 Prélèvements
        ·
        💳 Crédits

      </p>

    </div>

  `;


  container.innerHTML =
    html;

}


/* =========================================================
   FIN DU BLOC 3/4
   ========================================================= */
/* =========================================================
   FINANCE QUEST — VERSION STABLE
   BLOC 4/4 — EPARGNE, REVENUS, SIMULATION, EVOLUTION,
   PARAMETRES ET DEMARRAGE
   ========================================================= */


/* =========================================================
   EPARGNE
   ========================================================= */

function renderSavings() {

  const big =
    getElement(
      "savingBig"
    );

  const list =
    getElement(
      "goalList"
    );


  if (big) {

    big.textContent =
      money(
        data.savings
      );

  }


  if (!list) {

    return;

  }


  const percent =
    data.savingsGoal > 0

      ? Math.min(
          100,
          (
            data.savings /
            data.savingsGoal
          ) * 100
        )

      : 0;


  list.innerHTML = `

    <div class="panel">

      <b>
        🎯 Objectif d'épargne
      </b>


      <div class="bar">

        <i
          style="width:${percent}%"
        ></i>

      </div>


      <p>

        <strong>
          ${money(
            data.savings
          )}
        </strong>

        /

        ${money(
          data.savingsGoal
        )}

      </p>


      <button
        class="primary"
        id="savingAction"
      >

        ＋ Modifier mon épargne

      </button>

    </div>

  `;


  getElement(
    "savingAction"
  )?.addEventListener(
    "click",
    openSavingModal
  );

}


function openSavingModal() {

  const modal =
    getElement(
      "modal"
    );


  const content =
    getElement(
      "modalContent"
    );


  if (
    !modal ||
    !content
  ) {

    return;

  }


  content.innerHTML = `

    <div class="modalhead">

      <h3>
        🎯 Épargne
      </h3>

      <button
        id="dynamicClose"
      >
        ✕
      </button>

    </div>


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


  modal.classList.remove(
    "hidden"
  );


  getElement(
    "dynamicClose"
  )?.addEventListener(
    "click",
    closeModal
  );


  getElement(
    "confirmSaving"
  )?.addEventListener(
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

      renderHome();

      renderSavings();

      renderEvolution();

    }
  );

}


/* =========================================================
   REVENUS PONCTUELS
   ========================================================= */

function openIncomeModal() {

  const modal =
    getElement(
      "modal"
    );


  const content =
    getElement(
      "modalContent"
    );


  if (
    !modal ||
    !content
  ) {

    return;

  }


  content.innerHTML = `

    <div class="modalhead">

      <h3>
        💶 Ajouter un revenu
      </h3>

      <button
        id="dynamicClose"
      >
        ✕
      </button>

    </div>


    <label>

      Origine

      <input
        id="incomeLabel"
        type="text"
        placeholder="Ex. Vente d'un objet"
      >

    </label>


    <label>

      Montant (€)

      <input
        id="incomeAmount"
        type="number"
        step="0.01"
        inputmode="decimal"
        placeholder="100"
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

      Ajouter le revenu

    </button>

  `;


  modal.classList.remove(
    "hidden"
  );


  getElement(
    "dynamicClose"
  )?.addEventListener(
    "click",
    closeModal
  );


  getElement(
    "confirmIncome"
  )?.addEventListener(
    "click",
    () => {

      const label =
        getElement(
          "incomeLabel"
        ).value.trim();


      const amount =
        numberValue(
          getElement(
            "incomeAmount"
          ).value
        );


      const date =
        getElement(
          "incomeDate"
        ).value ||
        todayISO();


      if (
        !label ||
        amount <= 0
      ) {

        alert(
          "Indique une origine et un montant valide."
        );

        return;

      }


      data.incomes.push({

        id:
          "income_" +
          Date.now(),

        label,

        amount,

        date,

        received:
          true

      });


      data.balance +=
        amount;


      addXP(10);

      saveData();

      closeModal();

      renderHome();

      renderCalendar();

    }
  );

}


/* =========================================================
   SIMULATION
   ========================================================= */

function openSimulationModal() {

  const modal =
    getElement(
      "modal"
    );


  const content =
    getElement(
      "modalContent"
    );


  if (
    !modal ||
    !content
  ) {

    return;

  }


  content.innerHTML = `

    <div class="modalhead">

      <h3>
        🔮 Simulation financière
      </h3>

      <button
        id="dynamicClose"
      >
        ✕
      </button>

    </div>


    <p class="muted">

      Teste un changement sans modifier
      tes vraies données.

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

      Durée du crédit (mois)

      <input
        id="simMonths"
        type="number"
        min="1"
        value="12"
      >

    </label>


    <div
      class="panel"
      id="simulationResult"
    >

      Entre tes chiffres puis appuie
      sur Calculer.

    </div>


    <button
      class="primary"
      id="calculateSimulation"
    >

      Calculer

    </button>

  `;


  modal.classList.remove(
    "hidden"
  );


  getElement(
    "dynamicClose"
  )?.addEventListener(
    "click",
    closeModal
  );


  getElement(
    "calculateSimulation"
  )?.addEventListener(
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


  const currentCreditLoad =
    creditMonthlyTotal();


  const newCreditLoad =
    currentCreditLoad +
    credit;


  const difference =
    newForecast -
    current;


  const result =
    getElement(
      "simulationResult"
    );


  if (!result) {

    return;

  }


  result.innerHTML = `

    <b>
      Résultat
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

        ${
          difference >= 0
            ? "+"
            : ""
        }${money(difference)}

      </strong>

    </p>


    ${
      credit > 0

        ? `

          <p>

            💳 Total des crédits :

            <strong>
              ${money(
                newCreditLoad
              )}/mois
            </strong>

          </p>


          <p>

            ⏳ Le nouveau crédit
            durerait ${months} mois.

          </p>

        `

        : ""

    }

  `;

}


/* =========================================================
   EVOLUTION FINANCIERE
   ========================================================= */

function renderEvolution() {

  const container =
    getElement(
      "evolutionView"
    );


  if (!container) {

    return;

  }


  const debt =
    creditDebtTotal();


  const monthlyCredits =
    creditMonthlyTotal();


  const savings =
    Number(
      data.savings
    ) || 0;


  const freedom =
    savings -
    debt;


  const finishedCredits =
    data.credits.filter(
      credit =>
        Number(
          credit.remaining
        ) <= 0
    ).length;


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
        ${money(
          monthlyCredits
        )}

      </p>

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
        ${money(
          data.savingsGoal
        )}

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
        🟠 Crédits terminés
      </b>

      <h3>
        ${finishedCredits}
      </h3>

      <p class="muted">

        Les crédits disparaîtront
        automatiquement lorsqu'ils
        arriveront à zéro.

      </p>

    </div>


    <div class="panel">

      <b>
        📊 Prochaines échéances
      </b>

      ${
        data.credits.length

          ? data.credits
              .slice()
              .sort(
                (a, b) =>
                  Number(
                    a.remaining
                  ) -
                  Number(
                    b.remaining
                  )
              )
              .slice(0, 4)
              .map(
                credit => `

                  <p>

                    ${escapeHTML(
                      credit.name
                    )}

                    —

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
    getElement(
      "modal"
    );


  const content =
    getElement(
      "modalContent"
    );


  if (
    !modal ||
    !content
  ) {

    return;

  }


  content.innerHTML = `

    <div class="modalhead">

      <h3>
        ⚙️ Paramètres
      </h3>

      <button
        id="dynamicClose"
      >
        ✕
      </button>

    </div>


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
        value="${
          data.settings.salaryEuropcar
        }"
      >

    </label>


    <label>

      Salaire Domino's (€)

      <input
        id="settingSalary2"
        type="number"
        step="0.01"
        value="${
          data.settings.salaryDominos
        }"
      >

    </label>


    <label>

      Objectif d'épargne (€)

      <input
        id="settingGoal"
        type="number"
        step="0.01"
        value="${
          data.savingsGoal
        }"
      >

    </label>


    <button
      class="primary"
      id="saveSettings"
    >

      Enregistrer

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


  getElement(
    "dynamicClose"
  )?.addEventListener(
    "click",
    closeModal
  );


  getElement(
    "saveSettings"
  )?.addEventListener(
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

      renderHome();

      renderSavings();

      renderEvolution();

    }
  );


  getElement(
    "addIncomeSettings"
  )?.addEventListener(
    "click",
    openIncomeModal
  );

}


/* =========================================================
   BOUTONS ET EVENEMENTS
   ========================================================= */

function setupEvents() {

  getElement(
    "settings"
  )?.addEventListener(
    "click",
    openSettings
  );


  getElement(
    "add"
  )?.addEventListener(
    "click",
    openExpenseModal
  );


  getElement(
    "close"
  )?.addEventListener(
    "click",
    closeModal
  );


  getElement(
    "modal"
  )?.addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "modal"
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


/* =========================================================
   DEMARRAGE
   ========================================================= */

function renderAll() {

  renderHome();

  renderExpenses();

  renderBills();

  renderCredits();

  renderSavings();

  renderCalendar();

  renderEvolution();

}


function initFinanceQuest() {

  setupNavigation();

  setupEvents();

  renderAll();

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
    initFinanceQuest
  );

}

else {

  initFinanceQuest();

}


/* =========================================================
   FINANCE QUEST — FIN DU BLOC 4/4
   ========================================================= */

