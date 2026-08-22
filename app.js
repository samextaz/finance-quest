// ==========================================
// FINANCE QUEST V1.3
// Gestion complète des finances personnelles
// ==========================================

const STORAGE_KEY = "financeQuestV11";

const defaultState = {
  balance: 74,
  savings: 0,
  goal: 500,
  overdraft: 100,

  salaryEuropcar: 1500,
  salaryDominos: 330,
  ticketsRestaurant: 200,
  fuelBudget: 170,

  expenses: [],

  incomes: [
    {
      name: "Europcar",
      amount: 1500,
      received: true,
      type: "recurrent",
      date: ""
    },
    {
      name: "Domino's",
      amount: 330,
      received: false,
      type: "recurrent",
      date: ""
    },
    {
      name: "Tickets restaurant",
      amount: 200,
      received: true,
      type: "recurrent",
      date: ""
    },
    {
      name: "Prime d'intéressement",
      amount: 0,
      received: false,
      type: "ponctuel",
      date: ""
    },
    {
      name: "Vente TV",
      amount: 170,
      received: false,
      type: "ponctuel",
      date: ""
    }
  ],

  bills: [
    {
      name: "Voiture",
      amount: 420.23,
      paid: true,
      day: 4
    },
    {
      name: "Loyer",
      amount: 250,
      paid: false,
      day: 5
    },
    {
      name: "Études",
      amount: 66.10,
      paid: false,
      day: 5
    },
    {
      name: "Assurance",
      amount: 49.83,
      paid: true,
      day: 5
    },
    {
      name: "TV",
      amount: 55,
      paid: true,
      day: 5
    },
    {
      name: "Regroupement",
      amount: 50,
      paid: true,
      day: 5
    },
    {
      name: "Xbox",
      amount: 20,
      paid: false,
      day: 7
    },
    {
      name: "Spotify",
      amount: 12,
      paid: false,
      day: 13
    },
    {
      name: "Salle de sport",
      amount: 40,
      paid: false,
      day: 15
    },
    {
      name: "Orange",
      amount: 25,
      paid: false,
      day: 27
    },
    {
      name: "Apple",
      amount: 61.63,
      paid: false,
      day: 31
    }
  ],

  credits: [
    {
      name: "Voiture",
      amount: 420.23,
      months: 16
    },
    {
      name: "TV",
      amount: 55,
      months: 35
    },
    {
      name: "Regroupement",
      amount: 50,
      months: 23
    },
    {
      name: "Apple",
      amount: 61.63,
      months: 14
    },
    {
      name: "Études",
      amount: 66.10,
      months: 11
    },
    {
      name: "Tablette",
      amount: 17,
      months: 12
    },
    {
      name: "Amazon Noël",
      amount: 21.76,
      months: 2
    },
    {
      name: "Manette",
      amount: 23.92,
      months: 3
    },
    {
      name: "Amazon",
      amount: 30.01,
      months: 3
    },
    {
      name: "PayPal pièces auto",
      amount: 39.54,
      months: 3
    },
    {
      name: "PayPal cadeau",
      amount: 27.26,
      months: 2
    }
  ]
};


// ==========================================
// CHARGEMENT / SAUVEGARDE
// ==========================================

let state = loadState();

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadState() {

  try {

    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return clone(defaultState);
    }

    const data =
      JSON.parse(saved);

    if (Array.isArray(data.credits)) {

      data.credits =
        data.credits.map(function(c) {

          if (Array.isArray(c)) {

            return {
              name: c[0],
              amount: Number(c[1]),
              months: Number(c[2])
            };

          }

          return c;

        });

    }

    return {
      ...clone(defaultState),
      ...data,

      incomes:
        (data.incomes ||
          clone(defaultState.incomes))
        .map(function(x) {

          return {
            ...x,
            type: x.type || "ponctuel",
            date: x.date || ""
          };

        }),

      bills:
        data.bills ||
        clone(defaultState.bills),

      credits:
        data.credits ||
        clone(defaultState.credits),

      expenses:
        data.expenses || []

    };

  } catch (error) {

    console.log(
      "Erreur chargement :",
      error
    );

    return clone(defaultState);
  }
}

function saveState() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );

}


// ==========================================
// OUTILS
// ==========================================

function euro(value) {

  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR"
    }
  ).format(
    Number(value) || 0
  );

}

function esc(value) {

  return String(value)
    .replace(
      /[&<>"']/g,
      function(char) {

        const map = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        };

        return map[char];

      }
    );

}

function $(id) {

  return document.getElementById(id);

}


// ==========================================
// CALCULS
// ==========================================

