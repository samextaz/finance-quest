// ================================
// FINANCE QUEST V1.1
// ================================

const STORAGE_KEY = "financeQuestV11";

const defaultState = {
  balance: 74,
  savings: 0,
  goal: 500,

  expenses: [],

  incomes: [
    { name: "Europcar", amount: 1500, received: true },
    { name: "Domino's", amount: 330, received: false },
    { name: "Tickets restaurant", amount: 200, received: true },
    { name: "Prime d'intéressement", amount: 0, received: false },
    { name: "Vente TV", amount: 170, received: false }
  ],

  bills: [
    { name: "Voiture", amount: 420.23, paid: true, day: 4 },
    { name: "Loyer", amount: 250, paid: false, day: 5 },
    { name: "Études", amount: 66.10, paid: false, day: 5 },
    { name: "Assurance", amount: 49.83, paid: true, day: 5 },
    { name: "TV", amount: 55, paid: true, day: 5 },
    { name: "Regroupement", amount: 50, paid: true, day: 5 },
    { name: "Xbox", amount: 20, paid: false, day: 7 },
    { name: "Spotify", amount: 12, paid: false, day: 13 },
    { name: "Salle de sport", amount: 40, paid: false, day: 15 },
    { name: "Orange", amount: 25, paid: false, day: 27 },
    { name: "Apple", amount: 61.63, paid: false, day: 31 }
  ],

  credits: [
    ["Voiture", 420.23, 16],
    ["TV", 55, 35],
    ["Regroupement", 50, 23],
    ["Apple", 61.63, 14],
    ["Études", 66.10, 11],
    ["Tablette", 17, 12],
    ["Amazon Noël", 21.76, 2],
    ["Manette", 23.92, 3],
    ["Amazon", 30.01, 3],
    ["PayPal pièces auto", 39.54, 3],
    ["PayPal cadeau", 27.26, 2]
  ]
};


// ================================
// CHARGEMENT / SAUVEGARDE
// ================================

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.log("Erreur chargement :", error);
  }

  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.log("Erreur sauvegarde :", error);
  }
}


// ================================
// OUTILS
// ================================

function euro(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function(char) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return map[char];
  });
}

function getElement(id) {
  return document.getElementById(id);
}


// ================================
// CALCULS
// ================================

function getTotals() {

  const expenses = state.expenses.reduce(
    function(total, item) {
      return total + Number(item.amount);
    },
    0
  );

  const incomeDue = state.incomes
    .filter(function(item) {
      return !item.received;
    })
    .reduce(function(total, item) {
      return total + Number(item.amount);
    }, 0);

  const billsDue = state.bills
    .filter(function(item) {
      return !item.paid;
    })
    .reduce(function(total, item) {
      return total + Number(item.amount);
    }, 0);

  const receivedIncome = state.incomes
    .filter(function(item) {
      return item.received;
    })
    .reduce(function(total, item) {
      return total + Number(item.amount);
    }, 0);

  const monthlyCredits = state.credits.reduce(
    function(total, item) {
      return total + Number(item[1]);
    },
    0
  );

  const fuel = state.expenses
    .filter(function(item) {
      return item.category === "Carburant";
    })
    .reduce(function(total, item) {
      return total + Number(item.amount);
    }, 0);

  const forecast =
    Number(state.balance) +
    incomeDue -
    billsDue -
    expenses;

  return {
    expenses,
    incomeDue,
    billsDue,
    receivedIncome,
    monthlyCredits,
    fuel,
    forecast
  };
}


// ================================
// DASHBOARD
// ================================

