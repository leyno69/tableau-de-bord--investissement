# Impact des changements de preuve

Toute modification, révocation ou mise à jour d'une preuve doit être reliée aux classifications et rapports qui en dépendent.

L'analyse d'impact reçoit un ensemble de preuves modifiées et des relations explicites vers les objets dépendants. Elle ne devine aucune dépendance.

Une classification touchée doit être recalculée. Un rapport touché doit être régénéré. Une preuve modifiée sans relation connue produit le blocage `unmapped-evidence-change` afin d'éviter une mise à jour partielle silencieuse.
