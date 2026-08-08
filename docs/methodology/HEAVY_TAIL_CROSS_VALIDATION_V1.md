# Validation temporelle gaussienne vs queues épaisses — v1

## Objectif

Tester si une loi Student-t apporte une meilleure qualité prédictive rétrospective que l’hypothèse gaussienne mensuelle actuelle, sans modifier le moteur de production.

## Protocole

Trois folds temporels ordonnés sont figés : entraînement jusqu’en 2017 puis validation 2018–2019 ; entraînement jusqu’en 2019 puis validation 2020–2021 ; entraînement jusqu’en 2021 puis validation 2022–2023.

Le degré de liberté Student-t est choisi uniquement sur l’échantillon d’entraînement parmi la grille fixe `[4, 6, 8, 12, 20]`. La moyenne et la variance sont estimées sur l’entraînement puis utilisées sans réajustement sur la période de validation.

Le critère principal est la log-vraisemblance négative hors période d’estimation. Une valeur plus faible est meilleure.

## Règle de décision

Une amélioration Student-t répétée sur plusieurs folds autorise seulement la création d’un prototype expérimental séparé. Elle ne suffit pas à modifier le moteur de production.

Toute version candidate devra ensuite être comparée sur des critères de drawdown et faire l’objet d’une validation distincte.

## Limite essentielle

Ces périodes ont déjà été observées dans d’autres analyses LEYNOR. Le protocole respecte l’ordre temporel et évite l’ajustement sur la période de validation de chaque fold, mais il ne constitue pas un holdout totalement vierge.
