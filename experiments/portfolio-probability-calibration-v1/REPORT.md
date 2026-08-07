# Rapport — calibration probabiliste proxy v1

Empreinte du résultat : `16e130fae3cf061d9bbd3206c8370e429141ae1b7cb763ee54dc4a96b00ba7e8`.

## Résultats agrégés

- 84 prévisions brutes : 4 portefeuilles × 21 origines trimestrielles ;
- couverture centrale 50 % : 39/84 = 46,43 %, intervalle de Wilson à 95 % [36,15 % ; 57,02 %] ;
- couverture centrale 90 % : 73/84 = 86,90 %, intervalle de Wilson à 95 % [78,05 % ; 92,53 %] ;
- les deux niveaux annoncés appartiennent à leur intervalle d’incertitude observé ;
- Brier score du moteur pour un rendement positif à douze mois : 0,1966 ;
- Brier score de la référence fixe 50 % : 0,2500 ;
- amélioration descriptive : 0,0534.

## Contre-preuve importante

L’erreur de calibration agrégée vaut 0,1795. Les prévisions entre 80 % et 90 % ont une probabilité moyenne de 82,09 %, mais une fréquence positive observée de 58,33 %. Ce groupe est nettement surconfiant dans cet échantillon.

L’agrégation des 84 lignes crée une pseudo-réplication : les quatre portefeuilles partagent les mêmes sous-jacents et les horizons trimestriels se chevauchent. L’effectif indépendant n’est donc pas déterminé et reste explicitement `null`.

## Conclusion

La couverture des intervalles 50 % et 90 % est compatible avec les niveaux annoncés dans l’incertitude d’échantillonnage, et le Brier score bat la référence fixe. Mais la surconfiance d’un groupe de probabilités, la dépendance des observations, l’absence de holdout vierge et les données proxy interdisent l’exposition de ces pourcentages comme probabilités réelles.

Statut : `proxy-inconclusive`. La validation prospective et les données exactes/licenciées restent nécessaires.
