# Expérience LEYNOR — 50 000 portefeuilles hétérogènes

Date d'exécution : 1 août 2026

## Question étudiée

Mesurer l'effet combiné du capital initial, des versements mensuels, du profil de risque, de l'allocation et de l'horizon, tout en conservant le même univers d'actifs.

## Univers conservé

- WPEA — ETF Monde
- PAEJ — ETF Asie
- NVDA — NVIDIA
- SMH — ETF semi-conducteurs
- CASH — liquidités

## Population simulée

- 50 000 portefeuilles
- Capitaux initiaux : 2 000 €, 5 000 €, 10 000 €, 20 000 €
- Versements mensuels : 0 €, 50 €, 100 €, 200 €, 300 €
- Profils : prudent, modéré, agressif
- Horizons : 5, 10, 15, 20 et 30 ans
- Allocations variables autour d'une allocation centrale propre à chaque profil
- Frais annuels tirés entre 0,15 % et 0,50 %
- Inflation annuelle tirée entre 1,5 % et 3,5 %

Chaque portefeuille a sa propre allocation et sa propre trajectoire de marché. Il ne s'agit donc pas de 50 000 répétitions strictes du même portefeuille.

## Résultats globaux

- Valeur finale nominale médiane : 40 063 €
- Valeur finale nominale au 5e percentile : 5 239 €
- Valeur finale nominale au 95e percentile : 259 289 €
- Valeur finale réelle médiane : 28 023 €
- Drawdown maximal médian : 28,6 %
- Drawdown maximal au 95e percentile : 60,1 %
- Rendement médian par rapport au total versé : 52,1 %

## Lecture par profil

| Profil | Nombre | Médiane nominale | Médiane réelle | Drawdown médian | Rendement médian / versements |
|---|---:|---:|---:|---:|---:|
| agressif | 16 665 | 41 471 € | 28 981 € | 38,2 % | 59,7 % |
| modéré | 16 665 | 40 786 € | 28 507 € | 28,7 % | 54,9 % |
| prudent | 16 670 | 38 314 € | 26 832 € | 21,1 % | 44,7 % |

## Lecture par capital initial

| Capital | Nombre | Médiane nominale | Médiane réelle | Rendement médian / versements |
|---:|---:|---:|---:|---:|
| 2 000 € | 12 525 | 24 875 € | 17 734 € | 46,3 % |
| 5 000 € | 12 525 | 31 160 € | 22 124 € | 50,9 % |
| 10 000 € | 12 500 | 41 302 € | 28 736 € | 53,8 % |
| 20 000 € | 12 450 | 60 950 € | 42 564 € | 59,0 % |

## Lecture par horizon

| Horizon | Nombre | Médiane nominale | Médiane réelle | Drawdown médian | Rendement médian / versements |
|---:|---:|---:|---:|---:|---:|
| 5 ans | 10 000 | 18 850 € | 16 644 € | 17,5 % | 17,6 % |
| 10 ans | 10 000 | 31 326 € | 24 444 € | 24,5 % | 36,2 % |
| 15 ans | 10 000 | 45 770 € | 31 755 € | 29,4 % | 56,7 % |
| 20 ans | 10 000 | 62 618 € | 38 353 € | 33,3 % | 80,9 % |
| 30 ans | 10 000 | 110 587 € | 53 190 € | 39,0 % | 140,3 % |

## Interprétation

Cette expérience répond à une question de construction patrimoniale, pas à une question de trading court terme. Elle ne doit pas servir directement à recalibrer les probabilités du radar spéculatif.

Le profil agressif obtient une médiane supérieure, mais subit aussi un drawdown médian nettement plus élevé. Le capital initial et l'horizon produisent un effet marqué. Les versements mensuels restent cependant un facteur déterminant, en particulier pour les petits capitaux initiaux.

## Limites

- Les rendements et volatilités sont des hypothèses, pas des prévisions.
- Les distributions mensuelles restent simplifiées.
- Les régimes de crise et de croissance sont simulés.
- Les impôts, changements de fiscalité et comportements émotionnels ne sont pas modélisés.
- Les résultats ne constituent ni une recommandation ni une probabilité garantie.

## Prochaine expérience recommandée

Conserver les 50 000 portefeuilles et modifier un seul groupe d'hypothèses à la fois : univers d'actifs, fréquence de rééquilibrage, interruptions de versements, durée des crises ou frais. Cette méthode permettra d'attribuer correctement les écarts de résultats.
