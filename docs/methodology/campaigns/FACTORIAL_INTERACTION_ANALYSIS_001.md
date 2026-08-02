# Analyse factorielle des interactions 001

## Objectif

Cette étape transforme les résultats de la campagne factorielle étendue en un protocole d'analyse reproductible. Elle ne crée aucune pondération de l'IGL.

Le module ajouté permet de :

- mesurer les interactions à deux facteurs par différence de différences ;
- normaliser l'amplitude des interactions afin de les classer sans confondre unité monétaire et importance relative ;
- mesurer la dispersion entre graines pour chaque cellule factorielle ;
- classer les cellules en `stable`, `watch` ou `unstable` ;
- recommander des graines supplémentaires uniquement pour les cellules insuffisamment robustes.

## Seuils de stabilité

Les seuils initiaux sont explicites et conservateurs :

- stable : dispersion relative inférieure ou égale à 8 % ;
- à surveiller : dispersion supérieure à 8 % et inférieure ou égale à 15 % ;
- instable : dispersion supérieure à 15 %.

Ces seuils sont des règles de contrôle expérimental, pas des scores utilisateur. Ils devront être réévalués après plusieurs campagnes indépendantes.

## Réplications ciblées

Le nombre de graines supplémentaires est estimé avec l'approximation classique selon laquelle l'incertitude Monte Carlo diminue proportionnellement à `1 / sqrt(n)`.

La recommandation est plafonnée à 25 graines au total pour éviter une croissance incontrôlée des coûts de calcul. Une cellule déjà stable ne reçoit aucune réplication supplémentaire.

## Interactions

Pour deux facteurs A et B, l'interaction est calculée ainsi :

`(A_haut - A_bas lorsque B est haut) - (A_haut - A_bas lorsque B est bas)`

Une interaction nulle signifie que l'effet mesuré de A ne dépend pas du niveau de B dans les cellules comparées. Une interaction non nulle signale une dépendance dans le modèle, sans démontrer une causalité réelle hors simulation.

Les premières paires prioritaires sont :

1. comportement × réserve ;
2. comportement × intensité du choc ;
3. réserve × intensité du choc ;
4. corrélation × volatilité ;
5. corrélation × nombre de lignes ;
6. horizon × comportement.

## Garde-fous

- aucune interaction ne devient automatiquement une composante ou une pondération de l'IGL ;
- une cellule manquante provoque une erreur au lieu d'une valeur fabriquée ;
- les métriques doivent être finies et vérifiables ;
- les résultats doivent être comparés sur plusieurs graines et plusieurs campagnes ;
- les données synthétiques ne constituent ni une prévision ni une recommandation.

## Étape suivante

Exécuter cet analyseur sur les observations cellule-par-graine de la campagne 001, produire le classement des interactions et relancer uniquement les cellules classées instables. Les résultats consolidés devront ensuite être validés sur un plan factoriel indépendant avant toute calibration expérimentale de l'IGL.
