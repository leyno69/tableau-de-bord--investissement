# Métriques historiques v1 — validation des portefeuilles

## Objet

Ce document fixe les conventions de mesure appliquées aux trajectoires issues du moteur de replay historique. Les conventions sont définies avant l’ouverture des résultats historiques de validation.

## Neutralisation des flux externes

Un apport de capital n’est pas une performance. Pour chaque période après la première valorisation, le rendement est calculé comme :

`r_t = (V_t - F_t) / V_(t-1) - 1`

où `V_t` est la valeur du portefeuille après exécution des événements du jour et `F_t` le flux externe net du jour.

La trajectoire cumulée est obtenue par chaînage géométrique de ces rendements. Le capital d’ouverture inclut les flux externes présents à la première date afin que leur montant ne soit pas assimilé à un rendement.

Les coûts de transaction restent inclus dans la performance : ils ne sont pas neutralisés comme des flux externes.

## Rendement cumulé

Le rendement cumulé est celui de l’indice de richesse ajusté des flux. Il ne correspond pas au simple ratio `valeur finale / capital initial` lorsqu’il existe des apports ou retraits.

## Rendement annualisé

Le rendement annualisé utilise la durée calendaire réelle entre la première et la dernière observation et une année conventionnelle de `365.2425` jours :

`(1 + rendement_cumulé)^(365.2425 / durée_en_jours) - 1`.

Cette convention est versionnée. La modifier exige une nouvelle version méthodologique.

## Volatilité annualisée

La volatilité utilise l’écart-type échantillonnal (`n-1`) des rendements de période ajustés des flux et un facteur d’annualisation `sqrt(252)` pour les observations quotidiennes de marché.

Cette valeur est une convention de comparaison. Elle ne prétend pas que chaque année comporte exactement 252 séances ni que les rendements sont indépendants ou normalement distribués.

## Drawdown maximal

Le drawdown est calculé sur l’indice de richesse ajusté des flux, et non sur la valeur brute du compte. Le drawdown maximal est la plus forte baisse relative entre un sommet antérieur et une valorisation ultérieure.

Les apports ne peuvent donc pas masquer artificiellement un drawdown.

## Récupération

Pour le drawdown maximal, le rapport conserve :

- la date du sommet précédent ;
- la date du creux ;
- la date de récupération lorsque le sommet précédent est retrouvé ou dépassé ;
- le nombre de jours calendaires du creux à la récupération ;
- le nombre total de jours sous le sommet précédent.

Si la trajectoire se termine avant récupération, le statut reste explicitement `non récupéré` et aucune durée fictive n’est produite.

## Limites

- les conventions ci-dessus décrivent la trajectoire réellement rejouée ; elles ne transforment pas l’histoire en prévision ;
- la volatilité annualisée dépend de la fréquence des observations et de la convention 252 ;
- le rendement annualisé peut être trompeur sur une fenêtre très courte ; la durée brute doit toujours rester disponible ;
- les métriques d’une piste proxy restent des métriques du proxy, jamais celles de l’instrument réel avant son existence ;
- aucune métrique ne peut être comparée à une simulation si sa définition n’est pas rendue compatible dans le protocole de confrontation.

## Garde-fou

Les seuils d’acceptation ou de réfutation ne sont pas définis dans ce module. Ils appartiennent au protocole préenregistré de confrontation simulation/histoire et ne doivent pas être choisis après lecture des résultats.