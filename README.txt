Finance Quest V4.4.16

FIX — Résumé du mois / Dépenses.
Le résumé utilisait encore l'ancien monthExpenses(), qui ne comptait que les dépenses
directes du calendrier. Il utilise maintenant le calcul unifié totalMonthlyOutflowsForSummary(),
qui inclut les dépenses directes, les échéances de crédits et les abonnements/prélèvements du mois.
Cache-buster : app.js?v=4.4.16.
