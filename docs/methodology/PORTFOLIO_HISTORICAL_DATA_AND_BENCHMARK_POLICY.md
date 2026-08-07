# Validation historique des portefeuilles — politique de données et benchmarks

## Objectif

Empêcher qu'une série historique ou un benchmark soit introduit sans provenance, sans base de rendement comparable ou après lecture des résultats.

## Contrat d'une série historique

Chaque série admise doit documenter :

- le fournisseur ;
- l'identifiant exact chez le fournisseur ;
- la licence ou le droit d'utilisation ;
- la devise ;
- le fuseau horaire ;
- la fréquence ;
- la base de rendement (`price`, `total-return-gross` ou `total-return-net`) ;
- la vérification point-in-time ;
- le traitement documenté des opérations sur titres ;
- la politique de données manquantes ;
- l'empreinte du jeu de données.

Une série qui ne satisfait pas ces conditions n'entre pas dans le replay historique.

## Politique de benchmark

Les références sont choisies avant observation des résultats de validation. La politique exige :

- une règle de sélection écrite ;
- des identifiants de séries explicites ;
- une devise comparable ;
- une même base de rendement ;
- l'absence de sélection opportuniste après résultats.

Un indice de prix ne doit notamment pas être comparé silencieusement à un portefeuille avec dividendes réinvestis.

## Ce bloc ne choisit pas encore les fournisseurs

Le contrat est volontairement indépendant d'un fournisseur précis. Le choix des sources réelles doit être effectué ensuite à partir de critères vérifiables : couverture historique, point-in-time, qualité, licence, coût et reproductibilité.

Aucun fournisseur ni aucune série n'est déclaré validé par ce document.

## Prochaine étape

Établir le registre concret des sources candidates, vérifier leurs droits et leur couverture, puis figer les séries retenues avant de déterminer les fenêtres historiques réelles.
