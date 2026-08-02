# LEYNOR AI — Registre des sources externes de l’IGL

## Statut

Cette brique enregistre les métadonnées nécessaires à l’évaluation préalable de sources externes. Elle ne contient aucune donnée historique réelle et ne constitue ni une validation externe, ni une autorisation d’activer un score IGL en production.

## Finalité

Avant toute acquisition ou analyse, chaque source doit être décrite de façon reproductible afin d’éviter qu’un jeu de données soit retenu uniquement parce qu’il produit un résultat favorable.

Le registre conserve obligatoirement :

- l’identité de la source et du fournisseur ;
- la provenance documentée ;
- la licence et les droits d’usage pour la recherche ;
- la fréquence de mise à jour ;
- le mode de disponibilité point-in-time ;
- les champs de date d’observation et de publication ;
- une empreinte SHA-256 ;
- l’exposition au survivorship bias ;
- l’inclusion ou non des entités disparues ou radiées ;
- la politique de corrections et l’existence d’un historique de révisions ;
- les champs fournis et les restrictions connues.

## Garde-fous

Une source est bloquée avant le pipeline temporel si, notamment :

- la licence n’autorise pas l’usage de recherche ;
- la disponibilité point-in-time est inconnue ou limitée à un instantané courant ;
- le délai réel de publication n’est pas documenté ;
- aucun champ de publication n’est disponible ;
- le risque de survivorship bias est inconnu ;
- une source exposée au survivorship bias ne documente aucune mitigation ;
- les corrections historiques écrasent les anciennes valeurs sans journal auditable ;
- les révisions sont annoncées mais aucun identifiant de révision n’est fourni.

## Interprétation des statuts

- `registered-not-approved` : les métadonnées ont été enregistrées, sans validation de la source.
- `readyForTemporalPipeline` : aucun blocage documentaire connu ne subsiste pour lancer l’audit anti-fuite temporelle.
- `readyForExternalValidation` : reste toujours faux à ce stade.
- `readyForProduction` : reste toujours faux à ce stade.

## Données absentes volontairement

Le dépôt ne contient :

- aucune série de prix ;
- aucune composition historique d’indice ;
- aucune donnée de portefeuille utilisateur ;
- aucune statistique de validation ;
- aucun seuil numérique inventé ;
- aucune pondération IGL de production.

Les exemples de tests utilisent uniquement des métadonnées fictives et le domaine réservé `example.invalid`. Ils ne représentent pas une source acquise ou approuvée.

## Prochaine étape

Construire le pipeline anti-fuite temporelle. Celui-ci devra comparer, pour chaque observation et transformation, la date observée, la date réelle de disponibilité, la version de source et l’historique de correction. Toute information indisponible à la date évaluée devra bloquer l’expérience plutôt qu’être corrigée silencieusement.
