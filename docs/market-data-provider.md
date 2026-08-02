# Couche d’accès aux données de marché

## Objet

Cette couche découple le cœur scientifique de LEYNOR AI de tout fournisseur commercial. Un fournisseur doit exposer des prix, des métadonnées de provenance et, lorsqu’elles existent, des opérations sur titres.

## Garanties

- interface unique et indépendante du courtier ;
- résultats déterministes et immuables ;
- capacités déclarées explicitement ;
- absence de validation externe implicite ;
- absence de score de production ;
- contrôle séparé des données point-in-time, des révisions et des entités radiées.

## Fournisseur CSV

`CsvMarketDataProvider` permet d’importer immédiatement des fichiers locaux avec les colonnes :

`symbol,date,open,high,low,close,volume,availableAt`

Chaque import doit aussi fournir :

- un identifiant de source ;
- une licence ;
- une empreinte ;
- l’état point-in-time ;
- la présence ou non des révisions ;
- la présence ou non des entités radiées.

Le CSV n’est pas considéré comme scientifiquement exploitable par défaut. Son éligibilité dépend des métadonnées de la source et des audits anti-fuite temporelle déjà intégrés.

## Prochaine étape

Ajouter des adaptateurs HTTP pour des fournisseurs licenciés. Les appels nécessitant une clé resteront désactivés tant que la clé n’est pas fournie. Les tests unitaires utiliseront des transports injectés et aucune réponse inventée ne sera présentée comme donnée réelle.
