# Rapport — campagne confirmatoire multi-portefeuilles v1

## Résultat

Empreinte du résultat intégral : `5477f00d0b8b28e113a9ab328fcf2f0a81a1f07e359f79694a5088c5607cce33`.

Sur les douze cellules formées par quatre allocations et trois folds temporels :

- Student-t gagne 4 cellules sur 12 (33,3 %) et dégrade la log-vraisemblance négative agrégée de 5,975 ;
- EWMA gagne 6 cellules sur 12 (50 %) et dégrade la log-vraisemblance négative agrégée de 6,472 ;
- le seuil préenregistré de 75 % de victoires avec amélioration agrégée n’est atteint par aucun modèle ;
- aucun prototype alternatif n’est autorisé par la règle de décision.

## Drawdowns mensuels appariés

| Portefeuille | Historique | Médiane gaussienne | P95 gaussien | Position |
|---|---:|---:|---:|---|
| defensive | 9,69 % | 7,09 % | 12,63 % | médiane–p95 |
| beginner | 13,75 % | 10,75 % | 18,86 % | médiane–p95 |
| dynamic | 17,46 % | 14,54 % | 25,06 % | médiane–p95 |
| world-only | 18,61 % | 15,13 % | 25,96 % | médiane–p95 |

Les quatre observations sont supérieures à la médiane, mais aucune ne dépasse le p95 apparié. Cette convergence montre que les drawdowns observés sont plus sévères que le centre simulé sans constituer, dans cette cohorte, une preuve de sous-couverture du p95.

## Preuves défavorables conservées

- Les douze cellules ne sont pas indépendantes : elles partagent les mêmes actifs et périodes.
- Les données Yahoo sont des proxies publics non licenciés.
- Les périodes avaient déjà été observées ; la campagne est confirmatoire par ordre temporel, mais pas un holdout vierge.
- La non-normalité, la volatilité persistante et la corrélation variable démontrées par le diagnostic v2 restent des limites du moteur.

## Conclusion

La généralisation à quatre structures de portefeuille ne justifie ni Student-t ni EWMA et ne révèle aucun dépassement du p95 mensuel apparié. Le moteur peut être conservé comme générateur de scénarios conditionnels. Ses percentiles ne doivent toujours pas être présentés comme des probabilités empiriquement calibrées tant qu’une validation sur données exactes licenciées et holdout vierge n’a pas été réalisée.
