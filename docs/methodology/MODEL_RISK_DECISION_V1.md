# Décision de risque modèle — v1

## Décision

Le moteur de production `beginner` reste inchangé à ce stade.

## Éléments convergents

1. Le dépassement annuel 2020 initial de drawdown provenait d’une comparaison quotidienne contre une distribution mensuelle. En fréquence mensuelle appariée, le drawdown 2020 est de 11,51 % et ne dépasse plus le p95 mensuel.
2. Dans le comparateur gaussien quotidien préenregistré, les huit fenêtres trimestrielles sont sous le p95. La fenêtre annuelle 2020 reste au-dessus du p95 quotidien mais se situe presque exactement au p99 simulé.
3. La normalité mensuelle est rejetée à 5 % sur le diagnostic 2014–2023, ce qui constitue une limite réelle de l’hypothèse gaussienne.
4. Une Student-t à queues épaisses ne démontre pas une amélioration hors période d’estimation : elle gagne 1 fold sur 3 et dégrade le score de validation agrégé.
5. Une variance conditionnelle EWMA gagne 2 folds sur 3, mais dégrade également le score de validation agrégé en raison du premier fold.

## Interprétation

Les données indiquent que l’hypothèse gaussienne est une approximation imparfaite de la distribution mensuelle, mais les alternatives simples testées ne démontrent pas encore une amélioration suffisamment stable pour justifier une complexification du moteur.

Le risque intramensuel doit rester visible dans la restitution, car un moteur mensuel ne mesure pas les creux quotidiens. Cela justifie un diagnostic de risque haute fréquence séparé, pas une substitution silencieuse du moteur mensuel.

## Règle de gouvernance

Aucune modification du moteur de production ne sera introduite pour faire disparaître une preuve adverse. Une nouvelle mécanique de distribution ou de volatilité devra obtenir une amélioration reproductible sur plusieurs validations temporelles et ensuite passer un test hors échantillon distinct.

## Prochaine étape

Tester la généralisation des conclusions sur d’autres presets ou structures de portefeuille avant d’investir davantage de complexité dans le modèle `beginner`.