function totals() {

  const expenses =
    state.expenses.reduce(
      function(sum, item) {

        return sum +
          Number(item.amount);

      },
      0
    );

  const incomeDue =
    state.incomes
      .filter(function(item) {

        return !item.received;

      })
      .reduce(
        function(sum, item) {

          return sum +
            Number(item.amount);

        },
        0
      );

  const billsDue =
    state.bills
      .filter(function(item) {

        return !item.paid;

      })
      .reduce(
        function(sum, item) {

          return sum +
            Number(item.amount);

        },
        0
      );

  const incomeReceived =
    state.incomes
      .filter(function(item) {

        return item.received;

      })
      .reduce(
        function(sum, item) {

          return sum +
            Number(item.amount);

        },
        0
      );

  const creditsMonthly =
    state.credits.reduce(
      function(sum, item) {

        return sum +
          Number(item.amount);

      },
      0
    );

  const fuel =
    state.expenses
      .filter(function(item) {

        return item.category ===
          "Carburant";

      })
      .reduce(
        function(sum, item) {

          return sum +
            Number(item.amount);

        },
        0
      );

  return {

    expenses,

    incomeDue,

    billsDue,

    incomeReceived,

    creditsMonthly,

    fuel,

    forecast:
      Number(state.balance) +
      incomeDue -
      billsDue -
      expenses

  };

}


// ==========================================
// DASHBOARD
// ==========================================

function render() {

  const t = totals();

  if ($("balance")) {
    $("balance").textContent =
      euro(state.balance);
  }

  if ($("forecast")) {
    $("forecast").textContent =
      euro(t.forecast);
  }

  if ($("deferred")) {
    $("deferred").textContent =
      euro(t.expenses);
  }

  if ($("incomeDue")) {
    $("incomeDue").textContent =
      euro(t.incomeDue);
  }

  if ($("billsDue")) {
    $("billsDue").textContent =
      euro(t.billsDue);
  }

  if ($("saving")) {
    $("saving").textContent =
      euro(state.savings);
  }

  if ($("savingBig")) {
    $("savingBig").textContent =
      euro(state.savings);
  }

  if ($("goal")) {
    $("goal").textContent =
      euro(state.goal);
  }

  const savePercent =
    state.goal > 0
      ? Math.min(
          100,
          Math.max(
            0,
            state.savings /
              state.goal *
              100
          )
        )
      : 0;

  if ($("savebar")) {
    $("savebar").style.width =
      savePercent + "%";
  }

  const xp =
    Math.max(
      0,
      Math.floor(state.savings)
    );

  const level =
    Math.floor(xp / 100) + 1;

  const currentXp =
    xp % 100;

  if ($("level")) {
    $("level").textContent =
      level;
  }

  if ($("xp")) {
    $("xp").textContent =
      currentXp + " / 100";
  }

  if ($("xpbar")) {
    $("xpbar").style.width =
      currentXp + "%";
  }

  if ($("badge")) {

    $("badge").textContent =
      level >= 7
        ? "🏆 Légende"
        : level >= 5
        ? "💎 Expert"
        : level >= 3
        ? "🥇 Confirmé"
        : "🥉 Débutant";

  }

  if ($("expenses")) {
    $("expenses").textContent =
      euro(t.expenses);
  }

  if ($("income")) {
    $("income").textContent =
      euro(t.incomeReceived);
  }

  if ($("credits")) {
    $("credits").textContent =
      euro(t.creditsMonthly);
  }

  if ($("fuel")) {
    $("fuel").textContent =
      euro(t.fuel);
  }

  renderExpenses();
  renderBills();
  renderCredits();
  renderGoals();
  renderIncomes();

}
// ==========================================
// NAVIGATION
// ==========================================

function showScreen(id, button) {

  document
    .querySelectorAll(".screen")
    .forEach(function(screen) {

      screen.classList.remove(
        "active"
      );

    });

  const screen = $(id);

  if (screen) {
    screen.classList.add("active");
  }

  document
    .querySelectorAll("nav button")
    .forEach(function(btn) {

      btn.classList.remove(
        "active"
      );

    });

  if (button) {
    button.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function setupNavigation() {

  document
    .querySelectorAll(
      "nav button[data-s]"
    )
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          showScreen(
            button.dataset.s,
            button
          );

        }
      );

    });

}


// ==========================================
// STYLE DES MODALES
// ==========================================

