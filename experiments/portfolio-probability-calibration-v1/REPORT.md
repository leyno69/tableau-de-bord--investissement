# Rapport — calibration probabiliste proxy v1

Empreinte du résultat : `dd83f94b13258e6dd7d4a2310855122a2a936611584625aaa32ff3005984ea0b`. Empreinte des entrées Yahoo alignées : `f32f0d60b89942f2ce51bfcf1f71c4d97f6e4b35e88cee0ff4c5bc805eb21855`.

## Résultats agrégés

- 84 prévisions brutes : 4 portefeuilles × 21 origines trimestrielles ;
- couverture centrale 50 % : 39/84 = 46,43 %, intervalle de Wilson à 95 % [36,15 % ; 57,02 %] ;
- couverture centrale 90 % : 73/84 = 86,90 %, intervalle de Wilson à 95 % [78,05 % ; 92,53 %] ;
- les deux niveaux annoncés appartiennent à leur intervalle d’incertitude observé ;
- Brier score du moteur pour un rendement positif à douze mois : 0,1966 ;
- Brier score de la référence fixe 50 % : 0,2500 ;
- amélioration descriptive : 0,0534.

La référence dynamique point-in-time prévue par le protocole obtient un Brier score agrégé de 0,1894. Le moteur est donc moins bon de 0,0071 sur ce comparateur plus exigeant. Il perd contre cette référence pour `defensive`, `beginner` et `dynamic`, et ne la bat que pour `world-only`.

## Contre-preuve importante

L’erreur de calibration agrégée vaut 0,1795. Les prévisions entre 80 % et 90 % ont une probabilité moyenne de 82,09 %, mais une fréquence positive observée de 58,33 %. Ce groupe est nettement surconfiant dans cet échantillon.

L’agrégation des 84 lignes crée une pseudo-réplication : les quatre portefeuilles partagent les mêmes sous-jacents et les horizons trimestriels se chevauchent. L’effectif indépendant n’est donc pas déterminé et reste explicitement `null`. Les intervalles de Wilson affichés supposent des essais indépendants ; ils restent descriptifs et ne sont pas valides pour une inférence de couverture tant que cette dépendance n’est pas modélisée.

Les cours Yahoo sont interrogés en direct. Leur empreinte permet de détecter une révision, mais pas de reconstruire une version historique non archivée. Le protocole et les résultats sont publiés dans la même PR : l’ordre de préenregistrement déclaré n’est pas horodaté indépendamment.

## Conclusion

La couverture brute des intervalles 50 % et 90 % est proche des niveaux annoncés, et le Brier score bat la référence fixe. Cette preuve favorable ne résiste pas à la référence dynamique agrégée, et les intervalles de Wilson ne sont pas inférentiels sous la dépendance observée. Avec la surconfiance d’un groupe de probabilités, l’absence de holdout vierge et les données proxy, l’exposition de ces pourcentages comme probabilités réelles reste interdite.

Statut : `proxy-inconclusive`. La validation prospective et les données exactes/licenciées restent nécessaires.
