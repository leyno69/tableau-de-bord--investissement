# Protocole proxy WPEA — MSCI World EUR Net Returns v1

## Objet

Ce protocole préenregistre la piste historique étendue du preset `beginner` avant tout calcul sur les fenêtres antérieures à l'existence de WPEA.

## Instrument source

WPEA est l'iShares MSCI World Swap PEA UCITS ETF. Son historique exact ne commence pas avant le 26 mars 2024.

## Proxy préenregistré

Le seul proxy autorisé par ce protocole pour prolonger l'exposition World avant cette date est :

- indice : **MSCI World Index** ;
- devise : **EUR** ;
- base de rendement : **Net Returns** ;
- rôle : proxy historique de l'exposition World de WPEA ;
- statut : `proxy`, jamais `exact`.

La fiche officielle MSCI confirme que le MSCI World Index (EUR) est publié en net returns, avec historique de performance depuis décembre 2000. La fiche précise également que l'indice a été lancé le 31 mars 1986 et que toute donnée antérieure à son lancement est back-testée.

## Interdictions

- Ne jamais présenter l'indice comme l'historique de WPEA.
- Ne jamais substituer un autre ETF World au benchmark officiel simplement pour obtenir une série plus facile à télécharger.
- Ne jamais mélanger silencieusement données du fonds et données de l'indice dans une même piste `exact`.
- Ne jamais modifier le proxy après lecture des résultats sans créer une nouvelle expérience.

## Limites structurelles

Le proxy n'intègre pas exactement :

- le TER de WPEA ;
- les coûts et spreads de réplication synthétique ;
- le tracking error du fonds ;
- les éventuels écarts de calendrier et de valorisation ;
- les coûts de transaction du portefeuille, qui restent modélisés séparément par le replay.

## Source de référence

Source méthodologique officielle : fiche MSCI World Index (EUR), Net Returns, MSCI.

La source utilisée pour exécuter techniquement un replay devra être enregistrée séparément avec son statut de licence, sa fréquence, sa devise, sa base de rendement et son éligibilité à la validation. Le fait qu'une source technique reproduise le même indice ne la rend pas automatiquement `validation-eligible`.

## Fenêtres v1

Le premier lot de validation étendue devra utiliser des fenêtres annuelles non chevauchantes, figées avant lecture des résultats. Les périodes doivent rester postérieures au début de l'historique officiel retenu dans le protocole et ne doivent pas mélanger des séries de nature différente sans l'indiquer explicitement.

## Statut scientifique

Ce protocole autorise une piste proxy historique. Il ne transforme pas une source de développement en source scientifique admissible et n'attribue aucun score de validation au modèle.
