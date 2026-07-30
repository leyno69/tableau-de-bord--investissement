# Domaine des comptes d’investissement

## Objectif

Le modèle `Account` décrit l’emplacement réel d’actifs ou d’espèces sans dépendre d’un courtier, d’un connecteur ou d’un format d’import.

## Séparation des responsabilités

Trois dimensions sont distinctes :

- `providerId` identifie l’établissement ou le fournisseur, par exemple `TRADE_REPUBLIC` ou `REVOLUT` ;
- `kind` distingue un compte de titres (`SECURITIES`) d’un compte d’espèces (`CASH`) ;
- `taxWrapper` décrit l’enveloppe fiscale (`PEA`, `CTO` ou `NONE`).

Cette séparation permet à un même portefeuille de contenir plusieurs comptes chez un même établissement, dans plusieurs devises, sans introduire de règles propres à un courtier dans le domaine.

## Identité

`id` est l’identité interne stable utilisée par les transactions. `externalId` est optionnel et sert uniquement à conserver une référence fournie par un établissement ou un futur connecteur.

## Devise

Chaque compte possède une devise de référence ISO 4217 sur trois lettres. Elle décrit la devise native du compte ; elle ne limite pas les instruments pouvant y être détenus.

## Métadonnées

`metadata` est un espace d’extension immuable réservé aux informations non structurantes. Il ne peut contenir que des valeurs JSON sérialisables. Toute donnée nécessaire aux invariants métier doit devenir un attribut explicite plutôt qu’une métadonnée.

## Hors périmètre

Cette première version ne gère pas encore :

- les soldes d’espèces ;
- les relations entre un compte titres et son compte espèces ;
- les règles fiscales détaillées ;
- les capacités propres à Trade Republic ou Revolut ;
- la persistance et les connecteurs d’import.
