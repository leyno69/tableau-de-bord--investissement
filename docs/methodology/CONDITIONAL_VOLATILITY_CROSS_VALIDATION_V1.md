# Validation temporelle de volatilité conditionnelle — v1

## Objectif

Tester si une variance conditionnelle EWMA améliore la qualité prédictive rétrospective par rapport à une volatilité mensuelle constante, sans modifier le moteur de production.

## Protocole

Les mêmes folds temporels que pour le test Student-t sont utilisés. La moyenne et la variance initiale sont estimées sur l’entraînement. Le paramètre EWMA `lambda` est choisi uniquement sur l’entraînement parmi `[0.90, 0.94, 0.97]` selon la log-vraisemblance négative.

Sur la période de validation, la variance évolue uniquement à partir des rendements précédemment observés ; aucun réajustement de moyenne, de variance initiale ou de lambda n’est autorisé.

## Règle de décision

Une amélioration EWMA répétée sur plusieurs folds permet uniquement de construire un prototype expérimental de simulation à volatilité conditionnelle. Elle ne permet pas de modifier directement le moteur LEYNOR de production.

## Limites

EWMA ne modélise ni asymétrie, ni sauts, ni corrélation dynamique inter-actifs. Les périodes utilisées ont déjà été observées dans d’autres analyses et ne constituent donc pas un holdout totalement vierge.