function addModalStyles() {

  if ($("fqModalStyles")) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "fqModalStyles";

  style.textContent = `

    .fq-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.72);
      z-index: 9999;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 16px;
    }

    .fq-modal.hidden {
      display: none;
    }

    .fq-box {
      width: min(560px,100%);
      max-height: 90vh;
      overflow: auto;
      background: #111827;
      border: 1px solid #334155;
      border-radius: 24px;
      padding: 22px;
      box-shadow:
        0 20px 60px #000;
    }

    .fq-box h3 {
      margin: 0 0 18px;
      font-size: 24px;
    }

    .fq-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .fq-close {
      background: #26334b;
      color: white;
      border: 0;
      border-radius: 12px;
      padding: 9px 13px;
      font-size: 18px;
    }

    .fq-form label {
      display: block;
      margin: 14px 0;
      color: #cbd5e1;
      font-size: 14px;
    }

    .fq-form input,
    .fq-form select {
      box-sizing: border-box;
      width: 100%;
      margin-top: 7px;
      padding: 13px;
      border-radius: 12px;
      border: 1px solid #475569;
      background: #0f172a;
      color: white;
      font-size: 17px;
    }

    .fq-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .fq-actions button {
      flex: 1;
      padding: 13px;
      border: 0;
      border-radius: 13px;
      font-weight: 700;
      font-size: 16px;
    }

    .fq-primary {
      background: #2563eb;
      color: white;
    }

    .fq-secondary {
      background: #334155;
      color: white;
    }

    .fq-danger {
      background: #991b1b;
      color: white;
    }

    .fq-setting {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      padding: 14px 0;
      border-bottom: 1px solid #26334b;
    }

    .fq-setting span {
      color: #cbd5e1;
    }

    .fq-setting button {
      background: #26334b;
      color: white;
      border: 0;
      border-radius: 10px;
      padding: 9px 12px;
    }

    .fq-mini {
      font-size: 12px;
      color: #94a3b8;
    }

    .fq-add {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin: 14px 0;
      padding: 14px;
      border: 0;
      border-radius: 14px;
      background: #2563eb;
      color: white;
      font-size: 16px;
      font-weight: 700;
    }

    .fq-row-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .fq-iconbtn {
      border: 0;
      background: #26334b;
      color: white;
      border-radius: 9px;
      padding: 7px 9px;
    }

    .fq-delete {
      background: #7f1d1d;
    }

  `;

  document.head.appendChild(
    style
  );

}


// ==========================================
// CREATION / FERMETURE DES MODALES
// ==========================================

function createModal(
  id,
  title,
  body
) {

  closeModal(id);

  const modal =
    document.createElement(
      "div"
    );

  modal.id = id;

  modal.className =
    "fq-modal";

  modal.innerHTML = `

    <div class="fq-box">

      <div class="fq-head">

        <h3>
          ${title}
        </h3>

        <button
          class="fq-close"
          data-close="${id}"
        >
          ✕
        </button>

      </div>

      ${body}

    </div>

  `;

  document.body.appendChild(
    modal
  );

  modal.addEventListener(
    "click",
    function(event) {

      if (
        event.target === modal ||
        event.target.closest(
          `[data-close="${id}"]`
        )
      ) {

        closeModal(id);

      }

    }
  );

  return modal;

}


function closeModal(id) {

  const element = $(id);

  if (element) {
    element.remove();
  }

}


// ==========================================
// DEPENSES
// ==========================================

function renderExpenses() {

  const container =
    $("expenseList");

  if (!container) {
    return;
  }

  const addButton = `

    <button
      class="fq-add"
      id="addExpenseButton"
    >
      ＋ Ajouter une dépense
    </button>

  `;


  if (!state.expenses.length) {

    container.innerHTML =
      addButton + `

        <div class="item">

          <div>

            <b>
              Aucune dépense
            </b>

            <div class="muted">
              Ajoute ta première
              dépense ci-dessus.
            </div>

          </div>

        </div>

      `;

  } else {

    container.innerHTML =
      addButton +

      state.expenses
        .slice()
        .reverse()
        .map(
          function(item, reverseIndex) {

            const index =
              state.expenses.length -
              1 -
              reverseIndex;

            return `

              <div class="item">

                <div>

                  <b>
                    ${esc(item.label)}
                  </b>

                  <div class="muted">
                    ${esc(item.category)}
                    ·
                    ${esc(item.date)}
                  </div>

                </div>

                <div
                  class="fq-row-actions"
                >

                  <b>
                    -${euro(item.amount)}
                  </b>

                  <button
                    class="fq-iconbtn fq-delete"
                    data-delete-expense="${index}"
                  >
                    ✕
                  </button>

                </div>

              </div>

            `;

          }
        )
        .join("");

  }


  $("addExpenseButton")
    ?.addEventListener(
      "click",
      openExpenseModal
    );


  document
    .querySelectorAll(
      "[data-delete-expense]"
    )
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          const index =
            Number(
              button.dataset
                .deleteExpense
            );

          if (
            confirm(
              "Supprimer cette dépense ?"
            )
          ) {

            state.expenses
              .splice(
                index,
                1
              );

            saveState();

            render();

          }

        }
      );

    });

}


