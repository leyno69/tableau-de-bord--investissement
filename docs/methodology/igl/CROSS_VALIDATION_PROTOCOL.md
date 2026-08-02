# Protocole de validation croisée des composantes candidates de l’IGL

## Objet

Vérifier qu’un effet observé dans une campagne de référence est reproduit dans une ou plusieurs campagnes indépendantes avant toute calibration expérimentale.

## Critères

Une comparaison est validée uniquement lorsque :

- les identifiants de campagne sont distincts ;
- la direction de l’effet est reproduite ;
- la dispersion relative de la campagne de validation est inférieure ou égale à 5 % ;
- la dérive relative de l’amplitude de l’effet ne dépasse pas 25 %.

Ces seuils sont explicites, testés et révisables. Ils ne constituent ni une recommandation financière ni une pondération de l’IGL.

## Statuts

- `insufficient-independent-campaigns` : moins de deux campagnes ;
- `not-reproduced` : au moins un critère échoue ;
- `cross-validated` : toutes les validations indépendantes satisfont les critères.

Le statut `cross-validated` autorise uniquement l’entrée dans une phase de calibration expérimentale. Il n’autorise aucun poids de production.

## Garde-fous

- rejet des campagnes portant le même identifiant ;
- conservation du motif exact de rejet ;
- registre trié de manière déterministe ;
- absence d’horodatage implicite ;
- aucune conversion automatique en score ;
- maintien hors IGL des effets non reproduits ou statistiquement instables.

## Étape suivante

Construire un registre de composantes candidates, puis définir une calibration expérimentale qui compare plusieurs familles de modèles sans choisir manuellement de pondérations. Les modèles devront ensuite être validés sur un jeu de campagnes tenu à l’écart.
