# Comparaison simulation / historique — v1

## Finalité

Cette couche confronte des métriques issues d’un instantané de simulation préenregistré à une trajectoire historique calculée selon les conventions du replay LEYNOR.

Elle sert à mesurer des écarts observés. Elle ne transforme pas une réalisation historique en preuve de pouvoir prédictif.

## Métriques v1

La comparaison porte sur :

- rendement historique ajusté des flux externes vs rendement moyen simulé ;
- volatilité historique annualisée vs volatilité moyenne simulée ;
- drawdown maximal historique vs drawdown maximal moyen simulé ;
- durée de récupération historique, lorsqu’elle est observée, vs durée moyenne simulée.

Chaque comparaison conserve la valeur historique, la valeur simulée, l’écart signé et, lorsque le dénominateur le permet, l’erreur relative par rapport à la valeur simulée.

## Interdiction de verdict arbitraire

La v1 n’applique aucun seuil de réussite, aucune note, aucun score de qualité et aucune classe du type « simulation correcte » ou « simulation incorrecte ».

Un tel verdict exigerait une calibration préenregistrée, plusieurs fenêtres indépendantes, une validation hors échantillon et une analyse de sensibilité. Sans ces éléments, les écarts restent descriptifs.

## Compatibilité des définitions

Une comparaison n’est interprétable que si les métriques historiques et simulées ont des définitions compatibles. Une ressemblance de nom ne suffit pas.

En particulier, le rendement historique neutralise les apports externes. Toute métrique simulée comparée doit mesurer la performance selon une convention économiquement compatible.

## Limites

- une réalisation historique unique n’est pas une distribution ;
- les résultats dépendent de la fenêtre historique choisie ;
- les coûts, rééquilibrages et politiques de données doivent rester traçables ;
- une piste proxy décrit le proxy et non le fonds réel ;
- aucune conclusion de rendement futur ne peut être déduite de cette confrontation.