// ==========================================
// MODALE DEPENSE
// ==========================================

function openExpenseModal() {

  createModal(
    "expenseModal",
    "💳 Nouvelle dépense",
    `

      <div class="fq-form">

        <label>
          Libellé

          <input
            id="fqExpenseLabel"
            placeholder="Ex. Carrefour"
          >

        </label>


        <label>
          Montant (€)

          <input
            id="fqExpenseAmount"
            type="number"
            step="0.01"
            inputmode="decimal"
            placeholder="0,00"
          >

        </label>


        <label>
          Catégorie

          <select
            id="fqExpenseCategory"
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


        <div class="fq-actions">

          <button
            class="fq-secondary"
            data-close="expenseModal"
          >
            Annuler
          </button>

          <button
            class="fq-primary"
            id="fqSaveExpense"
          >
            Enregistrer
          </button>

        </div>

      </div>

    `
  );


  $("fqExpenseLabel")
    ?.focus();


  $("fqSaveExpense")
    ?.addEventListener(
      "click",
      function() {

        const label =
          $("fqExpenseLabel")
            .value
            .trim();

        const amount =
          Number(
            $("fqExpenseAmount")
              .value
          );

        const category =
          $("fqExpenseCategory")
            .value;


        if (
          !label ||
          !amount ||
          amount <= 0
        ) {

          alert(
            "Indique un libellé et un montant valide."
          );

          return;

        }


        state.expenses.push({

          label:

            label,

          amount:

            amount,

          category:

            category,

          date:

            new Date()
              .toLocaleDateString(
                "fr-FR"
              )

        });


        saveState();

        closeModal(
          "expenseModal"
        );

        render();

      }
    );

}


// ==========================================
// CREDITS
// ==========================================

function renderCredits() {

  const container =
    $("creditList");

  if (!container) {
    return;
  }


  const addButton = `

    <button
      class="fq-add"
      id="addCreditButton"
    >
      ＋ Ajouter un crédit
    </button>

  `;


  container.innerHTML =
    addButton +

    state.credits
      .map(
        function(credit, index) {

          return `

            <div class="item">

              <div>

                <b>
                  ${esc(credit.name)}
                </b>

                <div class="muted">

                  ${
                    credit.months
                  }

                  mensualité${
                    credit.months > 1
                      ? "s"
                      : ""
                  }

                  restante${
                    credit.months > 1
                      ? "s"
                      : ""
                  }

                </div>

              </div>


              <div
                class="fq-row-actions"
              >

                <b>
                  ${euro(
                    credit.amount
                  )}/mois
                </b>

                <button
                  class="fq-iconbtn"
                  data-edit-credit="${index}"
                >
                  ✏️
                </button>

                <button
                  class="fq-iconbtn fq-delete"
                  data-delete-credit="${index}"
                >
                  ✕
                </button>

              </div>

            </div>

          `;

        }
      )
      .join("");


  $("addCreditButton")
    ?.addEventListener(
      "click",
      function() {

        openCreditModal();

      }
    );


  document
    .querySelectorAll(
      "[data-edit-credit]"
    )
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          openCreditModal(
            Number(
              button.dataset
                .editCredit
            )
          );

        }
      );

    });


  document
    .querySelectorAll(
      "[data-delete-credit]"
    )
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          const index =
            Number(
              button.dataset
                .deleteCredit
            );

          if (
            confirm(
              "Supprimer ce crédit ?"
            )
          ) {

            state.credits
              .splice(
                index,
                1
              );

            saveState();

            render();

          }

        }
      );

    });

}


// ==========================================
// MODALE CREDIT
// ==========================================

