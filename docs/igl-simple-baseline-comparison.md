# Comparaison aux modèles de référence simples

Cette brique impose au moins deux références simples avant toute conclusion sur l’IGL expérimental.

Les métriques prises en charge sont :

- erreur absolue moyenne (`mae`) ;
- score de Brier (`brier`) pour des probabilités comprises entre 0 et 1.

Le moteur rapporte le score du candidat, chaque référence, la meilleure référence et l’amélioration absolue. Il ne conclut jamais à une validation externe par lui-même.

Une conclusion scientifique exige encore : protocole préenregistré, données point-in-time vérifiées, séparation développement/validation/test verrouillé, ouverture unique du test final et revue indépendante.
