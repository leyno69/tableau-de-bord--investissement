# Simulation à horizon apparié — v1

## Principe

Une observation historique ne doit être positionnée dans une distribution simulée que si les deux objets portent sur un horizon économiquement compatible.

Un trimestre historique ne doit donc jamais être classé dans les percentiles d'une simulation annuelle simplement parce que les métriques portent le même nom.

## Durée explicite en mois

Le moteur LEYNOR dispose d'une API de simulation par durée exprimée en mois pour les validations où un nombre entier d'années serait trop grossier.

Cette API :

- utilise le même générateur pseudo-aléatoire ;
- conserve les mêmes transformations rendement annuel -> rendement mensuel et volatilité annuelle -> volatilité mensuelle ;
- applique les frais au mois ;
- applique les contributions sur le nombre exact de mois ;
- annualise l'inflation selon `durationMonths / 12` ;
- ne modifie pas l'API annuelle historique.

Une durée de 12 mois avec mêmes paramètres et même graine doit produire exactement le même résumé qu'une durée d'un an.

## Pilote trimestriel beginner

Le pilote préenregistré utilise :

- 10 000 trajectoires ;
- 3 mois ;
- capital initial 10 000 € ;
- aucun apport ;
- zéro frais ;
- zéro inflation ;
- graine `20260807` ;
- rendement annuel agrégé 4,5 % ;
- volatilité annuelle agrégée 10 %.

Le seul paramètre méthodologique modifié par rapport au pilote annuel est la durée.

## Interprétation

Les bandes p05/p25/médiane/p75/p95 de ce pilote peuvent être utilisées descriptivement pour positionner les fenêtres historiques trimestrielles exactes.

Elles ne constituent toujours pas des seuils de réussite. Toute observation défavorable au-delà d'un percentile élevé doit être conservée comme preuve adverse et non utilisée pour recalibrer rétroactivement le modèle.

## Limites

- modèle gaussien mensuel simplifié ;
- absence de matrice de corrélation entre actifs dans cette version ;
- hypothèse agrégée du preset et non modélisation instrument par instrument ;
- aucune preuve de pouvoir prédictif ;
- la qualité scientifique finale dépend aussi de l'admissibilité de la source historique.