function openCreditModal(
  index = null
) {

  const edit =
    index !== null
      ? state.credits[index]
      : null;


  createModal(
    "creditModal",

    edit
      ? "✏️ Modifier le crédit"
      : "🏦 Nouveau crédit",

    `

      <div class="fq-form">

        <label>
          Nom du crédit

          <input
            id="fqCreditName"
            value="${
              edit
                ? esc(edit.name)
                : ""
            }"
            placeholder="Ex. Nouveau téléphone"
          >

        </label>


        <label>
          Mensualité (€)

          <input
            id="fqCreditAmount"
            type="number"
            step="0.01"
            inputmode="decimal"
            value="${
              edit
                ? edit.amount
                : ""
            }"
            placeholder="0,00"
          >

        </label>


        <label>
          Mensualités restantes

          <input
            id="fqCreditMonths"
            type="number"
            min="1"
            inputmode="numeric"
            value="${
              edit
                ? edit.months
                : ""
            }"
            placeholder="Ex. 12"
          >

        </label>


        <div class="fq-actions">

          <button
            class="fq-secondary"
            data-close="creditModal"
          >
            Annuler
          </button>

          <button
            class="fq-primary"
            id="fqSaveCredit"
          >
            Enregistrer
          </button>

        </div>

      </div>

    `
  );


  $("fqSaveCredit")
    ?.addEventListener(
      "click",
      function() {

        const name =
          $("fqCreditName")
            .value
            .trim();

        const amount =
          Number(
            $("fqCreditAmount")
              .value
          );

        const months =
          Number(
            $("fqCreditMonths")
              .value
          );


        if (
          !name ||
          amount <= 0 ||
          months <= 0
        ) {

          alert(
            "Complète correctement les trois champs."
          );

          return;

        }


        const credit = {

          name:
            name,

          amount:
            amount,

          months:
            months

        };


        if (index === null) {

          state.credits
            .push(credit);

        } else {

          state.credits[index] =
            credit;

        }


        saveState();

        closeModal(
          "creditModal"
        );

        render();

      }
    );

}
// ==========================================
// PRELEVEMENTS
// ==========================================

function renderBills() {

  const container =
    $("billList");

  if (!container) {
    return;
  }

  container.innerHTML = `

    <button
      class="fq-add"
      id="addBillButton"
    >
      ＋ Ajouter un prélèvement
    </button>

    ${state.bills
      .map(function(bill, index) {

        return `

          <div class="item">

            <div>

              <b>
                ${esc(bill.name)}
              </b>

              <div class="muted">
                Le ${bill.day}
                ·
                ${euro(bill.amount)}
              </div>

            </div>


            <div
              class="fq-row-actions"
            >

              <input
                type="checkbox"
                data-bill="${index}"
                ${bill.paid ? "checked" : ""}
              >

              <button
                class="fq-iconbtn"
                data-edit-bill="${index}"
              >
                ✏️
              </button>

              <button
                class="fq-iconbtn fq-delete"
                data-delete-bill="${index}"
              >
                ✕
              </button>

            </div>

          </div>

        `;

      })
      .join("")}

  `;


  $("addBillButton")
    ?.addEventListener(
      "click",
      function() {

        openBillModal();

      }
    );


  document
    .querySelectorAll(
      "[data-bill]"
    )
    .forEach(function(box) {

      box.addEventListener(
        "change",
        function() {

          const index =
            Number(
              box.dataset.bill
            );

          state.bills[index].paid =
            box.checked;

          saveState();

          render();

        }
      );

    });


  document
    .querySelectorAll(
      "[data-edit-bill]"
    )
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          openBillModal(
            Number(
              button.dataset
                .editBill
            )
          );

        }
      );

    });


  document
    .querySelectorAll(
      "[data-delete-bill]"
    )
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          const index =
            Number(
              button.dataset
                .deleteBill
            );

          if (
            confirm(
              "Supprimer ce prélèvement ?"
            )
          ) {

            state.bills
              .splice(
                index,
                1
              );

            saveState();

            render();

          }

        }
      );

    });

}


// ==========================================
// MODALE PRELEVEMENT
// ==========================================

function openBillModal(
  index = null
) {

  const edit =
    index !== null
      ? state.bills[index]
      : null;


  createModal(
    "billModal",

    edit
      ? "✏️ Modifier le prélèvement"
      : "📅 Nouveau prélèvement",

    `

      <div class="fq-form">

        <label>
          Nom

          <input
            id="fqBillName"
            value="${
              edit
                ? esc(edit.name)
                : ""
            }"
            placeholder="Ex. Internet"
          >

        </label>


        <label>
          Montant (€)

          <input
            id="fqBillAmount"
            type="number"
            step="0.01"
            inputmode="decimal"
            value="${
              edit
                ? edit.amount
                : ""
            }"
            placeholder="0,00"
          >

        </label>


        <label>
          Jour du mois

          <input
            id="fqBillDay"
            type="number"
            min="1"
            max="31"
            inputmode="numeric"
            value="${
              edit
                ? edit.day
                : ""
            }"
            placeholder="Ex. 5"
          >

        </label>


        <div class="fq-actions">

          <button
            class="fq-secondary"
            data-close="billModal"
          >
            Annuler
          </button>

          <button
            class="fq-primary"
            id="fqSaveBill"
          >
            Enregistrer
          </button>

        </div>

      </div>

    `
  );


  $("fqSaveBill")
    ?.addEventListener(
      "click",
      function() {

        const name =
          $("fqBillName")
            .value
            .trim();

        const amount =
          Number(
            $("fqBillAmount")
              .value
          );

        const day =
          Number(
            $("fqBillDay")
              .value
          );


        if (
          !name ||
          amount <= 0 ||
          day < 1 ||
          day > 31
        ) {

          alert(
            "Vérifie les informations."
          );

          return;

        }


        const bill = {

          name:
            name,

          amount:
            amount,

          day:
            day,

          paid:
            edit
              ? edit.paid
              : false

        };


        if (index === null) {

          state.bills
            .push(bill);

        } else {

          state.bills[index] =
            bill;

        }


        saveState();

        closeModal(
          "billModal"
        );

        render();

      }
    );

}


