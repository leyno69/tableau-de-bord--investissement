# Spécification expérimentale historique des portefeuilles

## Finalité

Une spécification expérimentale scellée transforme un preset pédagogique en unité de recherche reproductible avant toute confrontation aux données historiques complètes.

Elle ne préjuge ni du résultat historique ni de la validité future du portefeuille.

## Champs obligatoires

Chaque spécification doit fixer :

- un identifiant de spécification ;
- le preset source ;
- la version méthodologique ;
- le SHA Git complet du moteur ;
- la date historique de référence ;
- l'horizon ;
- l'allocation ;
- la politique de rééquilibrage ;
- la politique de coûts ;
- l'identifiant de campagne ;
- l'identifiant du plan de graines ;
- l'identifiant du snapshot de résultats.

## Scellement

`sealPortfolioHistoricalExperimentSpec()` valide ces références, normalise l'allocation et produit une empreinte déterministe.

Toute modification d'un champ méthodologique produit une empreinte différente. Une spécification déjà utilisée pour une validation ne doit donc jamais être modifiée silencieusement : une évolution exige un nouvel identifiant ou une nouvelle version.

## Garde-fou contre l'ajustement rétrospectif

Aucune spécification ne doit être scellée en choisissant ses paramètres après examen des résultats historiques qu'elle est censée valider.

Les dates de calibration, de validation et de test verrouillé seront définies par le protocole historique préenregistré dans le bloc suivant.

## Limite actuelle

Ce bloc définit le contrat de scellement mais ne choisit pas encore les dates, politiques de coûts ou politiques de rééquilibrage des trois presets existants. Ces choix doivent être documentés explicitement avant de construire leurs spécifications réelles.
