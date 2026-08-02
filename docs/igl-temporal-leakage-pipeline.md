# LEYNOR AI — Pipeline anti-fuite temporelle de l’IGL

## Statut

Cette brique prépare la validation scientifique externe. Elle ne constitue ni une validation externe exécutée, ni une autorisation de produire un score IGL utilisateur.

## Objectif

Empêcher qu’une observation utilise une information indisponible à la date évaluée. Le pipeline fonctionne en mode fermé : une anomalie bloque l’éligibilité au découpage des jeux de données.

## Contrôles obligatoires

Pour chaque ligne, le pipeline exige :

- un identifiant unique ;
- une source enregistrée ;
- une empreinte de source identique à celle du registre ;
- une date d’observation ;
- une date réelle de publication ;
- une date d’ingestion ;
- une version ou révision explicite ;
- l’identifiant de la transformation appliquée.

Il bloque notamment :

- les publications postérieures à l’observation ;
- les données ingérées après l’observation ;
- les sources non enregistrées ;
- les empreintes divergentes ;
- les révisions ultérieures lorsqu’une expérience exige la première publication ;
- les sources sans champ documenté de disponibilité réelle.

## Sémantique scientifique

Un audit réussi signifie seulement que les lignes fournies respectent les contraintes temporelles codées et que leur provenance est cohérente avec le registre transmis. Il ne prouve pas :

- que les données sont exactes ;
- qu’elles sont représentatives ;
- que le survivorship bias est éliminé ;
- que l’IGL est calibré ;
- que l’IGL surpasse un modèle de référence ;
- que l’IGL est utilisable en production.

## Modes de révision

Le mode `first-release` interdit toute version révisée postérieure. Les modes `as-revised` et `latest-known` sont décrits dans le contrat, mais leur utilisation future devra être justifiée dans le protocole expérimental et ne pourra pas être substituée après ouverture du test final.

## Sortie

Le rapport contient les violations détaillées, l’état bloqué ou non, et l’éligibilité au futur découpage `development` / `validation` / `locked-test`. Les indicateurs `readyForExternalValidation` et `readyForProduction` restent toujours à `false` dans cette brique.

## Étape suivante

Créer la séparation stricte et verrouillée des trois ensembles de données sans chevauchement, réutilisation d’empreinte ou accès prématuré au test final.
