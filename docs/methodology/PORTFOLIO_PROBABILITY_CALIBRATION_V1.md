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

Le rapport doit publier séparément la référence fixe à 50 % et la référence dynamique point-in-time. Une amélioration contre la référence fixe ne peut pas masquer une dégradation contre la référence dynamique.

## Règle de décision

La campagne reste `proxy-inconclusive` si les intervalles de Wilson ne sont pas compatibles avec les niveaux annoncés, si le modèle ne bat pas le taux de base, si l'effectif est inférieur à 100 prévisions effectivement indépendantes, ou si les données exactes/licenciées manquent.

Les prévisions partagent des actifs et des fenêtres chevauchantes : l'effectif brut ne doit jamais être assimilé à un nombre d'observations indépendantes.

Dans ce cas, les intervalles de Wilson standards sont conservés comme descriptifs mais ne possèdent aucune valeur inférentielle, car leur hypothèse d’essais indépendants n’est pas satisfaite.

## Validation prospective

Chaque future prévision doit enregistrer le commit moteur, l'empreinte des hypothèses, la date de maturité et `createdWithoutOutcomeAccess: true`. Le résultat ne peut être associé avant la maturité.

Les intervalles d’une prévision sont normalisés et figés profondément avant empreinte. `binaryOutcome` doit être strictement booléen et une observation datée dans le futur par rapport à l’horloge de règlement est refusée.

La campagne prospective indépendante est préenregistrée dans `PORTFOLIO_PROBABILITY_PROSPECTIVE_V1.md`. Elle ajoute `sealedAt`, interdit tout champ de résultat lors du scellement, fixe le calendrier à `Europe/Paris` et bloque la première prévision tant que les données exactes/licenciées manquent.

Une campagne historique accélérée séparée est préenregistrée dans `PORTFOLIO_PROBABILITY_ACCELERATED_HISTORICAL_V1.md`. Elle conserve l'horizon de douze mois et peut rejeter la revendication plus tôt si une défaite Brier tenant compte de la dépendance est démontrée. Une victoire rétrospective reste limitée à un soutien et ne remplace pas la validation prospective.

## Données exactes

Le même pipeline acceptera un export CSV `date,level` seulement avec un manifeste indiquant fournisseur, référence de licence, indice, variante de rendement, devise et `validationEligible: true`. Aucune source proxy ne peut être requalifiée silencieusement en donnée exacte.
