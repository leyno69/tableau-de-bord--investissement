# Précision temporelle des transactions

`executedAt` conserve la précision réellement fournie par la source.

Deux formes sont acceptées :

- `YYYY-MM-DD` pour une date civile sans heure connue ;
- un instant ISO 8601 avec `Z` ou décalage UTC explicite.

Une date civile n'est jamais transformée artificiellement en minuit UTC. Un horaire local sans fuseau est refusé car il est ambigu.

`createdAt` reste un instant technique complet avec fuseau explicite et est normalisé en UTC.

La propriété `executedAtPrecision` expose `DATE` ou `INSTANT`. Elle n'est pas ajoutée à `toJSON()` afin de préserver le format sérialisé existant ; elle peut être persistée séparément lors d'une future migration de schéma.
