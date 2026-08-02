# Protocole de calibration expérimentale de l’IGL

## Objet

Comparer plusieurs familles de modèles sur un jeu de validation tenu à l’écart, sans choisir manuellement de pondérations et sans activer de score en production.

## Métriques

Chaque modèle est évalué avec :

- erreur quadratique moyenne (RMSE) ;
- erreur absolue moyenne (MAE) ;
- variance expliquée hors échantillon ;
- nombre d’observations de validation.

Le classement privilégie la plus faible RMSE, puis la variance expliquée. Un modèle ne peut être déclaré admissible que s’il satisfait des seuils explicites fournis au protocole.

## Garde-fous

- jeu de validation distinct de la calibration ;
- coefficients finis et traçables ;
- aucune pondération choisie pour produire un résultat esthétiquement souhaité ;
- aucune sélection lorsqu’aucun modèle ne satisfait les seuils ;
- absence d’horodatage implicite ;
- aucun modèle sélectionné n’est automatiquement transformé en IGL de production.

## Limites

Cette étape fournit une infrastructure de comparaison. Elle ne prouve pas encore qu’un modèle est causal, stable dans le temps ou adapté à tous les profils. La qualité dépend des campagnes utilisées, des variables observées et du jeu de validation.

## Étape suivante

Évaluer les familles candidates sur plusieurs partitions indépendantes, mesurer la stabilité du classement et documenter les modèles rejetés. Le rapport exhaustif devra distinguer clairement les composantes validées, provisoires et exclues.
