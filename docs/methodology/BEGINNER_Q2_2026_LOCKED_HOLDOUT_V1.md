# Holdout verrouillé beginner — 2026-Q2 v1

## Statut

Préenregistré avant lecture des résultats de marché de la fenêtre.

## Fenêtre verrouillée

- début demandé : `2026-04-01` ;
- fin demandée : `2026-06-30` ;
- piste : `exact` ;
- instruments : WPEA.PA, PAEJ.PA, CASH ;
- allocation : 50 % WPEA, 15 % PAEJ, 35 % CASH ;
- capital initial : 10 000 € ;
- frais : 0 pb ;
- apports : aucun ;
- rééquilibrage : aucun.

Les dates effectives seront les première et dernière dates de marché communes incluses dans la fenêtre demandée.

## Distribution simulée verrouillée

La confrontation utilisera exclusivement la distribution trimestrielle déjà fusionnée dans `main` avant cette expérience :

- 10 000 trajectoires ;
- horizon : 3 mois ;
- graine : `20260807` ;
- rendement annuel agrégé : 4,5 % ;
- volatilité annuelle agrégée : 10 % ;
- p05 valeur finale : 9 297,200064 € ;
- p25 : 9 759,226542 € ;
- médiane : 10 092,467876 € ;
- p75 : 10 454,323804 € ;
- p95 : 10 952,850518 € ;
- drawdown médian : 2,332467 % ;
- drawdown p95 : 7,868558 % ;
- drawdown maximum simulé : 16,514549 %.

Aucun de ces paramètres ou seuils ne peut être modifié après lecture du holdout sans créer une nouvelle expérience.

## Métriques préenregistrées

Le replay calculera :

- valeur finale ;
- rendement cumulé ;
- rendement annualisé ;
- volatilité annualisée ;
- drawdown maximal ;
- statut de récupération ;
- position descriptive de la valeur finale dans p05/p25/médiane/p75/p95 ;
- position descriptive du drawdown dans médiane/p95/maximum.

## Preuves adverses

Toute valeur finale sous p05 ou au-dessus de p95 sera conservée comme observation extrême.

Tout drawdown au-dessus du p95 simulé sera conservé comme preuve adverse descriptive. Un dépassement du maximum simulé sera conservé séparément et déclenchera une investigation prioritaire.

Aucun résultat défavorable ne pourra être supprimé ou reclassé par modification rétroactive des seuils.

## Source de données

Pour ce pilote de développement, Yahoo Finance Chart reste classé `development-only` et `validationEligibleSource: false`.

Le holdout teste donc l'absence d'ajustement postérieur et la généralisation descriptive du modèle, mais ne constitue pas encore une validation scientifique finale de la source.

## Interdictions

- ne pas lire ni utiliser 2026-Q2 pour choisir les paramètres du modèle avant l'exécution du holdout ;
- ne pas modifier la distribution trimestrielle après observation ;
- ne pas remplacer un instrument exact par un proxy ;
- ne pas transformer le résultat en conseil d'investissement ;
- ne pas produire de taux de réussite ou de verdict calibré à partir d'une seule fenêtre.
