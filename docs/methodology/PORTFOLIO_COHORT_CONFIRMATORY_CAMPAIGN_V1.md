# Campagne confirmatoire multi-portefeuilles proxy — v1

## Préenregistrement

La cohorte, les périodes, les modèles candidats, les paramètres candidats et la règle de décision sont figés avant exécution. Cette campagne ne modifie ni le moteur ni ses paramètres.

## Cohorte figée

| Identifiant | IWDA.AS | PAEJ.PA | Cash |
|---|---:|---:|---:|
| defensive | 30 % | 10 % | 60 % |
| beginner | 50 % | 15 % | 35 % |
| dynamic | 75 % | 20 % | 5 % |
| world-only | 100 % | 0 % | 0 % |

## Validation temporelle

Trois folds communs : validation 2018–2019, 2020–2021 et 2022–2023. Chaque entraînement utilise uniquement les observations antérieures. Student-t choisit son degré de liberté sur `[4, 6, 8, 12, 20]` dans l’entraînement. EWMA choisit lambda sur `[0.90, 0.94, 0.97]` dans l’entraînement.

Critère principal : somme des log-vraisemblances négatives de validation, sur les quatre portefeuilles et les trois folds. Un modèle alternatif doit améliorer l’agrégat et gagner dans au moins 75 % des douze cellules pour autoriser seulement un prototype séparé.

## Drawdown

Le drawdown historique mensuel de chaque portefeuille est comparé à un comparateur gaussien mensuel de même horizon, utilisant la moyenne et la volatilité annualisées estimées uniquement avant 2018. Les drawdowns quotidiens restent une métrique haute fréquence séparée.

## Limites préenregistrées

- IWDA.AS et PAEJ.PA sont des proxies publics Yahoo, non des séries MSCI licenciées ;
- les périodes ont déjà été observées dans le projet et ne sont pas un holdout vierge ;
- les quatre allocations partagent les mêmes sous-jacents et ne sont pas des réplications indépendantes ;
- un succès autorise uniquement une expérimentation séparée, jamais une modification automatique du moteur.
