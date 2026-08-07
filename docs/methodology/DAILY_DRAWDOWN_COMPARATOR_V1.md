# Comparateur quotidien de drawdown — v1

## Objet

Le moteur `beginner` de référence évolue mensuellement. Le comparateur quotidien v1 est une expérience séparée destinée à mesurer si les drawdowns historiques quotidiens sont réellement atypiques lorsque la simulation utilise la même fréquence d’observation.

Ce comparateur ne remplace pas le moteur mensuel.

## Modèle préenregistré

- distribution : gaussienne quotidienne ;
- rendement annuel : 4,5 % ;
- volatilité annuelle : 10 % ;
- 10 000 trajectoires ;
- graine : 20260807 ;
- horizon annuel : 252 séances ;
- horizon trimestriel : 63 séances.

Aucun paramètre n’a été choisi après lecture des résultats du comparateur.

## Résultats annuels

Distribution de drawdown quotidien simulé sur un an :

- médiane : 8,92 % ;
- p95 : 17,28 % ;
- p99 : 21,70 % ;
- maximum des 10 000 trajectoires : 36,55 %.

Parmi les cinq fenêtres historiques proxy, seule 2020 dépasse le p95. Son drawdown de 21,68 % est inférieur au p99 simulé de 21,70 %.

Ce résultat conserve 2020 comme épisode extrême, mais ne suffit pas à démontrer que la distribution quotidienne du modèle sous-estime structurellement le risque.

## Résultats trimestriels

Distribution de drawdown quotidien simulé sur 63 séances :

- médiane : 4,56 % ;
- p95 : 9,48 % ;
- p99 : 12,03 % ;
- maximum : 16,94 %.

Aucune des huit fenêtres trimestrielles exactes ne dépasse le p95 quotidien apparié. Le drawdown 2025-Q2 de 8,68 %, auparavant supérieur au p95 mensuel de la simulation 3 mois, se situe donc dans la bande médiane–p95 du comparateur quotidien.

## Décision méthodologique

Le signal initial de sous-estimation du drawdown était en grande partie lié à une fréquence non appariée. Le comparateur quotidien montre que :

- 2025-Q2 n’est pas une preuve adverse à fréquence quotidienne appariée ;
- 2020 reste une observation de queue, proche du p99 ;
- aucune modification du moteur mensuel n’est justifiée sur cette seule base.

Le risque intramensuel peut néanmoins être utile comme métrique distincte dans LEYNOR. S’il est exposé à l’utilisateur, il devra provenir d’un modèle ou d’un protocole explicitement quotidien et ne devra jamais être confondu avec le drawdown mensuel du moteur de référence.

## Limites

- le comparateur quotidien reste gaussien ;
- il ne modélise pas la volatilité conditionnelle ni les sauts ;
- cinq fenêtres annuelles constituent un petit échantillon ;
- les fenêtres pré-2024 utilisent IWDA comme proxy de WPEA ;
- cette expérience ne démontre aucune capacité prédictive.
