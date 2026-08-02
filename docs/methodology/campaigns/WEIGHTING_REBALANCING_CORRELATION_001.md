# Campagne 6 — Pondérations, rééquilibrage et corrélations

## Statut

Campagne reproductible `weighting-rebalancing-correlation-001`.

Cette étude compare six structures synthétiques afin d’isoler l’effet des pondérations, du rééquilibrage et de la corrélation. Elle ne constitue ni une prévision de marché ni un conseil d’investissement.

## Protocole

- capital initial : 10 000 € ;
- versement mensuel : 300 € ;
- rendement géométrique annuel hypothétique par actif : 5 % ;
- volatilité annuelle hypothétique par actif : 22 % ;
- huit actifs synthétiques ;
- horizons : 5, 10, 20 et 30 ans ;
- graines : 104729, 130363, 155921, 181081 et 206369 ;
- 750 trajectoires par graine ;
- 3 750 trajectoires par scénario et horizon ;
- 90 000 trajectoires au total.

## Scénarios

1. équipondéré, corrélation 0,35, rééquilibrage trimestriel ;
2. équipondéré, corrélation 0,35, sans rééquilibrage ;
3. concentré à 40 % sur une ligne, corrélation 0,35, rééquilibrage trimestriel ;
4. concentré à 40 % sur une ligne, corrélation 0,35, sans rééquilibrage ;
5. équipondéré, corrélation faible 0,10, rééquilibrage trimestriel ;
6. équipondéré, corrélation forte 0,75, rééquilibrage trimestriel.

Les mêmes graines sont utilisées pour toutes les comparaisons.

## Résultats à 30 ans

| Scénario | P10 | Médiane | P90 | Drawdown médian | Plus grande pondération finale médiane |
|---|---:|---:|---:|---:|---:|
| Équipondéré, rééquilibré, corr. 0,35 | 122 854 € | 245 755 € | 502 206 € | 31,59 % | 12,50 % |
| Équipondéré, non rééquilibré, corr. 0,35 | 121 406 € | 241 154 € | 509 272 € | 32,91 % | 26,33 % |
| Concentré, rééquilibré, corr. 0,35 | 119 414 € | 240 127 € | 512 560 € | 34,30 % | 40,00 % |
| Concentré, non rééquilibré, corr. 0,35 | 119 970 € | 234 479 € | 508 864 € | 34,59 % | 36,83 % |
| Équipondéré, rééquilibré, corr. 0,10 | 163 519 € | 269 968 € | 442 757 € | 19,63 % | 12,50 % |
| Équipondéré, rééquilibré, corr. 0,75 | 89 174 € | 211 447 € | 567 024 € | 45,16 % | 12,50 % |

## Enseignements méthodologiques

Dans ce modèle, le rééquilibrage trimestriel limite fortement la dérive des pondérations. À 30 ans, la plus grande pondération médiane atteint 26,33 % sans rééquilibrage contre 12,50 % avec rééquilibrage équipondéré.

La concentration initiale augmente le drawdown médian. À corrélation identique, le scénario concentré et rééquilibré atteint 34,30 %, contre 31,59 % pour l’équipondéré rééquilibré.

La corrélation domine fortement le risque de portefeuille : le drawdown médian à 30 ans passe de 19,63 % avec une corrélation de 0,10 à 45,16 % avec une corrélation de 0,75, malgré le même nombre de lignes et les mêmes pondérations.

Ces résultats confirment qu’un futur indicateur LEYNOR ne peut pas mesurer la diversification par le seul nombre de lignes. Il doit au minimum distinguer concentration, corrélations, dérive des poids et politique de rééquilibrage.

## Limites

- actifs homogènes en rendement et volatilité ;
- corrélation constante et identique entre toutes les paires ;
- rendements lognormaux indépendants dans le temps ;
- aucun coût, impôt, spread ou friction de rééquilibrage ;
- absence de dividendes distincts, faillites et changements de régime ;
- absence de queues épaisses ;
- aucun résultat ne doit alimenter automatiquement l’IGL.

## Conclusion provisoire

La corrélation et la concentration ont un effet plus structurant que le simple nombre de lignes. Le rééquilibrage réduit la dérive des poids dans ce cadre sans friction, mais son avantage devra être réévalué avec coûts, fiscalité et seuils de tolérance.

Les résultats agrégés sont conservés dans `weighting-rebalancing-correlation-001-summary.csv`.
