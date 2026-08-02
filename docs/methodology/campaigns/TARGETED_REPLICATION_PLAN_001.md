# Plan de réplications ciblées 001

## Objectif

Allouer le calcul supplémentaire aux seules cellules dont la précision est insuffisante, plutôt que relancer uniformément l’ensemble du plan factoriel.

## Classes

- `insufficient` : moins de cinq graines ;
- `stable` : dispersion relative inférieure ou égale à 5 % ;
- `watch` : dispersion comprise entre 5 % et 10 % ;
- `unstable` : dispersion supérieure à 10 %.

Ces seuils sont des règles expérimentales explicites et révisables. Ils ne constituent pas des seuils de conseil financier ni des pondérations de l’IGL.

## Allocation

Les graines sont ajoutées par lots de cinq. L’estimation suit la réduction théorique de l’erreur avec la racine du nombre de réplications et reste plafonnée à 25 graines par cellule.

Le plan conserve pour chaque cellule :

- les facteurs ;
- la dispersion observée ;
- le nombre de graines actuel et cible ;
- les graines supplémentaires ;
- la raison d’arrêt.

## Critère d’arrêt

Une cellule peut être arrêtée lorsque :

1. sa dispersion devient `stable` ;
2. la dérive relative de l’effet médian entre deux vagues reste au plus égale à 2 % ;
3. ou le plafond de 25 graines est atteint, auquel cas l’incertitude résiduelle doit rester visible.

Atteindre le plafond ne transforme jamais une cellule instable en cellule validée.

## Garde-fous

- allocation déterministe et traçable ;
- aucun remplacement des observations manquantes ;
- aucun masquage de l’incertitude résiduelle ;
- aucune conversion automatique en score ou en poids IGL ;
- résultats synthétiques, ni prévision ni recommandation.

## Étape suivante

Appliquer ce plan aux artefacts exhaustifs de la campagne 001, exécuter les lots ciblés, puis comparer la convergence et la dérive des effets avant la validation croisée.
