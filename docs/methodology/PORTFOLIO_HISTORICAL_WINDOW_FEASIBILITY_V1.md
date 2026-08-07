# Faisabilité temporelle v1 des replays historiques

## Objet

Vérifier, avant toute acquisition complète de prix, si l'histoire **réelle de l'instrument exact** est suffisamment longue pour couvrir l'horizon du preset.

Cette étape est distincte de la couverture d'un fournisseur : un fournisseur peut couvrir un instrument sans pouvoir créer un historique antérieur à sa date de lancement.

## Date d'évaluation

Évaluation de référence : 2026-08-07.

## Résultats

### `beginner` — horizon 5 ans

Début requis : 2021-08-07.

- WPEA : lancement 2024-03-26 → historique exact insuffisant ;
- PAEJ : création 2014-05-13 → historique exact temporellement suffisant.

Le preset n'est donc pas rejouable sur cinq ans avec uniquement ses instruments exacts.

### `growth` — horizon 8 ans

Début requis : 2018-08-07.

- WPEA : historique exact insuffisant ;
- NVDA : IPO 1999-01-22 → profondeur temporelle suffisante ;
- SMH : identité encore ambiguë. Le produit US a une profondeur temporelle compatible avec huit ans, le produit UCITS lancé en 2020 ne l'a pas, mais aucune des deux identités ne peut être choisie par intuition.

Le preset n'est pas rejouable exactement en l'état.

### `dca` — horizon 20 ans

Début requis : 2006-08-07.

- WPEA : historique exact impossible avant 2024.

Le replay exact de vingt ans est donc impossible avec WPEA.

## Couverture fournisseur vérifiée

Les pages publiques EODHD confirment une entrée de données pour :

- WPEA.PA ;
- PAEJ.PA ;
- NVDA.US ;
- SMH.US (ETF VanEck américain) ;
- SMH.PA (ETF VanEck UCITS européen).

Cette couverture ne rend **pas** EODHD validation-éligible : les autres verrous de licence, point-in-time, ajustements, révisions et droit d'usage restent séparés.

## Conséquence méthodologique

Pour les horizons dépassant l'existence d'un instrument, deux choix seulement sont admissibles :

1. réduire explicitement la fenêtre et créer un protocole distinct ;
2. utiliser un proxy préenregistré, justifié et affiché comme proxy.

Une troisième option est interdite : prolonger artificiellement l'instrument avec un indice ou un autre ETF sans le déclarer.

Le bloc suivant doit donc construire un registre de proxies candidats fondé sur les expositions/indices de référence officiels, sans encore sélectionner un proxy en fonction de ses performances historiques.