// ==========================================
// REVENUS
// ==========================================

function renderIncomes() {

  // Les revenus sont gérés
  // depuis le menu Paramètres.
  //
  // Cela permet de garder la
  // navigation principale simple
  // sur iPhone.

}


function openIncomeManager() {

  createModal(
    "incomeModal",
    "💶 Revenus du mois",

    `

      <div>

        ${state.incomes
          .map(function(income, index) {

            return `

              <div
                class="fq-setting"
              >

                <span>

                  <b>
                    ${esc(
                      income.name
                    )}
                  </b>

                  <br>

                  <span
                    class="fq-mini"
                  >
                    ${euro(
                      income.amount
                    )}

                    ·

                    ${
                      income.type ===
                      "recurrent"
                        ? "Récurrent"
                        : "Ponctuel"
                    }

                  </span>

                </span>


                <div
                  class="fq-row-actions"
                >

                  <button
                    class="fq-iconbtn"
                    data-edit-income="${index}"
                  >
                    ✏️
                  </button>

                  <button
                    class="fq-iconbtn"
                    data-income-paid="${index}"
                  >
                    ${
                      income.received
                        ? "✅"
                        : "⬜"
                    }
                  </button>

                </div>

              </div>

            `;

          })
          .join("")}


        <button
          class="fq-add"
          id="addIncomeButton"
        >
          ＋ Ajouter un revenu
        </button>

      </div>

    `
  );


  document
    .querySelectorAll(
      "[data-income-paid]"
    )
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          const index =
            Number(
              button.dataset
                .incomePaid
            );

          state.incomes[index]
            .received =
              !state.incomes[index]
                .received;

          saveState();

          closeModal(
            "incomeModal"
          );

          render();

          openIncomeManager();

        }
      );

    });


  document
    .querySelectorAll(
      "[data-edit-income]"
    )
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          const index =
            Number(
              button.dataset
                .editIncome
            );

          closeModal(
            "incomeModal"
          );

          openIncomeModal(
            index
          );

        }
      );

    });


  $("addIncomeButton")
    ?.addEventListener(
      "click",
      function() {

        closeModal(
          "incomeModal"
        );

        openIncomeModal();

      }
    );

}


// ==========================================
// AJOUT / MODIFICATION D'UN REVENU
// ==========================================

function openIncomeModal(
  index = null
) {

  const edit =
    index !== null
      ? state.incomes[index]
      : null;


  createModal(
    "incomeEditModal",

    edit
      ? "✏️ Modifier le revenu"
      : "💶 Nouveau revenu",

    `

      <div class="fq-form">

        <label>
          Nom / origine

          <input
            id="fqIncomeName"
            value="${
              edit
                ? esc(edit.name)
                : ""
            }"
            placeholder="Ex. Vente Vinted"
          >

        </label>


        <label>
          Montant (€)

          <input
            id="fqIncomeAmount"
            type="number"
            step="0.01"
            inputmode="decimal"
            value="${
              edit
                ? edit.amount
                : ""
            }"
            placeholder="0,00"
          >

        </label>


        <label>
          Type de revenu

          <select
            id="fqIncomeType"
          >

            <option
              value="ponctuel"
              ${
                !edit ||
                edit.type !==
                "recurrent"
                  ? "selected"
                  : ""
              }
            >
              Ponctuel
            </option>

            <option
              value="recurrent"
              ${
                edit &&
                edit.type ===
                "recurrent"
                  ? "selected"
                  : ""
              }
            >
              Récurrent
            </option>

          </select>

        </label>


        <label>
          Date

          <input
            id="fqIncomeDate"
            type="date"
            value="${
              edit
                ? edit.date
                : ""
            }"
          >

        </label>


        <label>

          <input
            id="fqIncomeReceived"
            type="checkbox"
            ${
              edit &&
              edit.received
                ? "checked"
                : ""
            }
          >

          Argent déjà reçu / versé
          
        </label>


        <div
          class="fq-actions"
        >

          <button
            class="fq-secondary"
            data-close="incomeEditModal"
          >
            Annuler
          </button>

          <button
            class="fq-primary"
            id="fqSaveIncome"
          >
            Enregistrer
          </button>

        </div>

      </div>

    `
  );


  $("fqSaveIncome")
    ?.addEventListener(
      "click",
      function() {

        const name =
          $("fqIncomeName")
            .value
            .trim();

        const amount =
          Number(
            $("fqIncomeAmount")
              .value
          );

        const type =
          $("fqIncomeType")
            .value;

        const date =
          $("fqIncomeDate")
            .value;

        const received =
          $("fqIncomeReceived")
            .checked;


        if (
          !name ||
          amount <= 0
        ) {

          alert(
            "Entre un nom et un montant valide."
          );

          return;

        }


        const income = {

          name:
            name,

          amount:
            amount,

          type:
            type,

          date:
            date,

          received:
            received

        };


        if (index === null) {

          state.incomes
            .push(income);

        } else {

          state.incomes[index] =
            income;

        }


        saveState();

        closeModal(
          "incomeEditModal"
        );

        render();

      }
    );

}


