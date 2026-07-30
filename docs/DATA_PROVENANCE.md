# Traçabilité et provenance des données

## Objectif

Chaque donnée utilisée par le moteur probabiliste doit pouvoir être reliée à une source, une date de collecte, une date de disponibilité et une version du pipeline.

Le but est double :

1. permettre à l'utilisateur et au développeur de comprendre d'où vient un chiffre ;
2. empêcher qu'un backtest utilise une information qui n'était pas encore disponible à la date simulée.

## Champs minimaux

Chaque lot de données doit conserver :

- fournisseur ;
- type de dataset ;
- symbole utilisé chez le fournisseur ;
- date/heure de collecte ;
- date/heure à laquelle l'information était disponible sur le marché lorsque cette notion existe ;
- première et dernière observation ;
- nombre de lignes ;
- version du pipeline ;
- URL ou identifiant de source lorsque disponible ;
- checksum lorsque le stockage persistant sera en place ;
- informations de licence/usage lorsque nécessaires.

## `collectedAt` n'est pas `availableAt`

Cette distinction est obligatoire.

Exemple : un résultat trimestriel concerne la période terminée le 31 mars, mais il peut n'avoir été publié que le 25 avril. Une observation de backtest datée du 10 avril ne doit jamais voir cette donnée, même si la période comptable est déjà terminée.

Pour les cours EOD, la date de séance décrit l'observation ; la date de collecte décrit quand notre système a récupéré le lot.

## Audit d'une analyse

À terme, une analyse publiée devra pouvoir exposer une fiche de provenance résumée :

- données de prix : fournisseur, symbole, dernière séance ;
- fondamentaux : fournisseur et dernière publication connue à la date d'analyse ;
- macro : série et date de disponibilité ;
- modèle : version ;
- pipeline : version ;
- date de calcul.

Cette fiche ne doit pas contenir de clé API ou de secret fournisseur.

## Politique d'échec

Une donnée sans provenance suffisante peut être utilisée dans une vue informative si son origine est explicitement indiquée comme incomplète, mais elle ne doit pas alimenter une probabilité publiée lorsque sa disponibilité temporelle ne peut pas être vérifiée.

Le moteur doit préférer « donnée insuffisante / probabilité non publiable » à une valeur non traçable.
