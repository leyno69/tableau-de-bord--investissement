# Artefacts d’exécution factorielle 001

## Objectif

Garantir que toute exécution exhaustive de la campagne factorielle 001 produise des sorties vérifiables et reproductibles avant leur utilisation méthodologique.

## Artefacts

Le générateur produit trois objets indissociables :

1. `manifest` : configuration, graines, nombre de réplications, nombre de trajectoires, SHA du moteur et sommes de contrôle ;
2. `observations` : résultats cellule-par-graine sans reconstruction depuis des agrégats ;
3. `analysis` : stabilité locale, interactions prioritaires et recommandations de réplications.

## Intégrité

Des sommes SHA-256 couvrent :

- la configuration canonique ;
- les observations ;
- l’analyse.

La validation échoue explicitement lorsqu’un contenu, un nombre de réplications ou une analyse ne correspond plus au manifeste.

## Exécution exhaustive

La configuration canonique reste celle de la PR #221 :

- 2 880 réplications ;
- 720 000 trajectoires ;
- 576 cellules ;
- cinq graines par cellule.

Cette PR fournit le contrat d’artefacts et les contrôles d’intégrité. Elle ne prétend pas qu’une exécution exhaustive a eu lieu tant que les fichiers générés et leur manifeste n’ont pas été enregistrés avec un SHA moteur et une date d’exécution vérifiables.

## Garde-fous

- aucune donnée agrégée n’est présentée comme une observation brute ;
- aucune altération silencieuse des sorties ;
- aucune pondération automatique de l’IGL ;
- aucune conclusion hors des hypothèses synthétiques ;
- ni prévision ni recommandation d’investissement.

## Étape suivante

Exécuter la configuration canonique, versionner le manifeste et les résultats consolidés, puis appliquer le plan de réplications ciblées aux cellules classées `watch` ou `unstable`.
