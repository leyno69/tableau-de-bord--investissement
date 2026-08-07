# Validation prospective des probabilités de portefeuille — v1

## Statut

Protocole préenregistré et techniquement verrouillé avant toute première prévision. Statut initial : `blocked-before-first-forecast`.

Cette campagne peut valider uniquement les probabilités du moteur référencé, pour la cohorte, l’horizon, les sources et la règle de décision définis ci-dessous. Elle ne peut pas démontrer une validité universelle du moteur.

## Hypothèse testée

À horizon douze mois, les probabilités produites par le moteur mensuel inchangé sont mieux calibrées que le taux de base dynamique point-in-time pour l’événement « valeur finale supérieure à la valeur initiale ».

## Paramètres figés

- commit moteur : `66d09ccf94bdec3b5c4e1e09fc406e6ccc5df6b9` ;
- cohorte : `defensive`, `beginner`, `dynamic`, `world-only` ;
- fréquence des rendements : mensuelle ;
- moyenne et variance estimées uniquement avec les observations disponibles avant `asOf` ;
- loi de simulation : gaussienne mensuelle du moteur inchangé ;
- 5 000 trajectoires par prévision ;
- horizon : douze mois ;
- intervalles centraux : 50 % et 90 % ;
- score primaire : Brier ;
- benchmark principal : taux de base dynamique point-in-time ;
- recalibration interdite avant la décision finale.

## Calendrier Europe/Paris

La première vague comporte huit origines trimestrielles du 1er octobre 2026 au 1er juillet 2028. Chaque cible locale est interprétée dans le fuseau `Europe/Paris`. Le scellement intervient à la première observation éligible après la clôture du mois précédent, et l’horodatage UTC exact est inscrit dans chaque prévision.

Ce calendrier organise la collecte ; il ne rend pas les observations indépendantes. Les horizons de douze mois se chevauchent et les portefeuilles partagent des sous-jacents. Le nombre indépendant reste `null` tant qu’une analyse de dépendance préenregistrée n’a pas démontré un effectif effectif défendable.

## Barrière anti-fuite

Une prévision scellée contient obligatoirement `asOf`, `sealedAt`, `maturesAt`, le commit moteur, l’empreinte des hypothèses, les empreintes des manifestes et des données d’entrée, la graine, la probabilité du moteur, le benchmark point-in-time et les intervalles. Les champs `outcome`, `binaryOutcome`, `observedAt` et `settlement` sont interdits lors du scellement. `sealedAt` ne peut être ni futur par rapport à l’horloge de scellement, ni postérieur à la maturité.

Le résultat ne peut être associé qu’après maturité. Cette barrière logicielle rend les violations détectables ; elle ne prouve pas à elle seule l’absence de tout biais humain ou opérationnel.

## Règle de décision

La campagne ne peut devenir favorable que si toutes les conditions suivantes sont satisfaites :

1. données exactes/licenciées et traçables ;
2. holdout prospectif resté inaccessible jusqu’aux maturités ;
3. au moins 100 prévisions effectivement indépendantes ou une justification de dépendance préenregistrée équivalente ;
4. couverture compatible avec les niveaux 50 % et 90 % selon une méthode d’incertitude adaptée à la dépendance ;
5. Brier score du moteur strictement inférieur au benchmark dynamique ;
6. absence de recalibration ou de sélection de sous-groupe après observation.

Une réussite ne valide que le périmètre testé. Un échec reste publié et interdit l’exposition des probabilités réelles. Un effectif insuffisant produit `inconclusive`, jamais une validation implicite.

## Blocage initial conservé

Les séries `worldProxy` et `paej` exactes/licenciées ne sont pas présentes. Le dépôt ne scelle donc aucune prévision de validation et n’utilise aucun proxy de développement à leur place.
