# Registre des classifications du niveau de preuve

Ce registre conserve chaque résultat produit par le classificateur de niveau de preuve.

## Principes

- Une classification attribuée référence obligatoirement une règle calibrée, sa version, la calibration et la validation croisée utilisées.
- Un résultat sans règle applicable reste `unclassified` et conserve ses blocages.
- Les enregistrements sont immuables, versionnés et dédupliqués par empreinte.
- Un remplacement pointe explicitement vers l’enregistrement antérieur.

## Limites

Le registre garantit la traçabilité. Il ne démontre pas la qualité scientifique des campagnes, ne calcule aucun niveau de confiance, aucun IGL et ne constitue pas une recommandation d’investissement.
