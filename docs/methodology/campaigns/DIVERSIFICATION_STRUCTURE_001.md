# Campagne 4 — Diversification

## Statut

Campagne reproductible `diversification-structure-001`.

Cette étude compare des structures synthétiques de portefeuille à rendement géométrique hypothétique identique. Elle ne compare pas de titres réels et ne constitue ni une prévision ni un conseil.

## Protocole

- capital initial : 10 000 € ;
- versement mensuel : 300 € ;
- rendement géométrique annuel hypothétique : 5 % ;
- volatilité annuelle individuelle hypothétique : 25 % ;
- corrélation moyenne explicite selon le scénario ;
- horizons : 5, 10, 20 et 30 ans ;
- cinq graines indépendantes ;
- 1 500 trajectoires par réplication ;
- 7 500 trajectoires par scénario et horizon ;
- 180 000 trajectoires au total.

## Modèle de risque

La volatilité de portefeuille est calculée pour un portefeuille équipondéré : `σp = σa × sqrt(ρ + (1−ρ)/n)`. Cette relation est une hypothèse synthétique contrôlée, pas une estimation empirique de marché.

## Résultats consolidés

Les valeurs sont les médianes entre les cinq réplications.

| Structure | Horizon | Vol. annuelle | P10 | Médiane | P90 | Drawdown médian | Au-dessus des apports |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2 actions | 5 ans | 20,54 % | 20 909 € | 31 020 € | 48 533 € | 19,80 % | 62,3 % |
| 2 actions | 10 ans | 20,54 % | 33 101 € | 56 010 € | 103 005 € | 28,56 % | 67,5 % |
| 2 actions | 20 ans | 20,54 % | 57 488 € | 119 258 € | 273 438 € | 39,94 % | 75,1 % |
| 2 actions | 30 ans | 20,54 % | 84 379 € | 204 853 € | 573 477 € | 47,70 % | 77,7 % |
| 5 actions | 5 ans | 16,58 % | 22 979 € | 31 741 € | 45 510 € | 14,51 % | 68,6 % |
| 5 actions | 10 ans | 16,58 % | 37 764 € | 58 374 € | 95 499 € | 21,48 % | 75,4 % |
| 5 actions | 20 ans | 16,58 % | 69 809 € | 128 761 € | 251 751 € | 30,95 % | 83,2 % |
| 5 actions | 30 ans | 16,58 % | 110 067 € | 229 822 € | 533 391 € | 37,47 % | 87,6 % |
| 8 actions | 5 ans | 14,66 % | 24 010 € | 32 049 € | 44 053 € | 12,02 % | 72,5 % |
| 8 actions | 10 ans | 14,66 % | 40 268 € | 59 344 € | 91 734 € | 18,01 % | 79,1 % |
| 8 actions | 20 ans | 14,66 % | 76 779 € | 132 819 € | 239 569 € | 26,40 % | 86,9 % |
| 8 actions | 30 ans | 14,66 % | 124 230 € | 241 084 € | 509 827 € | 32,26 % | 91,6 % |
| 20 actions | 5 ans | 13,40 % | 24 731 € | 32 224 € | 43 113 € | 10,37 % | 75,3 % |
| 20 actions | 10 ans | 13,40 % | 41 948 € | 59 933 € | 89 245 € | 15,80 % | 81,8 % |
| 20 actions | 20 ans | 13,40 % | 81 722 € | 135 284 € | 232 257 € | 23,43 % | 89,9 % |
| 20 actions | 30 ans | 13,40 % | 134 223 € | 248 473 € | 493 200 € | 28,83 % | 93,3 % |
| 8 actions même secteur | 5 ans | 20,82 % | 20 760 € | 30 965 € | 48 749 € | 20,20 % | 62,1 % |
| 8 actions même secteur | 10 ans | 20,82 % | 32 769 € | 55 827 € | 103 544 € | 29,07 % | 67,1 % |
| 8 actions même secteur | 20 ans | 20,82 % | 56 760 € | 118 545 € | 274 719 € | 40,57 % | 74,3 % |
| 8 actions même secteur | 30 ans | 20,82 % | 82 851 € | 203 077 € | 575 862 € | 48,36 % | 76,9 % |
| ETF large — proxy | 5 ans | 12,69 % | 25 135 € | 32 319 € | 42 566 € | 9,51 % | 76,4 % |
| ETF large — proxy | 10 ans | 12,69 % | 42 918 € | 60 223 € | 87 752 € | 14,53 % | 83,8 % |
| ETF large — proxy | 20 ans | 12,69 % | 84 513 € | 136 593 € | 227 963 € | 21,73 % | 91,3 % |
| ETF large — proxy | 30 ans | 12,69 % | 140 378 € | 252 357 € | 483 275 € | 26,76 % | 94,8 % |

## Observations méthodologiques

- Dans ce modèle, augmenter le nombre de lignes réduit surtout la dispersion défavorable et les drawdowns.
- Le gain marginal diminue : le passage de 2 à 5 lignes est plus important que celui de 20 lignes au proxy ETF large.
- Huit lignes concentrées dans un même secteur restent proches du risque d’un portefeuille de deux actions, malgré un nombre de lignes supérieur.
- Le nombre de lignes ne suffit donc pas : la corrélation et la concentration sectorielle doivent être mesurées séparément.
- Les médianes augmentent légèrement quand la volatilité diminue, à rendement géométrique paramétré identique, en raison de l’effet de volatilité sur les trajectoires composées.

## Limites

- paramètres synthétiques non calibrés sur des actifs réels ;
- corrélations constantes ;
- absence de frais, fiscalité, inflation et rééquilibrage ;
- équipondération uniquement ;
- aucun risque de défaut individuel ;
- le proxy ETF n’est pas un ETF réel ;
- aucune conclusion ne doit alimenter automatiquement l’IGL.

## Conclusion provisoire

Sous ces hypothèses, la diversification réduit les pertes de queue et les drawdowns, mais le nombre de lignes n’est pas une mesure suffisante : une forte corrélation sectorielle peut annuler une grande partie du bénéfice. Les campagnes suivantes doivent isoler le nombre de lignes, la concentration sectorielle, les pondérations et le rééquilibrage.

Les résultats détaillés par graine sont conservés dans `diversification-structure-001-replications.csv`.
