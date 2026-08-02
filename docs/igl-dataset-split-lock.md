# LEYNOR AI — Séparation stricte des jeux de données

## Statut

Cette brique formalise et verrouille la séparation entre développement, validation et test final. Elle ne constitue pas une validation externe exécutée.

## Règles

Le plan impose exactement trois jeux :

- `development` pour la construction des variables et familles de modèles ;
- `validation` pour la sélection et la calibration ;
- `locked-test` pour l’évaluation finale unique.

Les contrôles bloquent :

- toute ligne présente dans plusieurs jeux ;
- toute période temporelle chevauchante ;
- toute empreinte réutilisée ;
- toute absence de rôle obligatoire ;
- tout test final déverrouillé ou déjà ouvert.

## Verrouillage

Le jeu `locked-test` reste marqué inaccessible. Son ouverture ne peut pas être déduite ou déclenchée par cette brique. Le plan est immuable et conserve l’empreinte de l’audit de provenance et de disponibilité temporelle qui l’a précédé.

## Portée scientifique

Un plan conforme autorise uniquement l’intégration contrôlée de données historiques licenciées. Il ne prouve pas la qualité des données, la calibration de l’IGL, sa supériorité face aux modèles de référence ou son aptitude à la production.

## Étape suivante

Intégrer les premières données historiques réellement exploitables, avec licence, empreinte et disponibilité point-in-time vérifiées, sans ouvrir le test final.
