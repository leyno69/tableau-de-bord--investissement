# Rapport — campagne confirmatoire multi-portefeuilles v1

## Résultat

Empreinte du résultat intégral : `931ac5f3eb60b5d72e194d29d3f0f7681f06b164c61939e60712af9515870880`. Empreinte des entrées Yahoo alignées : `3ff80fb4f9c16b21dca2d35efc6ecb4996031de44406204fb386a15c7dda838f`.

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
- Les cours Yahoo sont interrogés en direct : leur empreinte détecte une dérive, mais la version source n’est pas archivée dans le dépôt.
- Les périodes avaient déjà été observées ; la campagne est confirmatoire par ordre temporel, mais pas un holdout vierge.
- Le protocole et les résultats sont publiés dans la même PR ; le qualificatif « préenregistré » décrit l’ordre d’exécution déclaré, pas un horodatage indépendant vérifiable.
- La non-normalité, la volatilité persistante et la corrélation variable démontrées par le diagnostic v2 restent des limites du moteur.

## Conclusion

La généralisation à quatre structures de portefeuille ne justifie ni Student-t ni EWMA et ne révèle aucun dépassement du p95 mensuel apparié. Le moteur peut être conservé comme générateur de scénarios conditionnels. Ses percentiles ne doivent toujours pas être présentés comme des probabilités empiriquement calibrées tant qu’une validation sur données exactes licenciées et holdout vierge n’a pas été réalisée.
