# Diagnostic de sous-estimation du risque de drawdown — v1

## Objet

Ce protocole cherche à expliquer les preuves adverses observées sur le drawdown sans modifier le moteur après lecture des résultats.

Le pilote `beginner` actuel utilise une hypothèse agrégée de rendement annuel 4,5 %, volatilité annuelle 10 %, avec innovations mensuelles gaussiennes reproductibles. Cette structure ne modélise pas explicitement les corrélations d'actifs, les queues épaisses, l'asymétrie ou le regroupement de volatilité.

## Questions diagnostiques

Le diagnostic mesure, sur les fenêtres annuelles préenregistrées 2015, 2018, 2020, 2022 et 2023 :

- la position du drawdown observé par rapport à la médiane, au p95 et au maximum simulés ;
- l'asymétrie des rendements mensuels du portefeuille proxy ;
- l'excès de kurtosis ;
- le nombre d'observations au-delà de 2 et 3 écarts-types du modèle gaussien de référence ;
- la corrélation de rang 1 des rendements absolus comme indicateur descriptif de regroupement de volatilité ;
- la corrélation quotidienne IWDA/PAEJ, à titre de diagnostic de dépendance entre actifs.

## Interprétation

Aucun de ces indicateurs ne constitue seul une preuve causale. En particulier, le pilote `beginner` est actuellement agrégé en un seul actif synthétique ; une corrélation historique IWDA/PAEJ élevée ne peut donc pas être présentée comme l'explication directe d'un écart du pilote actuel.

Une modification du moteur n'est justifiée que si plusieurs éléments convergent vers une faiblesse structurelle et si la nouvelle méthode est ensuite testée hors des observations utilisées pour la concevoir.

## Interdictions

Après lecture des diagnostics, il est interdit de :

- déplacer les percentiles simulés pour englober les observations défavorables ;
- ajuster la volatilité uniquement pour faire disparaître un dépassement de p95 ;
- supprimer une fenêtre ou un régime défavorable ;
- présenter cinq fenêtres comme une fréquence calibrée de couverture ;
- confondre preuve descriptive et validation prédictive.

## Étape suivante autorisée

Si les diagnostics montrent une faiblesse cohérente, une nouvelle version expérimentale du moteur peut être développée sur une branche séparée. Ses paramètres et critères de comparaison doivent être préenregistrés avant d'évaluer les fenêtres de test retenues pour la validation hors échantillon.
