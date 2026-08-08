# Diagnostic scientifique des drawdowns — v2

## Préenregistrement

Ce bloc est descriptif. Il ne possède aucune autorité pour recalibrer ou modifier le moteur. Il conserve toutes les observations, tous les épisodes de drawdown récupérés ou non récupérés et les résultats contradictoires.

## Hypothèses testées indépendamment

1. **Fréquence d’observation** : comparer séparément drawdown quotidien et drawdown mensuel apparié.
2. **Dépendance non constante** : mesurer corrélation globale, conditionnelle aux journées haussières, baissières et fortement baissières, ainsi que la plage roulante sur 63 observations.
3. **Volatilité persistante** : mesurer l’autocorrélation de rang 1 des rendements absolus et carrés, puis la volatilité observée dans trois régimes définis par les terciles roulants sur 21 observations.
4. **Queues** : mesurer les quantiles de 0,1 % à 99,9 %, les dépassements de deux et trois écarts-types et conserver la comparaison confirmatoire gaussienne/Student-t déjà séparée dans `heavy-tail-cross-validation-v1`.
5. **Épisodes de drawdown** : mesurer fréquence, profondeur, durée, récupération et épisodes non récupérés sur les trajectoires quotidienne et mensuelle.

## Données et comparateurs

La trajectoire proxy conserve l’allocation déjà utilisée par la campagne `beginner` : 50 % IWDA.AS, 15 % PAEJ.PA et 35 % cash. Les cours ajustés publics Yahoo restent une preuve proxy exploratoire, non une série MSCI licenciée.

Chaque exécution empreinte les lignes alignées reçues. Cette empreinte détecte une révision de la source en direct, mais ne remplace pas un instantané autorisé et ne permet pas à elle seule de reconstruire une version historique disparue.

Le comparateur de drawdown quotidien réutilise `runDailyGaussianDrawdownExperiment` sans changement de paramètres : rendement annuel 4,5 %, volatilité annuelle 10 %, 10 000 trajectoires et graine 20260807. Les validations Student-t et EWMA restent des expériences indépendantes ; leurs résultats ne sont ni combinés ni sélectionnés après observation.

## Règle de décision

Une observation descriptive, un rejet de normalité ou une corrélation variable ne suffit pas à modifier le moteur. Une évolution exige une amélioration confirmatoire répétée hors période d’estimation, puis une confrontation séparée des drawdowns à fréquence appariée.
