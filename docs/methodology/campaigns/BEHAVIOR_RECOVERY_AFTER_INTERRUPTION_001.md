# Campagne 2 — Reprise après interruption

## Statut

Campagne reproductible `behavior-recovery-after-interruption-001`.

Cette étude compare cinq modalités de reprise après une interruption complète des versements pendant douze mois. Elle compare des scénarios synthétiques et ne constitue ni une prévision de marché ni un conseil d’investissement.

## Protocole

- capital initial : 10 000 € ;
- versement mensuel de référence : 300 € ;
- interruption : mois 25 à 36 inclus ;
- rendement géométrique annuel hypothétique : 5 % ;
- volatilité annuelle hypothétique : 15 % ;
- rendements mensuels lognormaux indépendants ;
- horizons : 5, 10, 20 et 30 ans ;
- cinq graines : 104729, 130363, 155921, 181081 et 206369 ;
- 4 000 trajectoires par graine ;
- 20 000 trajectoires par scénario et horizon ;
- 400 000 trajectoires au total.

## Scénarios

1. `immediate` : reprise à 300 € dès le mois 37 ;
2. `progressive-6` : remontée linéaire de 50 € à 300 € sur six mois ;
3. `progressive-12` : remontée linéaire de 25 € à 300 € sur douze mois ;
4. `delayed-12` : douze mois supplémentaires sans versement, puis reprise complète ;
5. `no-restart` : aucun nouveau versement après l’interruption.

Les mêmes graines et la même séquence de marché sont réutilisées pour chaque scénario, ce qui permet une comparaison appariée.

## Résultats consolidés

Les montants sont les médianes entre les cinq réplications. P10 et P90 décrivent la dispersion simulée.

| Scénario | Horizon | P10 | Médiane | P90 | Drawdown médian | Probabilité au-dessus des apports |
|---|---:|---:|---:|---:|---:|---:|
| Reprise immédiate | 5 ans | 20 586 € | 28 139 € | 39 211 € | 14,52 % | 71,75 % |
| Progressive 6 mois | 5 ans | 19 901 € | 27 325 € | 38 181 € | 15,02 % | 71,82 % |
| Progressive 12 mois | 5 ans | 19 096 € | 26 347 € | 37 117 € | 15,52 % | 71,90 % |
| Reprise retardée 12 mois | 5 ans | 17 290 € | 24 248 € | 34 775 € | 17,10 % | 71,78 % |
| Sans reprise | 5 ans | 13 745 € | 20 553 € | 30 932 € | 19,43 % | 71,90 % |
| Reprise immédiate | 10 ans | 36 604 € | 54 591 € | 82 720 € | 19,46 % | 78,30 % |
| Progressive 6 mois | 10 ans | 36 006 € | 53 603 € | 81 171 € | 19,63 % | 78,38 % |
| Progressive 12 mois | 10 ans | 35 212 € | 52 455 € | 79 418 € | 19,85 % | 78,50 % |
| Reprise retardée 12 mois | 10 ans | 33 579 € | 49 906 € | 75 521 € | 20,91 % | 78,62 % |
| Sans reprise | 10 ans | 13 912 € | 25 064 € | 44 768 € | 28,98 % | 79,35 % |
| Reprise immédiate | 20 ans | 71 624 € | 124 054 € | 228 143 € | 27,08 % | 86,15 % |
| Progressive 6 mois | 20 ans | 70 957 € | 122 710 € | 225 063 € | 27,13 % | 86,05 % |
| Progressive 12 mois | 20 ans | 70 142 € | 121 090 € | 221 887 € | 27,18 % | 85,98 % |
| Reprise retardée 12 mois | 20 ans | 68 248 € | 117 643 € | 214 555 € | 27,56 % | 85,72 % |
| Sans reprise | 20 ans | 15 657 € | 35 831 € | 85 093 € | 38,34 % | 87,08 % |
| Reprise immédiate | 30 ans | 117 492 € | 228 306 € | 488 926 € | 33,07 % | 90,92 % |
| Progressive 6 mois | 30 ans | 116 489 € | 226 177 € | 483 565 € | 33,06 % | 90,95 % |
| Progressive 12 mois | 30 ans | 115 484 € | 223 831 € | 477 516 € | 32,99 % | 90,92 % |
| Reprise retardée 12 mois | 30 ans | 113 288 € | 218 422 € | 462 099 € | 33,11 % | 90,88 % |
| Sans reprise | 30 ans | 18 309 € | 52 138 € | 150 243 € | 43,68 % | 91,38 % |

## Lecture des écarts médians

Par rapport à la reprise immédiate, l’écart médian est :

| Scénario | 5 ans | 10 ans | 20 ans | 30 ans |
|---|---:|---:|---:|---:|
| Progressive 6 mois | -814 € | -988 € | -1 344 € | -2 129 € |
| Progressive 12 mois | -1 792 € | -2 136 € | -2 964 € | -4 475 € |
| Reprise retardée 12 mois | -3 891 € | -4 685 € | -6 411 € | -9 884 € |
| Sans reprise | -7 586 € | -29 527 € | -88 223 € | -176 168 € |

Dans les hypothèses retenues, la hiérarchie des médianes est stable sur les quatre horizons et les cinq graines : reprise immédiate, reprise progressive sur six mois, reprise progressive sur douze mois, reprise retardée, puis absence de reprise.

## Interprétation méthodologique

La campagne montre que la durée et l’intensité de la reprise modifient fortement le capital final simulé. Elle ne démontre pas qu’une reprise immédiate est toujours la meilleure décision réelle : une personne peut avoir besoin de reconstituer une épargne de précaution, de réduire une dette ou de stabiliser ses revenus avant de reprendre.

La métrique « probabilité au-dessus des apports » ne doit pas être utilisée pour comparer directement les scénarios, car le montant total des apports diffère. Un scénario sans reprise possède un seuil d’apports beaucoup plus faible. La valeur finale, les distributions, les drawdowns et la capacité financière doivent être interprétés conjointement.

La mesure de récupération représente le retour au niveau de portefeuille observé juste avant l’interruption. Dans ce modèle, sa médiane est souvent d’un mois parmi les trajectoires récupérées ; elle est donc peu discriminante et devra être complétée par une mesure de récupération du déficit relatif au scénario de référence.

## Limites

- hypothèses synthétiques et non calibrées sur plusieurs régimes historiques ;
- indépendance des rendements mensuels ;
- absence de frais, fiscalité et inflation ;
- aucune dette ni épargne de précaution ;
- aucune perte de revenu ou dépense imprévue explicite ;
- calendriers de reprise déterministes ;
- absence de contributions variables selon le marché ;
- la campagne ne mesure pas le bien-être, le risque de liquidité ou la soutenabilité budgétaire ;
- aucun résultat ne doit alimenter automatiquement l’IGL.

## Conclusion provisoire

Sous ces hypothèses uniquement, reprendre plus tôt et plus rapidement produit une distribution de valeur finale supérieure. Cette conclusion est provisoire. Elle doit être confrontée aux campagnes de résilience financière, aux retraits forcés, aux revenus irréguliers et aux différentes réserves de liquidité avant toute traduction produit.

Les résultats détaillés par graine sont conservés dans `behavior-recovery-after-interruption-001-replications.csv`.
