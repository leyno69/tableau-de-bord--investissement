# Adéquation de la distribution mensuelle — v1

## Objet

Ce protocole teste l’hypothèse gaussienne mensuelle du pilote `beginner` sans modifier rétroactivement les campagnes déjà observées.

La trajectoire empirique utilise le proxy ETF `IWDA.AS`, `PAEJ.PA` et 35 % de cash, avec la même allocation économique que la piste proxy déjà documentée. Les rendements sont mesurés sur fins de mois afin de rester compatibles avec le pas temporel du moteur.

## Échantillon diagnostique

Période : juin 2014 à décembre 2023, soit 114 rendements mensuels.

Résultats :

- skewness : `-0,4702` ;
- kurtosis excédentaire : `+0,7732` ;
- 7 observations au-delà de 2 sigma du modèle ;
- 1 observation au-delà de 3 sigma ;
- corrélation de rang 1 des rendements absolus : `0,1509` ;
- statistique Jarque–Bera : `7,0402` ;
- p-value asymptotique approximative : `0,0296`.

Le test diagnostique rejette donc la normalité au seuil de 5 % sur cet échantillon.

## Holdout préenregistré

Après lecture de l’échantillon diagnostique, un nouveau test confirmatoire distinct a été préenregistré avant lecture de ses résultats :

- période : janvier 2024 à juillet 2026 ;
- seuil alpha : 5 % ;
- réplication directionnelle : skewness < 0 et kurtosis excédentaire > 0 ;
- réplication statistique : p-value Jarque–Bera < 0,05.

Le holdout contient 30 rendements mensuels et donne :

- skewness : `-0,2287` ;
- kurtosis excédentaire : `+0,3088` ;
- Jarque–Bera : `0,3807` ;
- p-value approximative : `0,8267`.

La direction du signal est reproduite, mais pas son rejet statistique. Le résultat est donc classé `directionally-consistent-inconclusive`.

## Décision méthodologique

Aucune modification de la loi de simulation n’est justifiée à ce stade.

Le rejet observé sur 2014–2023 constitue une preuve diagnostique à conserver. Le holdout trop court ne le confirme pas statistiquement et ne le réfute pas de manière définitive non plus. Une évolution du moteur vers une distribution à queues épaisses, asymétrique ou à volatilité conditionnelle exige davantage de données et un test hors échantillon suffisamment puissant.

## Conséquence pratique

Le modèle gaussien mensuel reste la version de référence pour les campagnes déjà scellées. Toute variante future doit être testée comme un modèle concurrent, jamais substituée silencieusement à la version existante.

## Limites

- IWDA reste un proxy ETF de WPEA avant 2024 ;
- la profondeur commune est limitée par PAEJ ;
- Jarque–Bera est un test asymptotique sensible à l’échantillon ;
- 30 mois de holdout ont une puissance faible ;
- une absence de rejet n’établit pas la normalité ;
- ces diagnostics ne démontrent aucune capacité prédictive.
