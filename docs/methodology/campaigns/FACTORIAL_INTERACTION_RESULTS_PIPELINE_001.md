# Pipeline des résultats d’interactions factorielles 001

## Problème corrigé

La campagne fusionnée en PR #219 a versionné les effets principaux agrégés et leur synthèse méthodologique, mais pas les 2 880 observations cellule-par-graine nécessaires pour recalculer indépendamment les interactions et la stabilité locale.

Il serait méthodologiquement incorrect de reconstruire ces observations à partir des seules médianes agrégées. Cette PR ajoute donc une source d’exécution déterministe qui régénère les observations depuis le moteur et la configuration explicite de la campagne.

## Configuration canonique

- 2 comportements ;
- 2 niveaux de réserve ;
- 2 nombres de lignes ;
- 2 volatilités ;
- 3 corrélations ;
- 4 intensités de choc ;
- 3 horizons ;
- 5 graines ;
- 250 trajectoires par réplication.

Total : 2 880 réplications et 720 000 trajectoires.

## Sorties calculées

Le pipeline produit :

1. les observations détaillées de chaque réplication ;
2. 576 cellules factorielles contenant chacune cinq graines ;
3. la dispersion relative et la classe de stabilité de chaque cellule ;
4. le nombre de graines supplémentaires recommandé, plafonné à 25 graines totales par cellule ;
5. six interactions prioritaires calculées par différence de différences ;
6. un classement par amplitude normalisée absolue.

## Interactions prioritaires

- comportement × réserve ;
- comportement × intensité du choc ;
- réserve × intensité du choc ;
- corrélation × volatilité ;
- corrélation × nombre de lignes ;
- horizon × comportement.

## Exécution

La fonction `runCampaign001Analysis()` exécute la configuration canonique. Les tests utilisent la même structure factorielle avec seulement deux trajectoires par réplication afin de valider rapidement l’exhaustivité, le regroupement et la reproductibilité sans transformer la CI en campagne de calcul longue.

L’exécution exhaustive doit être déclenchée explicitement dans une étape dédiée, puis ses sorties doivent être versionnées avec :

- la configuration complète ;
- le SHA du moteur ;
- la date d’exécution ;
- les graines ;
- les résultats cellule-par-graine ;
- le classement des interactions ;
- le plan de réplications ciblées.

## Garde-fous

- aucune donnée brute n’est déduite d’un résumé agrégé ;
- aucune cellule manquante n’est remplacée par une valeur fabriquée ;
- aucune interaction n’est transformée automatiquement en poids de l’IGL ;
- toute conclusion reste limitée au modèle synthétique ;
- les résultats ne constituent ni une prévision ni une recommandation.

## Étape suivante

Exécuter la configuration canonique de 720 000 trajectoires, versionner les observations et les analyses, puis relancer uniquement les cellules classées `unstable` ou `watch` selon le budget expérimental documenté.
