# Registre v1 des sources historiques candidates

## Objet

Séparer strictement une source utilisable pour le développement d'une source admissible pour une validation empirique scientifique.

Une API disponible, pratique ou déjà intégrée n'est pas une preuve d'admissibilité méthodologique.

## Exigences pour une validation empirique

Une source doit disposer de preuves explicites pour :

- licence vérifiée ;
- droit d'usage pour la recherche concernée ;
- propriété point-in-time vérifiée ;
- traitement des opérations sur titres vérifié ;
- méthode d'ajustement documentée ;
- politique de corrections/révisions documentée ;
- couverture temporelle et instrumentale vérifiée ;
- références de preuve conservées.

Toute exigence non démontrée reste un blocage. L'absence de preuve n'est jamais convertie en `true` par défaut.

## Twelve Data

Le dépôt possède déjà un adaptateur, un contrôle temporel, un registre d'acquisition et des tests Twelve Data. Cette intégration est utile pour le développement et les essais techniques.

Cependant, `docs/twelve-data-provider.md` indique explicitement que l'intégration actuelle ne prouve pas :

- la disponibilité point-in-time de chaque observation ;
- l'historique des corrections et révisions ;
- l'inclusion des sociétés radiées ;
- l'absence de survivorship bias ;
- l'autorisation de redistribution selon le plan actif.

Le registre classe donc Twelve Data `development-only` pour ce protocole tant que les preuves manquantes ne sont pas apportées. Cette décision ne critique pas la qualité générale du fournisseur ; elle décrit uniquement ce que LEYNOR peut actuellement démontrer.

## Règle de progression

Le prochain bloc doit inventorier les fournisseurs candidats à partir de leurs documents contractuels et méthodologiques officiels. Une source n'est promue `validation-eligible` qu'après conservation des preuves correspondantes et vérification de la couverture des instruments retenus.

Aucune série historique complète ne doit être ouverte pour ajuster le protocole avant ce verrou.
