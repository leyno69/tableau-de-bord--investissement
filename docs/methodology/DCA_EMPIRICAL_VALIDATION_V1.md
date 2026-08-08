# Validation empirique du calculateur DCA — v1

## Objet

Confronter la projection DCA déterministe du preset `dca` à des séquences historiques réelles, sans la transformer en modèle probabiliste.

## Sémantique validée

Le calculateur `simulateDca` utilise 3 000 € initiaux, 150 € versés chaque mois pendant 60 mois et un rendement annuel constant de 7 %. Chaque mois, le rendement est appliqué avant le versement mensuel. Cette expérience reproduit exactement cette convention.

Le montant de cash restant dans le preset de portefeuille n’est pas inclus : l’outil DCA est un calculateur séparé et sa validation ne doit pas être confondue avec celle du portefeuille complet.

## Proxy historique

`IWDA.AS` est utilisé comme proxy ETF Monde pour disposer d’un historique antérieur à WPEA. Cette piste reste une preuve empirique de soutien et non une validation officielle du benchmark MSCI.

## Fenêtres

Trois fenêtres de cinq ans sont figées : 2010–2014, 2015–2019 et 2020–2024. Le capital initial est positionné au dernier cours ajusté du mois précédent ; chaque mois suivant applique le rendement réalisé puis ajoute 150 €.

## Interprétation

L’écart entre la valeur finale historique et la projection déterministe mesure la sensibilité du résultat à la séquence de marché réelle. Il ne constitue pas une erreur prédictive calibrée, car le calculateur DCA ne produit aucune distribution de probabilité.

## Limites

Trois fenêtres ne permettent pas de calibrer une probabilité de réussite. Les résultats dépendent du proxy, de la période et de l’hypothèse de versement en fin de mois.
