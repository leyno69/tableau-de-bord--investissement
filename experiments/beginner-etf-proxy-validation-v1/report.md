# Rapport — validation empirique par proxy ETF v1

## Périmètre

Portefeuille `beginner` : 50 % proxy World, 15 % PAEJ réel, 35 % cash. Le proxy World est IWDA.AS (ISIN IE00B4L5Y983), choisi avant lecture des résultats en raison de son benchmark déclaré MSCI World Index (Net) et de son historique depuis 2009.

Cette piste n'est pas une validation officielle MSCI. Elle constitue une preuve empirique structurée sur instruments de marché réels.

## Résultats annuels

| Fenêtre | Rendement cumulé | Volatilité annualisée | Drawdown max | Bande valeur finale | Bande drawdown |
| --- | ---: | ---: | ---: | --- | --- |
| 2015 | +5,46 % | 13,85 % | -14,84 % | médiane–p75 | médiane–p95 |
| 2018 | -3,67 % | 9,38 % | -9,69 % | p05–p25 | médiane–p95 |
| 2020 | +4,01 % | 16,10 % | -21,68 % | p25–médiane | **p95–maximum** |
| 2022 | -8,89 % | 10,75 % | -10,07 % | p05–p25 | médiane–p95 |
| 2023 | +8,85 % | 6,95 % | -4,72 % | médiane–p75 | sous médiane |

## Confrontation à la simulation annuelle

Simulation de référence : 10 000 trajectoires, graine `20260807`.

Valeur finale simulée : p05 8 787,00 €, médiane 10 407,21 €, p95 12 200,97 €.

Drawdown simulé : médiane 6,74 %, p95 15,82 %, maximum 27,98 %.

Les cinq valeurs finales historiques restent dans la bande p05–p95. En revanche, le drawdown 2020 de 21,68 % dépasse le p95 simulé de 15,82 %, tout en restant sous le maximum simulé de 27,98 %.

## Preuve adverse

La fenêtre 2020 indique que la partie centrale de la distribution de drawdown peut sous-estimer certains épisodes de stress réels. Cette observation ne suffit pas à réfuter le moteur, puisque le choc reste dans l'enveloppe extrême simulée, mais elle interdit de considérer la calibration du risque comme démontrée.

Aucune borne n'a été modifiée après observation de ce résultat.

## État de preuve

Cette campagne renforce la robustesse empirique du moteur sur plusieurs régimes distincts et confirme que les rendements observés restent couverts par la distribution annuelle testée. Elle apporte simultanément une contradiction importante sur le risque de drawdown.

Le statut demeure `supporting-empirical-evidence` : les données publiques Yahoo et le proxy IWDA ne doivent pas être présentés comme données MSCI officielles licenciées.

## Prochaine conséquence méthodologique

Avant toute modification du moteur, la preuve adverse 2020 doit être confrontée à d'autres fenêtres, aux résultats trimestriels déjà défavorables et à une future modélisation instrument par instrument avec dépendances/corrélations. Une correction du moteur ne doit intervenir que si la sous-estimation du risque se répète de manière robuste.
