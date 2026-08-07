# Première confrontation simulation / historique — preset beginner

## Statut

`development-comparison-only`

Cette confrontation relie le pilote Monte Carlo déjà versionné au premier replay historique exécuté dans GitHub Actions. La source historique est classée développement et n’est pas éligible à la validation scientifique finale.

## Fenêtre historique

- fenêtre demandée : 2 janvier 2025 → 2 janvier 2026 ;
- fenêtre commune effectivement disponible : 2 janvier 2025 → 24 décembre 2025 ;
- 251 observations communes ;
- allocation replay : WPEA 50 %, PAEJ 15 %, cash 35 % ;
- zéro apport, zéro frais, aucun rééquilibrage.

## Résultats simulés de référence

Pilote : 10 000 trajectoires, horizon 1 an, graine `20260807`, rendement annuel agrégé 4,5 %, volatilité annuelle agrégée 10 %.

| Mesure simulée | Valeur |
|---|---:|
| Valeur finale p05 | 8 787,00 € |
| Valeur finale médiane | 10 407,21 € |
| Valeur finale p95 | 12 200,97 € |
| Rendement médian vs capital initial | +4,07 % |
| Drawdown médian | 6,74 % |
| Drawdown p95 | 15,82 % |

## Résultats historiques observés

| Mesure historique | Valeur |
|---|---:|
| Valeur finale | 10 484,20 € |
| Rendement cumulé | +4,84 % |
| Rendement annualisé | +4,97 % |
| Volatilité annualisée | 10,42 % |
| Drawdown maximal | 13,85 % |
| Creux maximal | 9 avril 2025 |
| Récupération | 22 septembre 2025 |
| Durée creux → récupération | 166 jours |
| Durée sous le sommet précédent | 215 jours |

## Première lecture

La valeur finale historique, 10 484,20 €, se situe entre la médiane simulée (10 407,21 €) et le p75 simulé (11 132,32 €). Elle est seulement environ 0,74 % au-dessus de la médiane simulée.

Le rendement historique cumulé (+4,84 %) est proche du rendement médian simulé (+4,07 %), avec un écart d’environ +0,77 point de pourcentage.

La volatilité historique annualisée (10,42 %) est également proche de l’hypothèse agrégée du pilote (10 %), soit environ +0,42 point.

En revanche, le drawdown historique maximal (13,85 %) est nettement supérieur au drawdown médian simulé (6,74 %), avec un écart d’environ +7,11 points. Il reste toutefois inférieur au p95 simulé de drawdown (15,82 %), d’environ 1,97 point.

## Ce que cela signifie à ce stade

Ce premier replay ne réfute pas immédiatement la distribution simulée : la valeur finale et le rendement observés se situent dans sa zone centrale, tandis que le drawdown observé se situe dans une zone de risque plus sévère mais toujours couverte par la distribution simulée publiée.

Cette conclusion est **strictement descriptive**. Une seule fenêtre historique ne permet pas de valider le modèle, de calibrer un score ou de conclure à un pouvoir prédictif.

## Preuve d’exécution

- workflow GitHub Actions : run `31178690645` ;
- artefact : `8993853657` ;
- digest : `sha256:e09802a294570eb7a74d59bcaff03b44add62de7f686e06ba09a06d98c72fda3`.

## Prochaines étapes

1. reproduire cette confrontation sur plusieurs fenêtres indépendantes ;
2. ajouter des coûts réalistes et tester leur sensibilité ;
3. remplacer la source de développement par une source admissible à la validation scientifique ;
4. construire un snapshot simulé qui expose directement volatilité, drawdown et récupération selon des définitions strictement compatibles ;
5. seulement ensuite envisager une calibration de critères de confirmation, fragilisation ou réfutation.
