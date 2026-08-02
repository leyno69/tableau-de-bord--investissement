# Classification calibrée du niveau de preuve

## Objectif

Transformer un résultat de validation croisée en niveau de preuve uniquement lorsqu’une règle empirique, versionnée et référencée s’applique exactement.

## Principe

Le classificateur ne contient aucun seuil métier implicite et aucune pondération. Les règles sont fournies comme données calibrées. Chaque règle indique :

- un identifiant stable ;
- le niveau affichable ;
- la référence de calibration ;
- la méthode ;
- les statuts requis pour chaque critère ;
- les limites de validité.

## Conditions de classification

Une conclusion est classée seulement si :

1. la validation croisée ne contient aucun blocage ;
2. une seule règle calibrée correspond exactement aux statuts observés ;
3. la règle possède une référence de calibration et des limites explicites.

Dans tous les autres cas, le résultat est `unclassified`.

## Garde-fous

- aucune règle par défaut ;
- aucun score calculé à partir du nombre de preuves ;
- aucune compensation des contradictions ;
- aucune classification ambiguë ;
- aucune assimilation au niveau de confiance ou à l’IGL ;
- aucune recommandation d’investissement.

## Limites

La qualité d’une classification dépend directement de la qualité des campagnes ayant produit les règles. Le classificateur vérifie l’application déterministe des règles ; il ne remplace pas leur validation scientifique ni leur révision périodique.
