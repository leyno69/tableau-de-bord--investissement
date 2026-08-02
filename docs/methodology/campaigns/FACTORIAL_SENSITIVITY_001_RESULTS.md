# Campagne factorielle de sensibilité 001 — résultats consolidés

## Statut

Campagne exécutée intégralement selon le protocole fusionné par la PR #218.

- 2 880 réplications factorielles
- 250 trajectoires par réplication
- 720 000 trajectoires au total
- 5 graines indépendantes par cellule
- horizons : 10, 20 et 30 ans

Ces résultats proviennent d'un modèle synthétique. Ils servent à comparer des scénarios et ne constituent ni une prévision, ni une recommandation, ni une calibration automatique de l'IGL.

## Effets principaux agrégés

Les valeurs ci-dessous sont les médianes calculées à travers les cellules du plan factoriel.

| Facteur | Niveau | Valeur finale médiane | Drawdown médian | Retrait forcé médian | Récupération médiane |
|---|---:|---:|---:|---:|---:|
| Comportement | Régulier | 134 266 € | 20,65 % | 1 800 € | 11,5 mois |
| Comportement | Interruption | 118 711 € | 30,09 % | 5 400 € | 33 mois |
| Réserve | 0 mois | 124 678 € | 28,74 % | 4 500 € | 27 mois |
| Réserve | 6 mois | 128 028 € | 24,98 % | 2 700 € | 20,5 mois |
| Lignes | 5 | 125 045 € | 27,34 % | 3 600 € | 24 mois |
| Lignes | 15 | 126 727 € | 26,08 % | 3 600 € | 24 mois |
| Volatilité | 12 % | 129 905 € | 20,50 % | 3 600 € | 24 mois |
| Volatilité | 20 % | 122 156 € | 30,33 % | 3 600 € | 24 mois |
| Corrélation | 0,10 | 130 249 € | 19,80 % | 3 600 € | 24 mois |
| Corrélation | 0,35 | 126 554 € | 26,27 % | 3 600 € | 24 mois |
| Corrélation | 0,75 | 120 680 € | 33,30 % | 3 600 € | 24 mois |
| Choc | 0 € | 131 408 € | 17,04 % | 900 € | non interprétable sans choc ponctuel |
| Choc | 1 800 € | 127 549 € | 21,37 % | 2 700 € | 4 mois |
| Choc | 3 600 € | 124 154 € | 26,47 % | 4 500 € | 16 mois |
| Choc | 7 200 € | 116 014 € | 45,38 % | 8 100 € | 27,5 mois |

## Stabilité entre graines

Pour chaque cellule, l'étendue des cinq valeurs finales médianes a été divisée par leur médiane.

- dispersion relative médiane : 5,09 %
- 90e percentile de dispersion relative : 10,11 %
- dispersion relative maximale : 22,33 %

La stabilité est suffisante pour poursuivre l'analyse, mais la valeur maximale interdit de traiter toutes les cellules comme également robustes. Les prochaines analyses devront signaler les cellules instables et augmenter les réplications lorsque nécessaire.

## Conclusions limitées au modèle

1. L'interruption des versements détériore simultanément la valeur finale, le drawdown, les retraits forcés et la durée de récupération.
2. Une réserve de six mois réduit les retraits forcés et améliore la récupération dans le protocole utilisé.
3. Le passage de cinq à quinze lignes apporte un effet plus faible que la variation de corrélation.
4. La corrélation et la volatilité modifient fortement les scénarios défavorables.
5. L'intensité du choc produit un effet non linéaire : le choc de 7 200 € dégrade fortement le drawdown médian.
6. Les facteurs interagissent ; ces effets principaux ne doivent pas être convertis directement en points indépendants de l'IGL.

## Limites

- rendements lognormaux synthétiques et indépendance temporelle ;
- corrélation équicorrélée constante ;
- absence de frais, fiscalité et inflation ;
- absence de coût d'opportunité de la réserve ;
- actifs homogènes en rendement attendu et volatilité au sein d'une cellule ;
- choc positionné au même mois ;
- aucune calibration historique multi-régimes ;
- la récupération sans choc ponctuel n'est pas une métrique interprétable et doit être affichée comme non applicable dans les futurs rapports.

## Décision méthodologique

Aucune pondération de l'IGL n'est créée par cette campagne. La prochaine étape est une analyse structurée des interactions et de la robustesse, avec classement des cellules par stabilité et réplications supplémentaires pour les zones les plus instables.
