# Campagne prospective de calibration probabiliste — v1

## Objet

Ce dossier préenregistre une future validation prospective du moteur mensuel inchangé. Il ne contient encore aucune prévision et aucun résultat futur.

Le commit qui introduit ce protocole doit rester antérieur à tout scellement de prévision. Toute évolution ultérieure des hypothèses exige une nouvelle version de campagne ; elle ne peut pas remplacer silencieusement cette version.

## Calendrier

- fuseau : `Europe/Paris` ;
- cadence opérationnelle : trimestrielle ;
- première vague : huit origines, du 1er octobre 2026 au 1er juillet 2028 ;
- horizon de chaque prévision : douze mois ;
- règle de scellement : première observation éligible après la clôture du mois précédent.

Les origines trimestrielles et les quatre portefeuilles partagent des périodes et des sous-jacents. Aucun enregistrement ne peut donc être compté comme observation indépendante sans audit de dépendance séparé. La première vague est un calendrier opérationnel, pas une justification de taille d’échantillon.

## Critères préenregistrés

- moteur référencé : commit `66d09ccf94bdec3b5c4e1e09fc406e6ccc5df6b9` ;
- 5 000 trajectoires par prévision ;
- événement : valeur finale supérieure à la valeur initiale ;
- score primaire : Brier ;
- benchmark : taux de base dynamique point-in-time ;
- chaque prévision scelle ce benchmark, la graine et les empreintes des manifestes et données d’entrée ;
- couvertures descriptives : 50 % et 90 % ;
- au moins 100 prévisions effectivement indépendantes ;
- holdout indépendant et données exactes/licenciées obligatoires ;
- aucune recalibration avant la décision finale.

## État de lancement

Le lancement est bloqué avant la première prévision : les deux séries EUR exactes/licenciées (`worldProxy` et `paej`) et leurs références de licence ne sont pas présentes. Aucun proxy Yahoo n’est utilisé comme remplacement silencieux.

Pour lever le blocage, fournir pour chaque série un CSV `date,level` et un manifeste conforme à `data/licensed-validation/README.md`. Si la licence interdit de versionner les données, elles doivent rester hors du dépôt ; seules leurs métadonnées et empreintes autorisées seront enregistrées.

Commande de reproduction :

```bash
node experiments/portfolio-probability-prospective-v1/prepare.mjs
```

L’artefact est écrit dans `artifacts/portfolio-probability-prospective-v1-launch.json`.
