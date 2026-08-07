# Pilote historique `beginner` — fenêtres glissantes et sensibilité aux coûts

## Statut

Résultat de développement uniquement. Source Yahoo Finance non admissible à la validation scientifique finale.

Workflow : `31182264953`  
Artefact : `sha256:381aa9f2280c7e93f677b45bde260c3c4217b82b5d83170e3b6824a171f55488`

## Référence simulée

Le pilote Monte Carlo de référence contient 10 000 trajectoires sur un an :

- valeur finale médiane : 10 407,21 € ;
- p05 : 8 787,00 € ;
- p95 : 12 200,97 € ;
- drawdown médian : 6,74 % ;
- drawdown p95 : 15,82 %.

## Résultats historiques sans frais

| Fenêtre | Rendement | Volatilité ann. | Drawdown max | Récupération |
|---|---:|---:|---:|---|
| 2024-Q2 | +4,64 % | 8,68 % | 7,23 % | non observée dans la fenêtre |
| 2024-Q3 | +3,64 % | 11,26 % | 14,30 % | non observée dans la fenêtre |
| 2024-Q4 | +7,00 % | 10,35 % | 14,19 % | 167 jours |
| 2025-Q1 | +4,84 % | 10,42 % | 13,85 % | 166 jours |
| 2025-Q2 | +7,78 % | 10,41 % | 8,68 % | 33 jours |
| 2025-Q3 | +19,42 % | 8,41 % | 4,61 % | 16 jours |

## Lecture par rapport à la simulation

Les six valeurs finales historiques restent dans l’intervalle p05–p95 du pilote simulé. Le drawdown le plus sévère observé, 14,30 %, reste inférieur au drawdown p95 simulé de 15,82 %.

Ce constat est compatible avec la distribution simulée mais ne la valide pas : les fenêtres se chevauchent, la source reste de développement et six observations ne suffisent pas pour calibrer un taux de couverture.

La fenêtre 2025-Q3 est importante : avec +19,42 %, elle se situe très au-dessus de la médiane simulée mais reste sous le p95. Le moteur doit donc conserver une distribution suffisamment large pour ne pas confondre une année très favorable avec une anomalie.

À l’inverse, 2024-Q3 montre un rendement modeste (+3,64 %) accompagné d’un drawdown de 14,30 %. Cela confirme que le rendement final seul ne décrit pas correctement le risque vécu pendant la période.

## Sensibilité aux coûts

Avec 50 pb de coûts de transaction appliqués aux actifs négociés à l’entrée, et `CASH` explicitement exempt, la baisse de rendement est comprise entre environ 0,34 et 0,39 point de pourcentage selon la fenêtre.

Dans ce pilote sans rééquilibrage ni apports, cette sensibilité reste faible mais non nulle. Elle ne permet aucune conclusion sur une stratégie à rotation fréquente, où l’accumulation des coûts serait différente.

## Point méthodologique corrigé

Le moteur facturait auparavant un coût à tout ticker, y compris une poche `CASH` modélisée comme actif à prix 1. Ce comportement n’affectait pas les expériences à coût nul mais aurait biaisé toute étude avec frais. Le moteur accepte désormais des tickers explicitement exempts de coûts, et ce comportement est testé.

## Conclusion provisoire

Les premiers replays historiques ne produisent pas de réfutation évidente du pilote `beginner`. Ils montrent toutefois une forte dépendance de la combinaison rendement/drawdown à la fenêtre choisie, ce qui justifie la poursuite sur davantage de périodes et surtout sur des fenêtres indépendantes ou des régimes de marché distincts.

Aucun verdict scientifique n’est attribué à ce stade.