// ==========================================
// ÉPARGNE
// ==========================================

function renderGoals() {

  const container =
    $("goalList");

  if (!container) {
    return;
  }


  const goals = [

    100,
    250,
    500,
    1000,
    2500,
    5000,
    10000

  ];


  container.innerHTML = `

    <button
      class="fq-add"
      id="savingActionButton"
    >
      ＋ Gérer mon épargne
    </button>

    ${goals
      .map(function(goal) {

        const reached =
          goal <= state.savings;

        return `

          <div class="item">

            <b>
              ${
                reached
                  ? "🏆"
                  : "🎯"
              }

              ${goal.toLocaleString(
                "fr-FR"
              )}

              €
            </b>

            <span>
              ${
                reached
                  ? "ATTEINT"
                  : "À atteindre"
              }
            </span>

          </div>

        `;

      })
      .join("")}

  `;


  $("savingActionButton")
    ?.addEventListener(
      "click",
      openSavingModal
    );

}


function openSavingModal() {

  createModal(
    "savingModal",
    "🎯 Gérer mon épargne",

    `

      <div class="fq-form">

        <label>
          Épargne actuelle (€)

          <input
            id="fqSavings"
            type="number"
            step="0.01"
            value="${state.savings}"
          >

        </label>


        <label>
          Objectif principal (€)

          <input
            id="fqGoal"
            type="number"
            step="0.01"
            value="${state.goal}"
          >

        </label>


        <div
          class="fq-actions"
        >

          <button
            class="fq-secondary"
            data-close="savingModal"
          >
            Annuler
          </button>

          <button
            class="fq-primary"
            id="fqSaveSaving"
          >
            Enregistrer
          </button>

        </div>

      </div>

    `
  );


  $("fqSaveSaving")
    ?.addEventListener(
      "click",
      function() {

        state.savings =
          Math.max(
            0,
            Number(
              $("fqSavings")
                .value
            ) || 0
          );

        state.goal =
          Math.max(
            1,
            Number(
              $("fqGoal")
                .value
            ) || 500
          );


        saveState();

        closeModal(
          "savingModal"
        );

        render();

      }
    );

}
// ==========================================
// PARAMETRES COMPLETS
// ==========================================

function setupSettings() {

  const button =
    $("settings");

  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    openSettings
  );

}


