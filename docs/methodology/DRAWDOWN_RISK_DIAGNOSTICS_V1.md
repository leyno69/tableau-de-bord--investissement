# Diagnostic de sous-estimation du risque de drawdown — v1

## Objet

Ce protocole cherche à expliquer les preuves adverses observées sur le drawdown sans modifier le moteur après lecture des résultats.

Le pilote `beginner` actuel utilise une hypothèse agrégée de rendement annuel 4,5 %, volatilité annuelle 10 %, avec innovations mensuelles gaussiennes reproductibles. Cette structure ne modélise pas explicitement les queues épaisses, l'asymétrie, le regroupement de volatilité ou une structure dynamique de dépendance.

## Questions diagnostiques

Le diagnostic mesure, sur les fenêtres annuelles préenregistrées 2015, 2018, 2020, 2022 et 2023 :

- l'asymétrie des rendements mensuels de IWDA et PAEJ ;
- l'excès de kurtosis ;
- le z-score absolu maximal comme signal de mois extrême ;
- l'autocorrélation lag-1 des rendements absolus comme indicateur descriptif de regroupement de volatilité ;
- la corrélation mensuelle IWDA/PAEJ comme diagnostic de dépendance entre actifs.

Les signaux sont enregistrés lorsque les seuils diagnostiques préenregistrés sont dépassés : excès de kurtosis > 1, |skewness| > 0,75, mois extrême > 2,5 écarts-types, autocorrélation des rendements absolus > 0,25 ou corrélation inter-actifs > 0,65.

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

## Limites

Chaque fenêtre annuelle fournit seulement environ onze rendements mensuels. Les moments supérieurs sont donc instables et servent uniquement de signaux diagnostiques. Les données publiques ajustées restent des preuves empiriques de soutien et non des séries benchmark licenciées.

## Étape suivante autorisée

Si les diagnostics montrent une faiblesse cohérente, une nouvelle version expérimentale du moteur peut être développée sur une branche séparée. Ses paramètres et critères de comparaison doivent être préenregistrés avant d'évaluer les fenêtres de test retenues pour la validation hors échantillon.
