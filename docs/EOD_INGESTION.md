# Ingestion historique EODHD

## Source

Le endpoint serveur `/.netlify/functions/historical-eod` interroge l'API EOD Historical Data d'EODHD. La clé API n'est jamais transmise au navigateur.

Paramètres utilisés :

- `fmt=json`
- `period=d`
- `order=a`
- `from` et `to` lorsqu'ils sont fournis

## Sortie

Chaque réponse contient :

- les barres EOD normalisées ;
- un audit qualité ;
- une fiche de provenance ;
- un checksum SHA-256 du lot ;
- un `availableAt` pour chaque barre.

## Disponibilité temporelle

L'API EOD fournit une date de séance, mais le flux utilisé ici ne fournit pas l'horodatage exact auquel chaque barre a été publiée. Pour éviter d'inventer cette précision, le pipeline applique une règle conservatrice : une barre datée `YYYY-MM-DD` est considérée disponible à `23:59:59.999Z` ce même jour.

Cette convention est adaptée à notre premier backtest journalier. Elle est explicitement marquée comme impropre aux modèles intraday.

## Contrôles

Le dataset est rejeté en cas de prix ajusté invalide, volume négatif, ordre de dates incohérent, absence de `availableAt` dans le mode vérifié, ou disponibilité postérieure à la fin de la date de séance.

Le consommateur `modeling/eod-source.js` vérifie également la provenance, le nombre de lignes et la cohérence entre le checksum de la réponse et celui annoncé dans la provenance avant de construire les observations de backtest.

## Limite à traiter avant un modèle professionnel

Les séries de prix sont une première famille de données. Les fondamentaux, révisions d'analystes, événements, macro et univers de titres devront chacun disposer de leur propre date de disponibilité point-in-time et de leur propre politique de provenance avant d'entrer dans une probabilité publiée.