function openSettings() {

  createModal(
    "settingsModal",
    "⚙️ Paramètres Finance Quest",

    `

      <div>

        <div class="fq-setting">

          <span>

            <b>
              💰 Solde actuel
            </b>

            <br>

            <span class="fq-mini">
              ${euro(
                state.balance
              )}
            </span>

          </span>

          <button
            data-setting="balance"
          >
            Modifier
          </button>

        </div>


        <div class="fq-setting">

          <span>

            <b>
              🏦 Découvert autorisé
            </b>

            <br>

            <span class="fq-mini">
              ${euro(
                state.overdraft
              )}
            </span>

          </span>

          <button
            data-setting="overdraft"
          >
            Modifier
          </button>

        </div>


        <div class="fq-setting">

          <span>

            <b>
              💼 Salaire Europcar
            </b>

            <br>

            <span class="fq-mini">
              ${euro(
                state.salaryEuropcar
              )}
            </span>

          </span>

          <button
            data-setting="salaryEuropcar"
          >
            Modifier
          </button>

        </div>


        <div class="fq-setting">

          <span>

            <b>
              🍕 Salaire Domino's
            </b>

            <br>

            <span class="fq-mini">
              ${euro(
                state.salaryDominos
              )}
            </span>

          </span>

          <button
            data-setting="salaryDominos"
          >
            Modifier
          </button>

        </div>


        <div class="fq-setting">

          <span>

            <b>
              🍽️ Tickets restaurant
            </b>

            <br>

            <span class="fq-mini">
              ${euro(
                state.ticketsRestaurant
              )}
            </span>

          </span>

          <button
            data-setting="ticketsRestaurant"
          >
            Modifier
          </button>

        </div>


        <div class="fq-setting">

          <span>

            <b>
              ⛽ Budget carburant
            </b>

            <br>

            <span class="fq-mini">
              ${euro(
                state.fuelBudget
              )}
            </span>

          </span>

          <button
            data-setting="fuelBudget"
          >
            Modifier
          </button>

        </div>


        <div class="fq-setting">

          <span>

            <b>
              💶 Revenus
            </b>

            <br>

            <span class="fq-mini">
              Salaires, ventes,
              espèces déposées...
            </span>

          </span>

          <button
            id="manageIncomes"
          >
            Ouvrir
          </button>

        </div>


        <div class="fq-setting">

          <span>

            <b>
              🎯 Épargne
            </b>

            <br>

            <span class="fq-mini">
              ${euro(
                state.savings
              )}

              /

              ${euro(
                state.goal
              )}
            </span>

          </span>

          <button
            id="manageSavings"
          >
            Ouvrir
          </button>

        </div>


        <div class="fq-setting">

          <span>

            <b>
              🗑️ Réinitialisation
            </b>

            <br>

            <span class="fq-mini">
              Efface les données
              Finance Quest
            </span>

          </span>

          <button
            class="fq-danger"
            id="resetApp"
          >
            Reset
          </button>

        </div>

      </div>

    `
  );


  document
    .querySelectorAll(
      "[data-setting]"
    )
    .forEach(
      function(button) {

        button.addEventListener(
          "click",
          function() {

            const key =
              button.dataset.setting;


            const labels = {

              balance:
                "Solde actuel (€)",

              overdraft:
                "Découvert autorisé (€)",

              salaryEuropcar:
                "Salaire Europcar (€)",

              salaryDominos:
                "Salaire Domino's (€)",

              ticketsRestaurant:
                "Tickets restaurant (€)",

              fuelBudget:
                "Budget carburant mensuel (€)"

            };


            const value =
              prompt(
                labels[key],
                state[key]
              );


            if (
              value !== null &&
              !isNaN(
                Number(value)
              )
            ) {

              state[key] =
                Number(value);


              // Synchronisation
              // des revenus principaux.

              if (
                key ===
                "salaryEuropcar"
              ) {

                const income =
                  state.incomes
                    .find(
                      function(item) {

                        return (
                          item.name ===
                          "Europcar"
                        );

                      }
                    );

                if (income) {

                  income.amount =
                    state[key];

                }

              }


              if (
                key ===
                "salaryDominos"
              ) {

                const income =
                  state.incomes
                    .find(
                      function(item) {

                        return (
                          item.name ===
                          "Domino's"
                        );

                      }
                    );

                if (income) {

                  income.amount =
                    state[key];

                }

              }


              if (
                key ===
                "ticketsRestaurant"
              ) {

                const income =
                  state.incomes
                    .find(
                      function(item) {

                        return (
                          item.name ===
                          "Tickets restaurant"
                        );

                      }
                    );

                if (income) {

                  income.amount =
                    state[key];

                }

              }


              saveState();

              closeModal(
                "settingsModal"
              );

              render();

              openSettings();

            }

          }
        );

      }
    );


  $("manageIncomes")
    ?.addEventListener(
      "click",
      function() {

        closeModal(
          "settingsModal"
        );

        openIncomeManager();

      }
    );


  $("manageSavings")
    ?.addEventListener(
      "click",
      function() {

        closeModal(
          "settingsModal"
        );

        openSavingModal();

      }
    );


  $("resetApp")
    ?.addEventListener(
      "click",
      function() {

        if (
          confirm(
            "Réinitialiser toutes les données Finance Quest ?"
          )
        ) {

          localStorage
            .removeItem(
              STORAGE_KEY
            );

          state =
            clone(
              defaultState
            );

          closeModal(
            "settingsModal"
          );

          render();

        }

      }
    );

}


// ==========================================
// INITIALISATION
// ==========================================

function init() {

  addModalStyles();

  setupNavigation();

  setupSettings();

  render();

}


// ==========================================
// LANCEMENT
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  init
);
