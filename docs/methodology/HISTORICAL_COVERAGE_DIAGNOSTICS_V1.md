# Diagnostic descriptif de couverture historique — v1

## Finalité

Ce diagnostic positionne une observation historique dans les bandes déjà produites par une simulation préenregistrée. Il sert à rendre la confrontation lisible et reproductible, pas à attribuer un score de qualité au modèle.

## Valeur finale

Les bandes utilisées sont : sous p05, p05–p25, p25–médiane, médiane–p75, p75–p95 et au-dessus de p95.

## Drawdown

Le drawdown historique est comparé en valeur absolue au drawdown médian, au p95 et au maximum simulé. Les bandes sont purement descriptives.

## Interdictions

Le diagnostic ne doit jamais :

- transformer une bande en verdict de réussite ou d’échec ;
- traiter plusieurs fenêtres chevauchantes comme observations indépendantes ;
- convertir un comptage de bandes en probabilité calibrée sans protocole dédié ;
- masquer une observation au-delà de p95 ou du maximum simulé.

Toute observation extrême doit rester visible et déclencher une investigation méthodologique, pas une suppression de donnée.

## Statut actuel

La première utilisation porte sur six fenêtres glissantes du preset `beginner`, avec une source historique classée développement uniquement. Aucun verdict scientifique n’est produit.
