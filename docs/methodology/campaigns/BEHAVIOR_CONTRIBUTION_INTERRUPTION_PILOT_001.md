# Rapport de campagne — interruption temporaire des versements

## Identité

- Campagne : `behavior-contribution-interruption-pilot-001`
- Objet : comparer des versements mensuels réguliers à une interruption de douze mois, du mois 25 au mois 36.
- Échelle : 20 000 trajectoires, soit 2 scénarios × 4 horizons × 5 graines × 500 trajectoires.
- Horizons : 5, 10, 20 et 30 ans.
- Graines : 104729, 130363, 155921, 181081 et 206369.

## Hypothèses

- capital initial : 10 000 € ;
- versement mensuel : 300 € ;
- rendement géométrique annuel hypothétique : 5 % ;
- volatilité annuelle hypothétique : 15 % ;
- rendements mensuels lognormaux indépendants ;
- aucun frais, impôt ou effet d’inflation.

Ces hypothèses servent uniquement à comparer des scénarios. Elles ne constituent ni une prévision ni une promesse de rendement.

## Résultats consolidés

| Horizon | Médiane régulière | Médiane avec interruption | Écart nominal | Écart relatif |
|---:|---:|---:|---:|---:|
| 5 ans | 32 111 € | 28 128 € | 3 983 € | 14,16 % |
| 10 ans | 59 072 € | 54 274 € | 4 799 € | 8,84 % |
| 20 ans | 134 854 € | 126 336 € | 8 517 € | 6,74 % |
| 30 ans | 245 602 € | 232 650 € | 12 952 € | 5,57 % |

La médiane du scénario avec interruption est inférieure pour les quatre horizons et pour l’ensemble consolidé des cinq graines. Le résultat décrit l’effet mécanique d’une année de versements manquants dans ce modèle précis ; il ne démontre pas une causalité générale applicable à tout marché ou à tout investisseur.

## Dispersion

Médianes inter-graines des percentiles finaux :

| Scénario | Horizon | P10 | Médiane | P90 |
|---|---:|---:|---:|---:|
| Régulier | 5 ans | 24 281 € | 32 111 € | 43 778 € |
| Interruption | 5 ans | 21 022 € | 28 128 € | 38 688 € |
| Régulier | 10 ans | 38 848 € | 59 072 € | 88 985 € |
| Interruption | 10 ans | 36 153 € | 54 274 € | 81 444 € |
| Régulier | 20 ans | 75 589 € | 134 854 € | 247 663 € |
| Interruption | 20 ans | 72 192 € | 126 336 € | 230 533 € |
| Régulier | 30 ans | 122 000 € | 245 602 € | 517 954 € |
| Interruption | 30 ans | 118 161 € | 232 650 € | 488 348 € |

La dispersion s’élargit fortement avec l’horizon. Cette observation interdit de résumer la campagne par une seule valeur centrale.

## Probabilité simulée de terminer au-dessus des apports nominaux

| Scénario | 5 ans | 10 ans | 20 ans | 30 ans |
|---|---:|---:|---:|---:|
| Régulier | 72,8 % | 78,8 % | 86,6 % | 91,4 % |
| Interruption | 72,2 % | 79,2 % | 86,4 % | 91,2 % |

Ces probabilités sont internes au modèle synthétique. Elles ne peuvent pas être présentées comme des probabilités de marché réelles.

## Drawdowns simulés

Les drawdowns médians augmentent avec la durée d’observation, car un horizon plus long offre davantage d’occasions de rencontrer un repli. Cette métrique ne doit donc pas être comparée entre horizons sans tenir compte de cette différence d’exposition temporelle.

## Robustesse inter-graines

Les cinq réplications produisent le même classement des médianes : le scénario régulier termine au-dessus du scénario interrompu pour chaque horizon. La stabilité directionnelle est encourageante, mais cinq graines restent insuffisantes pour une validation définitive. La campagne doit être reproduite avec d’autres distributions, régimes, fenêtres d’interruption et hypothèses de frais.

## Limites critiques

1. Le modèle de rendement est synthétique et n’est pas calibré sur des régimes historiques.
2. Les rendements mensuels sont indépendants, sans autocorrélation ni queues épaisses.
3. Les frais, impôts et l’inflation sont exclus.
4. L’interruption est fixe et ne modélise ni perte de revenu ni retrait forcé.
5. La campagne ne compare pas encore l’arrêt suivi d’une reprise progressive.
6. Les résultats ne doivent alimenter ni l’IGL ni une recommandation avant validation indépendante.

## Conclusion méthodologique

Cette première campagne valide le pipeline technique et montre, dans les hypothèses retenues, qu’une interruption de versements réduit la valeur finale médiane. Elle ne suffit pas à fixer une règle produit, un score, une pondération ou un conseil. La prochaine campagne doit tester plusieurs durées d’interruption, la reprise progressive, les retraits forcés et des modèles de rendement plus réalistes.

Les résultats détaillés par graine sont conservés dans `behavior-contribution-interruption-pilot-001-replications.csv`.
