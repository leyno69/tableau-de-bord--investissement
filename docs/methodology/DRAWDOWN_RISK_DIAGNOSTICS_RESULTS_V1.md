# Résultats du diagnostic de drawdown — v1

## Résultat principal

Le diagnostic a identifié un défaut de comparabilité dans les confrontations précédentes : le moteur `beginner` calcule son drawdown sur des états mensuels, tandis que le replay historique calculait le drawdown sur des observations quotidiennes.

Sur les cinq fenêtres annuelles préenregistrées, le drawdown quotidien est systématiquement supérieur ou égal au drawdown échantillonné en fin de mois. L'écart maximal apparaît en 2020 :

- drawdown quotidien : 21,68 % ;
- drawdown mensuel apparié : 11,51 % ;
- écart intra-mois : 10,17 points ;
- p95 simulé annuel : 15,82 %.

Le dépassement 2020 du p95 disparaît donc lorsque les fréquences sont appariées. L'ancienne observation quotidienne reste conservée comme information de risque haute fréquence, mais elle ne peut plus être utilisée comme preuve adverse contre une distribution de drawdown simulée mensuellement.

## Diagnostics de distribution

Sur 55 rendements mensuels observés dans les cinq fenêtres :

- volatilité mensuelle échantillonnale : 2,88 % ;
- skewness : -0,149 ;
- excès de kurtosis : -0,029 ;
- deux observations dépassent 2 écarts-types du modèle de référence ;
- aucune ne dépasse 3 écarts-types ;
- autocorrélation de rang 1 des rendements absolus : 0,133.

Ces résultats ne démontrent pas que la loi gaussienne est correcte. Ils montrent seulement que, dans cet échantillon limité, les queues épaisses ou le clustering mensuel ne fournissent pas une explication plus forte que le défaut d'appariement de fréquence identifié.

## Corrélation entre actifs

La corrélation quotidienne IWDA/PAEJ varie de 0,584 à 0,886 selon les fenêtres, moyenne 0,769. Cette dépendance est pertinente pour une future modélisation instrument par instrument.

Elle ne peut toutefois pas expliquer directement le défaut du pilote actuel, car le preset `beginner` testé est simulé comme un actif synthétique agrégé unique.

## Décision méthodologique

Aucune modification des paramètres du moteur n'est justifiée par ce diagnostic.

La correction prioritaire est méthodologique : toute comparaison de drawdown doit désormais utiliser une fréquence d'observation appariée. Les drawdowns quotidiens peuvent être conservés comme métrique de risque séparée, mais jamais comparés directement à une distribution de drawdown mensuelle.

## Preuve de reproductibilité

Workflow : `31191350399`  
Artefact : `8998929082`  
SHA-256 : `96c4093fc2b93dcee2b7d72cb222730d3fcefeeecb361c0835efd97bbb0cdb67`
