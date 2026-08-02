# Campagne 3 — Résilience financière

## Statut

Campagne reproductible `financial-resilience-001`. Cette étude compare des réserves de 0, 3, 6 et 12 mois face à quatre chocs synthétiques. Elle ne constitue ni une prévision ni un conseil d’investissement.

## Protocole

- capital initial : 10 000 € ;
- versement mensuel : 300 € ;
- dépenses essentielles mensuelles : 2 000 € ;
- choc à partir du mois 25 ;
- rendement géométrique annuel hypothétique : 5 % ;
- volatilité annuelle hypothétique : 15 % ;
- horizons : 5, 10, 20 et 30 ans ;
- cinq graines indépendantes ;
- 2 000 trajectoires par réplication ;
- 10 000 trajectoires par combinaison ;
- 640 000 trajectoires au total.

## Chocs

1. perte de revenus de 3 mois : déficit mensuel de 1 200 € ;
2. perte de revenus de 6 mois : déficit mensuel de 1 200 € ;
3. dépense imprévue unique de 6 000 € ;
4. choc combiné : perte de revenus de 6 mois et dépense de 6 000 €.

La réserve absorbe le choc en priorité. Le reliquat est retiré du portefeuille. Les versements sont suspendus pendant la perte de revenus.

## Résultats — choc combiné à 20 ans

| Réserve | P10 | Médiane | P90 | Retrait forcé | Retrait médian | Drawdown médian |
|---:|---:|---:|---:|---:|---:|---:|
| 0 mois | 61 206 € | 102 039 € | 178 785 € | 100,00 % | 13 200 € | 72,02 % |
| 3 mois | 66 684 € | 114 600 € | 205 535 € | 100,00 % | 7 200 € | 41,14 % |
| 6 mois | 72 245 € | 127 140 € | 230 685 € | 100,00 % | 1 200 € | 27,26 % |
| 12 mois | 73 213 € | 129 310 € | 236 755 € | 0,00 % | 0 € | 27,01 % |

## Interprétation méthodologique

La réserve réduit mécaniquement le recours au portefeuille lorsque le choc est inférieur ou égal aux liquidités disponibles. Elle ne crée pas de rendement et son coût d’opportunité n’est pas modélisé ici. Les résultats doivent donc être lus comme une étude de liquidité et de continuité d’investissement, pas comme une optimisation universelle du montant de réserve.

La probabilité de retrait forcé et le montant retiré sont des métriques centrales. La valeur finale seule ne suffit pas : une réserve plus élevée protège contre la vente forcée, mais une comparaison complète devra intégrer le rendement éventuel de la réserve, l’inflation, la dette et la soutenabilité budgétaire.

## Limites

- Hypothèses synthétiques non calibrées sur plusieurs régimes historiques.
- Rendements mensuels indépendants et lognormaux.
- Absence de frais, fiscalité et inflation.
- Réserve détenue hors portefeuille et non rémunérée.
- Chocs déterministes et absence de dette.
- Aucune conclusion ne doit alimenter automatiquement l’IGL.

## Conclusion provisoire

Sous ces hypothèses, une réserve suffisante diminue ou élimine les retraits forcés lors des chocs étudiés. Cette observation doit être confrontée à des scénarios historiques, à des chocs aléatoires, à l’inflation, aux frais et au coût d’opportunité avant toute traduction produit ou toute composante de l’IGL.
