# Calibration probabiliste des portefeuilles — v1

## Statut

Campagne rétrospective point-in-time par proxies. Elle ne donne aucune autorité d'affichage d'une probabilité réelle dans le produit.

## Protocole figé

- cohorte identique à la campagne confirmatoire multi-portefeuilles v1 ;
- prévisions trimestrielles de janvier 2018 à janvier 2023 ;
- horizon fixe de douze mois ;
- estimation de la moyenne et de la volatilité uniquement avec les rendements mensuels antérieurs à la date de prévision ;
- moteur mensuel inchangé, 5 000 trajectoires et graine déterministe propre à chaque prévision ;
- événement probabiliste : valeur finale supérieure à la valeur initiale ;
- intervalles centraux disponibles sans changer le moteur : 50 % (p25–p75) et 90 % (p05–p95) ;
- comparaison du Brier score à un taux de base calculé exclusivement dans l'historique antérieur ;
- intervalles de Wilson à 95 % pour chaque fréquence de couverture.

## Règle de décision

La campagne reste `proxy-inconclusive` si les intervalles de Wilson ne sont pas compatibles avec les niveaux annoncés, si le modèle ne bat pas le taux de base, si l'effectif est inférieur à 100 prévisions effectivement indépendantes, ou si les données exactes/licenciées manquent.

Les prévisions partagent des actifs et des fenêtres chevauchantes : l'effectif brut ne doit jamais être assimilé à un nombre d'observations indépendantes.

## Validation prospective

Chaque future prévision doit enregistrer le commit moteur, l'empreinte des hypothèses, la date de maturité et `createdWithoutOutcomeAccess: true`. Le résultat ne peut être associé avant la maturité.

## Données exactes

Le même pipeline acceptera un export CSV `date,level` seulement avec un manifeste indiquant fournisseur, référence de licence, indice, variante de rendement, devise et `validationEligible: true`. Aucune source proxy ne peut être requalifiée silencieusement en donnée exacte.
