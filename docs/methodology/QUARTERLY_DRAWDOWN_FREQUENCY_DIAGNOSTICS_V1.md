# Diagnostic trimestriel de fréquence du drawdown — v1

## Objet

Ce diagnostic applique la règle LEYNOR d’appariement de fréquence aux huit fenêtres trimestrielles exactes déjà comparées à la simulation `beginner` de trois mois.

Le moteur évolue mensuellement. Son drawdown simulé est donc mesuré sur les états mensuels. Un drawdown historique quotidien ne peut être traité comme une observation appariée de cette distribution sans rééchantillonnage.

## Résultat principal

La fenêtre `2025-Q2` avait produit un drawdown quotidien de `8,6789 %`, supérieur au p95 simulé de trois mois (`7,8686 %`).

Après échantillonnage de la trajectoire historique aux fins de mois, son drawdown apparié est `0 %` sur cette fenêtre. Le dépassement du p95 disparaît donc.

Sur les huit fenêtres trimestrielles :

- une fenêtre dépasse le p95 avec le drawdown quotidien (`2025-Q2`) ;
- aucune fenêtre ne dépasse le p95 avec le drawdown historique échantillonné mensuellement ;
- l’écart intramensuel maximal observé est `8,6789 points` sur `2025-Q2`.

## Interprétation

L’ancienne observation quotidienne reste conservée comme information sur le risque intramensuel. Elle n’est plus considérée comme preuve adverse appariée contre la distribution mensuelle du moteur.

Cette correction ne valide pas la distribution gaussienne et ne justifie aucune recalibration du moteur. Elle montre seulement que la précédente contradiction mélangeait deux fréquences de mesure différentes.

## Conséquence pour le moteur

Aucune modification du moteur de risque n’est justifiée par les dépassements 2020 ou 2025-Q2 tels qu’ils avaient été formulés initialement. Le prochain diagnostic doit donc porter séparément sur :

- la qualité de la distribution mensuelle (queues, asymétrie, volatilité) ;
- le risque intramensuel, si LEYNOR souhaite l’exposer comme métrique distincte ;
- la dépendance entre instruments lors d’une future modélisation instrument par instrument.

## Limites

- huit trimestres constituent encore un petit échantillon ;
- Yahoo reste une source `development-only` pour la piste exacte ;
- un drawdown mensuel nul n’implique pas absence de risque pendant le mois ;
- l’analyse ne démontre aucune capacité prédictive.
