# Validation empirique par proxy ETF — v1

## Objet

Cette piste fournit une validation empirique structurée du moteur LEYNOR lorsque l'historique officiel du benchmark n'est pas disponible sous une licence adaptée.

Elle ne remplace pas la piste sous licence MSCI et ne doit jamais être présentée comme telle.

## Proxy retenu

Pour la composante WPEA antérieure à 2024, le proxy est `IWDA.AS`, iShares Core MSCI World UCITS ETF, ISIN `IE00B4L5Y983`.

La justification est fixée avant lecture des résultats : le fonds existe depuis 2009 et son benchmark déclaré est le MSCI World Index (Net). Le proxy est choisi pour son lien économique officiel avec le même univers de référence, pas en fonction de ses performances historiques.

PAEJ reste l'instrument réel `PAEJ.PA` sur les fenêtres retenues. `CASH` reste une poche technique à prix constant.

## Fenêtres

Les fenêtres annuelles préenregistrées sont : 2015, 2018, 2020, 2022 et 2023. Elles sont distinctes temporellement et couvrent plusieurs régimes, sans être assimilées à des observations iid.

## Niveau de preuve

Les résultats peuvent soutenir :

- la robustesse empirique du moteur sur des trajectoires de marché réelles ;
- la détection de sous-estimations de risque ou autres preuves adverses ;
- la comparaison descriptive aux distributions simulées appariées.

Ils ne peuvent pas soutenir :

- une validation officielle du MSCI World ;
- une identité historique entre IWDA et WPEA ;
- une preuve de pouvoir prédictif ;
- une garantie de rendement futur.

## Données

Le pilote v1 utilise des clôtures ajustées publiques via Yahoo Finance pour IWDA.AS et PAEJ.PA. Cette provenance reste explicitement distincte d'une série MSCI licenciée.

## Règle de gouvernance

Tout résultat défavorable est conservé. Aucun proxy, aucune fenêtre et aucun seuil ne peut être changé après lecture des résultats pour améliorer artificiellement la conclusion.
