# Rapport scientifique — diagnostic des drawdowns v2

## Périmètre et preuve

Diagnostic exécuté sur 2 455 observations communes du 2 juin 2014 au 29 décembre 2023, allocation proxy figée à 50 % IWDA.AS, 15 % PAEJ.PA et 35 % cash. Résultat intégral : `results.json`, SHA-256 `8d0508bb95f817847d43ac01e17f81c881f700087250f0ac027e9a3d1e6c4dc6`. Empreinte des 2 455 lignes alignées reçues de Yahoo : `3ff80fb4f9c16b21dca2d35efc6ecb4996031de44406204fb386a15c7dda838f`.

Le moteur de production et ses paramètres n’ont pas été modifiés.

## H1 — Défaut d’appariement de fréquence

**Observations.** Le drawdown maximal quotidien atteint 25,61 %, contre 13,75 % sur la trajectoire échantillonnée aux fins de mois. Les épisodes quotidiens ont une profondeur médiane de 0,65 %, une durée médiane de 5 observations et une récupération médiane de 2 observations. Le plus long épisode dure 533 observations et sa récupération après le creux demande 387 observations.

**Preuve.** L’écart de 11,86 points entre drawdown quotidien et mensuel confirme que l’échantillonnage mensuel masque des creux intramensuels. Les résultats annuels antérieurs montrent déjà qu’en 2020 le dépassement du p95 mensuel disparaît lorsque les fréquences sont appariées.

**Contre-preuve.** Le comparateur gaussien quotidien sur le même horizon place 25,61 % entre sa médiane de 21,56 % et son p95 de 36,53 %. Le drawdown quotidien historique n’est donc pas hors de l’enveloppe quotidienne simulée.

**Limites.** Une trajectoire historique ne fournit pas une distribution populationnelle des épisodes. Les cours Yahoo sont interrogés en direct : l’empreinte détecte une révision future, mais le dépôt ne permet pas de reconstruire une version source non archivée.

**Conclusion.** Cause démontrée pour les anciens dépassements obtenus par comparaison quotidien/mensuel. Elle justifie l’appariement méthodologique, pas un recalibrage.

## H2 — Dépendance non constante entre actifs

**Observations.** Corrélation quotidienne IWDA/PAEJ : 0,810 globalement, 0,731 lorsque le portefeuille baisse, 0,613 lorsqu’il monte et 0,761 lors des baisses quotidiennes d’au moins 1 %. Sur 63 observations, la corrélation varie de 0,373 à 0,949.

**Preuve.** L’amplitude roulante de 0,576 et l’écart entre régimes contredisent une corrélation empirique constante.

**Contre-preuve.** Le preset `beginner` confronté est un actif synthétique agrégé ; il ne simule pas séparément IWDA et PAEJ. Cette dépendance ne peut donc pas être attribuée causalement au dépassement du moteur agrégé.

**Limites.** Les régimes sont descriptifs, endogènes et non iid ; les proxies ne sont pas des séries MSCI officielles.

**Conclusion.** Non-constance démontrée dans les actifs proxies, causalité sur l’écart du moteur non démontrée.

## H3 — Volatilité persistante

**Observations.** Autocorrélation de rang 1 : 0,255 pour les rendements carrés et 0,263 pour les rendements absolus. La volatilité quotidienne observée passe de 0,417 % en régime bas à 1,068 % en régime haut, soit un rapport de 2,56.

**Preuve.** Les autocorrélations positives et la séparation des terciles roulants démontrent un clustering descriptif de volatilité.

**Contre-preuve.** La validation temporelle EWMA gagne deux folds sur trois, mais son écart agrégé de log-vraisemblance négative est défavorable de 1,651. La volatilité conditionnelle simple testée n’améliore donc pas le modèle de façon agrégée.

**Limites.** EWMA ne modélise ni sauts, ni asymétrie, ni dépendance dynamique.

**Conclusion.** Persistance empirique démontrée ; supériorité prédictive d’EWMA non démontrée.

## H4 — Queues épaisses et asymétrie

**Observations.** Sur 2 454 rendements quotidiens : skewness -0,665, excès de kurtosis 7,326, 33 observations au-delà de trois écarts-types dont 24 négatives. Une normale en prévoit environ 6,63 des deux côtés. Sur 114 rendements mensuels : skewness -0,470 et excès de kurtosis 0,773.

**Preuve.** La fréquence quotidienne observée au-delà de trois écarts-types vaut 33 / 2 454 = 1,345 %, contre 0,270 % sous la normale, soit environ 4,98 fois l’attente normale.

**Contre-preuve.** La validation Student-t temporelle gagne un fold sur trois et dégrade le score agrégé de 2,083. Une Student-t simple n’est pas une amélioration prédictive démontrée.

**Limites.** Les paramètres de référence ne constituent pas une estimation indépendante et les périodes ont déjà été observées dans le projet.

**Conclusion.** Non-normalité descriptive fortement étayée au quotidien ; remplacement par Student-t non justifié.

## Conclusion générale

Les anciens dépassements de drawdown mensuel sont expliqués directement par une fréquence non appariée. Les queues épaisses, la volatilité persistante et la dépendance variable constituent des mécanismes empiriques réels susceptibles d’amplifier les creux quotidiens, mais les tests confirmatoires simples disponibles ne démontrent pas une amélioration prédictive agrégée.

Décision : **aucune évolution du moteur de production n’est justifiée**. Conserver séparément le risque intramensuel dans la restitution et poursuivre uniquement avec des validations confirmatoires préenregistrées sur d’autres presets ou structures de portefeuille.
