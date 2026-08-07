# Confrontation multi-fenêtres — preset beginner

## Statut

`development-comparison-only`

Ce rapport compare deux fenêtres historiques d’un an demandées comme non chevauchantes au même pilote simulé de 10 000 trajectoires.

## Référence simulée

- valeur finale médiane : 10 407,21 € ;
- p25 : 9 708,73 € ;
- p75 : 11 132,32 € ;
- p05 : 8 787,00 € ;
- p95 : 12 200,97 € ;
- rendement médian vs capital initial : +4,07 % ;
- drawdown médian : 6,74 % ;
- drawdown p95 : 15,82 %.

## Fenêtre A — 2024-04-01 → 2025-03-31

Fenêtre effective : 2 avril 2024 → 31 mars 2025, 256 observations communes.

- valeur finale : 10 464,22 € ;
- rendement cumulé : +4,64 % ;
- rendement annualisé : +4,67 % ;
- volatilité annualisée : 8,68 % ;
- drawdown maximal : 7,23 % ;
- drawdown non récupéré avant la fin de fenêtre ;
- creux : 11 mars 2025.

La valeur finale est très proche de la médiane simulée, environ +0,55 % au-dessus. Le rendement est supérieur à la médiane simulée d’environ +0,57 point de pourcentage. Le drawdown observé est également proche de la médiane simulée (+0,50 point environ).

## Fenêtre B — 2025-04-01 → 2026-03-31

Fenêtre effective : 1 avril 2025 → 31 mars 2026, 250 observations communes.

- valeur finale : 10 777,69 € ;
- rendement cumulé : +7,78 % ;
- rendement annualisé : +7,80 % ;
- volatilité annualisée : 10,41 % ;
- drawdown maximal : 8,68 % ;
- récupération : 12 mai 2025 ;
- creux → récupération : 33 jours ;
- temps total sous le sommet : 40 jours.

La valeur finale reste dans la zone centrale de la distribution simulée, entre la médiane et le p75. Le rendement dépasse la médiane simulée d’environ +3,71 points. Le drawdown est plus sévère que la médiane simulée (+1,94 point) mais reste très inférieur au p95 simulé.

## Résultat transversal

Les deux fenêtres historiques restent couvertes par la distribution simulée publiée sur la valeur finale et le drawdown. Aucune des deux ne produit, à ce stade, une observation extérieure aux bornes p05/p95 disponibles.

En revanche, la différence entre les fenêtres est déjà importante : le rendement historique passe d’environ +4,64 % à +7,78 %, la volatilité de 8,68 % à 10,41 %, et la récupération du drawdown maximal passe d’une absence de récupération avant la fin de fenêtre à seulement 33 jours après le creux.

Cette sensibilité montre qu’une seule fenêtre aurait pu donner une impression excessivement rassurante ou excessivement sévère. Elle justifie le protocole multi-fenêtres et interdit toute conclusion à partir du seul replay 2025 précédemment observé.

## Conclusion provisoire autorisée

À ce stade de développement, les observations ne fournissent pas de réfutation évidente du pilote agrégé : les deux rendements et les deux drawdowns sont contenus dans les zones publiées de la simulation.

Mais elles ne valident pas le modèle non plus. Deux fenêtres, une source non admissible scientifiquement et un moteur simulé encore agrégé sont insuffisants pour une conclusion de validation.

## Preuve d’exécution

- workflow : `31179088087` ;
- artefact : `8994006772` ;
- digest : `sha256:819b5a7580d504597b81961e78ccc643e6dfd811912dc915035e6d5712d08fb4`.

## Étape suivante

La prochaine montée en exigence doit ajouter des fenêtres glissantes préenregistrées, la sensibilité aux coûts, puis remplacer la source de développement par une source éligible à la validation scientifique finale.
