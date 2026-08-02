# Campagne factorielle étendue 001

## Objectif

Étendre le pilote factoriel afin de mesurer conjointement la sensibilité des résultats au comportement, à la réserve de liquidité, au nombre de lignes, à la volatilité individuelle, à la corrélation, à l'intensité du choc et à l'horizon.

## Plan d'expérience

- comportements : versements réguliers et interruption de douze mois ;
- réserves : 0 et 6 mois de versements ;
- nombre de lignes : 5 et 15 ;
- volatilités individuelles : 12 % et 20 % ;
- corrélations : 0,10, 0,35 et 0,75 ;
- chocs ponctuels : 0 €, 1 800 €, 3 600 € et 7 200 € ;
- horizons : 10, 20 et 30 ans ;
- cinq graines indépendantes ;
- 250 trajectoires par réplication.

Le plan complet représente 2 × 2 × 2 × 2 × 3 × 4 × 3 × 5 = 2 880 réplications, soit 720 000 trajectoires.

## Métriques

- P10, médiane et P90 de la valeur finale ;
- drawdown maximal médian ;
- retrait forcé médian ;
- durée médiane de récupération après choc ;
- effets principaux agrégés par niveau de facteur.

## Garde-fous

Les rendements sont synthétiques et indépendants dans le temps. La corrélation est équicorrélée et constante. Les frais, impôts, inflation, queues épaisses, crises de régime et coûts de rééquilibrage ne sont pas modélisés.

Les résultats comparent des scénarios. Ils ne constituent ni une prévision, ni une recommandation, ni une preuve suffisante pour fixer une pondération de l'IGL.

## Critère de validation

La campagne est techniquement valide si toutes les combinaisons attendues sont produites, si chaque cellule est reproductible avec une graine fixe et si les tests de cohérence passent. Une conclusion méthodologique exige ensuite une analyse de stabilité entre graines et niveaux de facteurs.