function render() {

  const totals = getTotals();

  const balance = getElement("balance");
  const forecast = getElement("forecast");
  const deferred = getElement("deferred");
  const incomeDue = getElement("incomeDue");
  const billsDue = getElement("billsDue");

  if (balance) balance.textContent = euro(state.balance);
  if (forecast) forecast.textContent = euro(totals.forecast);
  if (deferred) deferred.textContent = euro(totals.expenses);
  if (incomeDue) incomeDue.textContent = euro(totals.incomeDue);
  if (billsDue) billsDue.textContent = euro(totals.billsDue);


  // Épargne

  const saving = getElement("saving");
  const savingBig = getElement("savingBig");
  const goal = getElement("goal");
  const savebar = getElement("savebar");

  if (saving) saving.textContent = euro(state.savings);
  if (savingBig) savingBig.textContent = euro(state.savings);
  if (goal) goal.textContent = euro(state.goal);

  let savingPercent = 0;

  if (state.goal > 0) {
    savingPercent =
      Math.min(
        100,
        Math.max(
          0,
          state.savings / state.goal * 100
        )
      );
  }

  if (savebar) {
    savebar.style.width =
      savingPercent + "%";
  }


  // XP / niveaux

  const xp = Math.max(
    0,
    Math.floor(state.savings)
  );

  const level =
    Math.floor(xp / 100) + 1;

  const currentXp =
    xp % 100;

  const levelElement =
    getElement("level");

  const xpElement =
    getElement("xp");

  const xpbar =
    getElement("xpbar");

  const badge =
    getElement("badge");

  if (levelElement) {
    levelElement.textContent = level;
  }

  if (xpElement) {
    xpElement.textContent =
      currentXp + " / 100";
  }

  if (xpbar) {
    xpbar.style.width =
      currentXp + "%";
  }

  if (badge) {

    if (level >= 7) {
      badge.textContent = "🏆 Légende";
    }
    else if (level >= 5) {
      badge.textContent = "💎 Expert";
    }
    else if (level >= 3) {
      badge.textContent = "🥇 Confirmé";
    }
    else {
      badge.textContent = "🥉 Débutant";
    }
  }


  // Résumé

  const expenses =
    getElement("expenses");

  const income =
    getElement("income");

  const credits =
    getElement("credits");

  const fuel =
    getElement("fuel");

  if (expenses) {
    expenses.textContent =
      euro(totals.expenses);
  }

  if (income) {
    income.textContent =
      euro(totals.receivedIncome);
  }

  if (credits) {
    credits.textContent =
      euro(totals.monthlyCredits);
  }

  if (fuel) {
    fuel.textContent =
      euro(totals.fuel);
  }


  renderExpenses();
  renderBills();
  renderCredits();
  renderGoals();
}


// ================================
// DEPENSES
// ================================

function renderExpenses() {

  const container =
    getElement("expenseList");

  if (!container) return;

  if (state.expenses.length === 0) {

    container.innerHTML =
      '<div class="item">' +
      '<div>' +
      '<b>Aucune dépense</b>' +
      '<div class="muted">' +
      'Ajoute ta première dépense avec le bouton +.' +
      '</div>' +
      '</div>' +
      '</div>';

    return;
  }

  container.innerHTML =
    state.expenses
      .slice()
      .reverse()
      .map(function(item) {

        return `
          <div class="item">
            <div>
              <b>${escapeHtml(item.label)}</b>
              <div class="muted">
                ${escapeHtml(item.category)}
                ·
                ${escapeHtml(item.date)}
              </div>
            </div>

            <b>-${euro(item.amount)}</b>
          </div>
        `;

      })
      .join("");
}


// ================================
// PRELEVEMENTS
// ================================

function renderBills() {

  const container =
    getElement("billList");

  if (!container) return;

  container.innerHTML =
    state.bills
      .map(function(item, index) {

        return `
          <div class="item">

            <div>
              <b>${escapeHtml(item.name)}</b>

              <div class="muted">
                Le ${item.day}
                ·
                ${euro(item.amount)}
              </div>
            </div>

            <input
              type="checkbox"
              class="bill-checkbox"
              data-index="${index}"
              ${item.paid ? "checked" : ""}
            >

          </div>
        `;

      })
      .join("");


  document
    .querySelectorAll(".bill-checkbox")
    .forEach(function(checkbox) {

      checkbox.addEventListener(
        "change",
        function() {

          const index =
            Number(
              checkbox.dataset.index
            );

          state.bills[index].paid =
            checkbox.checked;

          saveState();
          render();
        }
      );

    });
}


// ================================
// CREDITS
// ================================

