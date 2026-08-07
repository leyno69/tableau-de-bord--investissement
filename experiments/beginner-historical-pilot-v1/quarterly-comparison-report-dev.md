# Comparaison trimestrielle appariée — development v1

## Objet

Comparer huit fenêtres historiques trimestrielles exactes du preset `beginner` à une distribution simulée de même horizon : 3 mois.

## Distribution simulée

10 000 trajectoires, graine `20260807`, capital initial 10 000 €, rendement annuel agrégé 4,5 %, volatilité annuelle agrégée 10 %, sans apport, frais ni inflation.

### Valeur finale

- p05 : 9 297,20 €
- p25 : 9 759,23 €
- médiane : 10 092,47 €
- p75 : 10 454,32 €
- p95 : 10 952,85 €

### Drawdown

- médiane : 2,33 %
- p95 : 7,87 %
- maximum simulé : 16,51 %

## Positionnement des huit trimestres historiques

| Fenêtre | Bande valeur finale | Bande drawdown |
|---|---|---|
| 2024-Q2 | médiane–p75 | sous médiane |
| 2024-Q3 | médiane–p75 | médiane–p95 |
| 2024-Q4 | médiane–p75 | sous médiane |
| 2025-Q1 | p05–p25 | médiane–p95 |
| 2025-Q2 | médiane–p75 | **p95–maximum** |
| 2025-Q3 | p75–p95 | sous médiane |
| 2025-Q4 | médiane–p75 | médiane–p95 |
| 2026-Q1 | p25–médiane | médiane–p95 |

## Preuve adverse principale

Le drawdown historique de **2025-Q2 atteint 8,68 %**, alors que le p95 simulé est **7,87 %**. Il reste sous le maximum simulé de **16,51 %**.

Ce dépassement est conservé comme preuve adverse descriptive. Il n'est ni supprimé ni utilisé pour élargir rétroactivement la distribution simulée.

## Lecture méthodologique

La valeur finale des huit fenêtres reste à l'intérieur de p05–p95. En revanche, le risque intra-période fournit une information plus sévère : une fenêtre dépasse le p95 de drawdown.

Cela montre qu'une validation fondée uniquement sur le rendement final aurait manqué une faiblesse importante du modèle.

## Limites

- historique Yahoo Finance classé development-only ;
- huit fenêtres seulement ;
- hypothèse simulée agrégée ;
- absence de matrice de corrélation entre actifs ;
- modèle mensuel gaussien simplifié ;
- aucun verdict scientifique ou taux de réussite n'est calculé.

## Prochaine investigation

La preuve adverse 2025-Q2 doit être confrontée à une évolution du modèle qui traite explicitement la dépendance entre actifs et les régimes de volatilité, mais cette évolution doit être testée sur de nouvelles fenêtres ou selon un protocole préenregistré afin d'éviter tout ajustement opportuniste au trimestre qui vient d'être observé.
