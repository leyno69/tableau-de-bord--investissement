# Audit v1 des fournisseurs historiques candidats

## Méthode

Chaque fournisseur est évalué uniquement à partir de documents officiels consultables. Une capacité non démontrée reste `false` ; aucune extrapolation n'est autorisée.

## Tiingo

Éléments documentés :

- historique EOD avec prix bruts et ajustés ;
- ajustements intégrant splits et dividendes selon une méthode référencée CRSP ;
- corrections de données appliquées au fil de la réception des corrections de marché ;
- licence standard limitée à un usage interne, redistribution soumise à accord spécifique.

Blocages LEYNOR :

- aucun abonnement ou accord LEYNOR n'est actuellement enregistré comme autorisant cet usage de validation ;
- aucune preuve conservée d'une propriété point-in-time au sens exigé par le protocole ;
- couverture des instruments LEYNOR non encore vérifiée.

Sources :

- https://www.tiingo.com/documentation/end-of-day
- https://www.tiingo.com/documentation/general
- https://api.tiingo.com/tos/

## EODHD

Éléments documentés :

- accès aux titres radiés ;
- données EOD, dividendes et splits pour les instruments couverts selon leur date de radiation ;
- stockage/usage soumis aux conditions du plan et redistribution soumise à autorisation pour les usages professionnels.

Blocages LEYNOR :

- droit d'usage exact du projet non vérifié ;
- propriété point-in-time non démontrée ;
- méthode d'ajustement et politique de révision insuffisamment démontrées pour notre verrou ;
- couverture précise de WPEA, PAEJ, NVDA et de l'instrument SMH finalement retenu non vérifiée.

Sources :

- https://eodhd.com/financial-apis/delisted-stock-companies-data-2
- https://eodhd.com/financial-apis/terms-conditions

## Norgate Data

Éléments documentés :

- données historiques conçues pour limiter le survivorship bias sur certains marchés ;
- titres radiés et constituants historiques disponibles selon les abonnements ;
- offres explicitement présentées comme adaptées au backtesting pour certains marchés.

Blocages LEYNOR :

- licence standard personnelle et restrictions commerciales incompatibles sans accord adapté ;
- intégration technique absente du dépôt ;
- couverture des ETF européens utilisés par les presets non démontrée ;
- propriété point-in-time au sens du protocole, ajustements et révisions encore à documenter précisément.

Sources :

- https://norgatedata.com/accessibility.php
- https://norgatedata.com/subscribe/eula.php
- https://norgatedata.com/subscribe/subscribe.php

## Conclusion v1

Aucun fournisseur audité n'est actuellement `validation-eligible` pour LEYNOR.

Cette conclusion est volontairement conservatrice. Elle signifie seulement qu'aucun candidat ne satisfait encore **toutes** les preuves exigées par le protocole. Elle n'implique pas que les fournisseurs soient impropres à d'autres usages.

La prochaine étape n'est donc pas de charger arbitrairement une série complète. Elle consiste à vérifier la couverture instrument par instrument et à déterminer si un accord/licence adapté permet un usage interne de recherche reproductible et la conservation des artefacts nécessaires à l'audit.
