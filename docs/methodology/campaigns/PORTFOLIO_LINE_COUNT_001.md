# Campagne 5 — Nombre de lignes

## Statut

Campagne reproductible `portfolio-line-count-001`.

Cette étude isole l’effet du nombre de lignes dans un portefeuille équipondéré synthétique. Elle compare des scénarios et ne constitue ni une prévision ni un conseil d’investissement.

## Protocole

- nombres de lignes : 2, 3, 4, 5, 8, 10, 15 et 20 ;
- capital initial : 10 000 € ;
- versement mensuel : 300 € ;
- rendement géométrique annuel hypothétique : 5 % ;
- volatilité annuelle individuelle : 22 % ;
- corrélation constante entre lignes : 0,25 ;
- portefeuille équipondéré ;
- horizons : 5, 10, 20 et 30 ans ;
- graines : 104729, 130363, 155921, 181081 et 206369 ;
- 1 500 trajectoires par réplication ;
- 240 000 trajectoires au total.

La volatilité synthétique du portefeuille est calculée par :

`σ_portefeuille = σ_actif × sqrt((1 + (n - 1) × ρ) / n)`

## Résultats consolidés

Les montants sont les médianes entre les cinq réplications.

| Lignes | Horizon | P10 | Médiane | P90 | Drawdown médian | Drawdown P90 |
|---:|---:|---:|---:|---:|---:|---:|
| 2 | 5 | 22 421 € | 31 947 € | 46 007 € | 15,56 % | 24,07 % |
| 2 | 10 | 36 484 € | 58 733 € | 95 963 € | 22,80 % | 33,93 % |
| 2 | 20 | 66 059 € | 132 870 € | 254 452 € | 32,71 % | 46,04 % |
| 2 | 30 | 105 320 € | 242 735 € | 545 358 € | 39,70 % | 54,71 % |
| 3 | 5 | 23 537 € | 31 872 € | 44 602 € | 13,16 % | 20,56 % |
| 3 | 10 | 38 913 € | 58 574 € | 91 378 € | 19,72 % | 29,78 % |
| 3 | 20 | 72 712 € | 132 695 € | 243 267 € | 28,62 % | 40,56 % |
| 3 | 30 | 118 589 € | 244 824 € | 519 230 € | 34,74 % | 48,08 % |
| 4 | 5 | 24 177 € | 31 903 € | 43 807 € | 11,89 % | 18,67 % |
| 4 | 10 | 40 411 € | 58 467 € | 88 797 € | 18,10 % | 27,27 % |
| 4 | 20 | 75 742 € | 133 191 € | 235 458 € | 26,41 % | 37,50 % |
| 4 | 30 | 122 238 € | 245 037 € | 503 655 € | 32,12 % | 44,71 % |
| 5 | 5 | 24 668 € | 31 984 € | 43 151 € | 11,04 % | 17,45 % |
| 5 | 10 | 41 221 € | 58 465 € | 87 052 € | 16,97 % | 25,76 % |
| 5 | 20 | 77 889 € | 133 166 € | 229 761 € | 24,94 % | 35,60 % |
| 5 | 30 | 131 292 € | 246 428 € | 500 036 € | 30,12 % | 42,13 % |
| 8 | 5 | 25 393 € | 31 917 € | 42 062 € | 9,63 % | 15,26 % |
| 8 | 10 | 42 637 € | 58 482 € | 83 723 € | 15,06 % | 23,08 % |
| 8 | 20 | 81 148 € | 133 577 € | 220 370 € | 22,38 % | 32,01 % |
| 8 | 30 | 138 563 € | 247 247 € | 480 882 € | 27,23 % | 38,50 % |
| 10 | 5 | 25 616 € | 31 907 € | 41 633 € | 9,23 % | 14,66 % |
| 10 | 10 | 43 158 € | 58 529 € | 82 506 € | 14,48 % | 22,22 % |
| 10 | 20 | 82 300 € | 133 885 € | 217 088 € | 21,59 % | 30,94 % |
| 10 | 30 | 140 858 € | 247 613 € | 487 453 € | 26,55 % | 37,42 % |
| 15 | 5 | 25 933 € | 31 931 € | 41 028 € | 8,67 % | 13,78 % |
| 15 | 10 | 43 886 € | 58 464 € | 80 871 € | 13,65 % | 20,99 % |
| 15 | 20 | 84 032 € | 133 423 € | 212 608 € | 20,44 % | 29,34 % |
| 15 | 30 | 144 951 € | 247 476 € | 459 754 € | 24,95 % | 35,25 % |
| 20 | 5 | 26 115 € | 31 947 € | 40 748 € | 8,40 % | 13,36 % |
| 20 | 10 | 44 224 € | 58 448 € | 80 069 € | 13,27 % | 20,36 % |
| 20 | 20 | 84 921 € | 133 315 € | 210 237 € | 19,90 % | 28,58 % |
| 20 | 30 | 147 333 € | 247 450 € | 464 190 € | 24,36 % | 34,28 % |

## Lecture méthodologique

Le passage de 2 à 5 lignes réduit fortement la dispersion défavorable et les drawdowns. Les gains marginaux continuent ensuite, mais ralentissent progressivement entre 10, 15 et 20 lignes.

À 30 ans, le drawdown médian passe de 39,70 % avec 2 lignes à 24,36 % avec 20 lignes.

Cette campagne n’identifie pas un nombre « optimal » universel. Le résultat dépend directement de la corrélation, des pondérations, des coûts, de la qualité des actifs et des concentrations sectorielles.

## Limites

- rendements synthétiques lognormaux indépendants dans le temps ;
- corrélation constante ;
- volatilité identique pour toutes les lignes ;
- portefeuille équipondéré et rééquilibré implicitement ;
- aucun frais, impôt, inflation ou coût de transaction ;
- aucune faillite, suspension ou liquidité dégradée ;
- aucune concentration sectorielle variable ;
- aucun résultat ne doit alimenter automatiquement l’IGL.

## Conclusion provisoire

Sous les hypothèses retenues, l’essentiel de la réduction de risque apparaît dans les premières lignes supplémentaires, puis les gains marginaux diminuent. Une future campagne doit tester les pondérations inégales, la concentration sectorielle, les corrélations instables et les coûts de rééquilibrage.
