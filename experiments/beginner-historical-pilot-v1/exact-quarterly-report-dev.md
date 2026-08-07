# Résultats exacts trimestriels — development v1

## Statut

Piste `exact` sur WPEA.PA + PAEJ.PA + CASH. Source Yahoo Finance classée développement uniquement ; ces résultats ne constituent pas encore une validation scientifique finale.

## Fenêtres non chevauchantes

| Fenêtre | Rendement | Volatilité annualisée | Drawdown max | Récupérée dans la fenêtre |
|---|---:|---:|---:|---|
| 2024-Q2 | +3,37 % | 6,02 % | -1,97 % | oui |
| 2024-Q3 | +1,64 % | 10,82 % | -5,55 % | oui |
| 2024-Q4 | +3,88 % | 6,92 % | -1,94 % | oui |
| 2025-Q1 | -4,30 % | 9,27 % | -6,90 % | non |
| 2025-Q2 | +1,35 % | 15,94 % | -8,68 % | oui |
| 2025-Q3 | +5,13 % | 6,64 % | -1,96 % | oui |
| 2025-Q4 | +1,90 % | 8,28 % | -2,79 % | non |
| 2026-Q1 | -2,34 % | 7,66 % | -4,39 % | non |

## Première lecture descriptive

- six trimestres sont positifs et deux négatifs ;
- le rendement trimestriel observé va de -4,30 % à +5,13 % ;
- le drawdown maximal observé va de -1,94 % à -8,68 % ;
- trois fenêtres se terminent sans avoir récupéré leur sommet précédent ;
- 2025-Q2 combine la volatilité et le drawdown les plus élevés du lot, sans être le trimestre au rendement le plus faible.

Cette dernière observation est importante : rendement final et risque intra-période ne racontent pas la même chose.

## Interdiction de comparaison prématurée

La distribution simulée actuellement versionnée porte sur un horizon d'un an. Ces observations portent sur environ trois mois. Elles ne doivent donc pas être classées dans les percentiles annuels.

La prochaine étape est de produire une distribution simulée trimestrielle avec les mêmes hypothèses et le même capital initial, puis d'appliquer le diagnostic descriptif de couverture à horizon compatible.

## Preuve d'exécution

Workflow GitHub Actions : `31185040789`.

Artefact : `8996353062`.

SHA-256 de l'artefact : `e4c499d0a1b415806657581642684daa6febc7fa22c39685ac897b622ce0e73c`.