function renderCredits() {

  const container =
    getElement("creditList");

  if (!container) return;

  container.innerHTML =
    state.credits
      .map(function(item) {

        return `
          <div class="item">

            <div>
              <b>${escapeHtml(item[0])}</b>

              <div class="muted">
                ${item[2]}
                mensualités restantes
              </div>
            </div>

            <b>
              ${euro(item[1])}/mois
            </b>

          </div>
        `;

      })
      .join("");
}


// ================================
// OBJECTIFS
// ================================

function renderGoals() {

  const container =
    getElement("goalList");

  if (!container) return;

  const goals = [
    100,
    250,
    500,
    1000,
    2500,
    5000,
    10000
  ];

  container.innerHTML =
    goals
      .map(function(goal) {

        const reached =
          goal <= state.savings;

        return `
          <div class="item">

            <b>
              ${reached ? "🏆" : "🎯"}
              ${goal.toLocaleString("fr-FR")} €
            </b>

            <span>
              ${reached ? "ATTEINT" : "À atteindre"}
            </span>

          </div>
        `;

      })
      .join("");
}


// ================================
// NAVIGATION
// ================================

function showScreen(screenId, button) {

  document
    .querySelectorAll(".screen")
    .forEach(function(screen) {

      screen.classList.remove("active");

    });


  const screen =
    getElement(screenId);

  if (screen) {
    screen.classList.add("active");
  }


  document
    .querySelectorAll("nav button")
    .forEach(function(navButton) {

      navButton.classList.remove("active");

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
    .querySelectorAll("nav button[data-s]")
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


// ================================
// AJOUT DEPENSE
// ================================

function openExpenseModal() {

  const modal =
    getElement("modal");

  if (!modal) return;

  modal.classList.remove("hidden");

  const label =
    getElement("label");

  if (label) {
    label.focus();
  }
}

function closeExpenseModal() {

  const modal =
    getElement("modal");

  if (modal) {
    modal.classList.add("hidden");
  }
}

function setupExpenseModal() {

  const add =
    getElement("add");

  const close =
    getElement("close");

  const save =
    getElement("save");

  const modal =
    getElement("modal");


  if (add) {
    add.addEventListener(
      "click",
      openExpenseModal
    );
  }


  if (close) {
    close.addEventListener(
      "click",
      closeExpenseModal
    );
  }


  if (modal) {

    modal.addEventListener(
      "click",
      function(event) {

        if (event.target === modal) {
          closeExpenseModal();
        }

      }
    );

  }


  if (save) {

    save.addEventListener(
      "click",
      function() {

        const label =
          getElement("label").value.trim();

        const amount =
          Number(
            getElement("amount").value
          );

        const category =
          getElement("category").value;


        if (!label) {

          alert(
            "Entre un libellé pour la dépense."
          );

          return;
        }


        if (!amount || amount <= 0) {

          alert(
            "Entre un montant valide."
          );

          return;
        }


        state.expenses.push({

          label: label,

          amount: amount,

          category: category,

          date:
            new Date()
              .toLocaleDateString("fr-FR")

        });


        saveState();

        render();


        getElement("label").value = "";
        getElement("amount").value = "";

        closeExpenseModal();


        const expensesButton =
          document.querySelector(
            'nav button[data-s="expensesScreen"]'
          );

        showScreen(
          "expensesScreen",
          expensesButton
        );

      }
    );

  }
}


// ================================
// PARAMETRES
// ================================

function setupSettings() {

  const settings =
    getElement("settings");

  if (!settings) return;


  settings.addEventListener(
    "click",
    function() {

      const balance =
        prompt(
          "Solde actuel (€)",
          state.balance
        );

      if (balance === null) {
        return;
      }


      const goal =
        prompt(
          "Objectif épargne (€)",
          state.goal
        );

      if (goal === null) {
        return;
      }


      const savings =
        prompt(
          "Épargne actuelle (€)",
          state.savings
        );

      if (savings === null) {
        return;
      }


      state.balance =
        Number(balance) || 0;

      state.goal =
        Number(goal) || 500;

      state.savings =
        Number(savings) || 0;


      saveState();

      render();

    }
  );
}


// ================================
// DEMARRAGE
// ================================

function init() {

  setupNavigation();

  setupExpenseModal();

  setupSettings();

  render();

}

document.addEventListener(
  "DOMContentLoaded",
  init
);
