# Manifeste v1 des jeux de données historiques

## Objet

Toute série fournie au futur moteur de replay doit être accompagnée d'un manifeste immuable permettant de reconstruire sa provenance et son usage autorisé.

## Champs obligatoires

Le manifeste conserve notamment : fournisseur, référence de licence, symbole source, instrument ou proxy normalisé, piste `exact` ou `proxy`, intervalle, période, date d'acquisition, fuseau, devise, base de rendement, politique d'opérations sur titres, politique de données manquantes, statut point-in-time et empreintes des données brutes et normalisées.

## Trois usages distincts

- `fixture` : données synthétiques ou locales destinées uniquement aux tests du code ;
- `development` : données réelles éventuellement utilisables pour l'intégration technique mais sans prétention de validation scientifique ;
- `empirical-validation` : réservé à une source dont l'admissibilité scientifique et contractuelle a été démontrée.

Une source non `validation-eligible` ne peut pas produire un manifeste `empirical-validation`.

## Séparation exacte/proxy

Chaque manifeste appartient explicitement à une piste `exact` ou `proxy`. Une série de benchmark ne peut donc pas être injectée silencieusement dans un calcul présenté comme historique exact du fonds.

## Empreintes

Le manifeste possède sa propre empreinte SHA-256 en plus des empreintes des données brutes et normalisées. Toute modification de période, source, devise, méthode ou provenance modifie donc l'identité du jeu de données.

Ce contrat permet de construire et tester le moteur de replay dès maintenant avec des fixtures déterministes, sans confondre validation du logiciel et validation empirique des hypothèses financières.
