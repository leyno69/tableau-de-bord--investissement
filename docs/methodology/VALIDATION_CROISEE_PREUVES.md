# Validation croisée des calibrations du niveau de preuve

## Objectif

Comparer plusieurs calibrations enregistrées pour une même conclusion et un même protocole avant toute future classification du niveau de preuve.

## Conditions de comparabilité

Les calibrations doivent :

- viser la même conclusion ;
- utiliser le même protocole ;
- être identifiées de manière unique ;
- provenir de jeux de données indépendants ;
- avoir le statut `validated` ;
- couvrir les mêmes critères ;
- conserver la revue explicite des contradictions.

## Résultat

La validation restitue :

- les versions de protocole et de moteur rencontrées ;
- la couverture de chaque critère ;
- les statuts observés ;
- les références de holdout ;
- les contradictions ou lacunes ;
- les blocages empêchant la validation croisée.

## Garde-fous

Cette étape :

- ne calcule aucun niveau de preuve ;
- ne transforme pas une majorité de résultats en vérité ;
- ne compense pas une contradiction par une pondération ;
- ne produit aucun niveau de confiance ni IGL ;
- ne constitue pas une recommandation d’investissement.

## Limites

La concordance entre plusieurs calibrations ne démontre pas automatiquement la causalité, l’indépendance parfaite des sources ou la généralisation à d’autres périodes, marchés ou hypothèses.
