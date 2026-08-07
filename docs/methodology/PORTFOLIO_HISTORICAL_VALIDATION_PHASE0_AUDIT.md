# Validation historique des portefeuilles — Phase 0 : audit de reprise

## Objet

Ce document applique la Phase 0 de `PORTFOLIO_HISTORICAL_VALIDATION_ROADMAP.md` aux éléments actuellement versionnés dans le dépôt.

Il ne valide aucune performance et ne transforme aucune simulation en prévision. Son rôle est uniquement de déterminer quels éléments sont suffisamment définis pour entrer dans un futur replay historique.

## Éléments retrouvés

Le dépôt contient trois presets dans `simulation-presets.js` :

- `beginner` — Débutant prudent ;
- `growth` — Croissance dynamique ;
- `dca` — Projet long terme.

Ils définissent déjà un identifiant, un libellé, un horizon, une allocation, des hypothèses pédagogiques et des ordres initiaux. Le preset DCA ajoute une règle de versement mensuel.

Le dépôt contient également les briques méthodologiques nécessaires à une campagne :

- `CONTRAT_CAMPAGNE_SIMULATION.md` ;
- `AUDIT_CAMPAGNE_SIMULATION.md` ;
- `INSTANTANE_RESULTATS_SIMULATION.md` ;
- le code d'audit et de snapshot associé.

## Lacunes constatées sur les presets actuels

Les presets ne portent pas encore explicitement les références suivantes :

- date de référence historique ;
- politique de rééquilibrage ;
- politique de coûts ;
- version du moteur ;
- identifiant de campagne ;
- identifiant du plan de graines ;
- identifiant de l'instantané de résultats.

Ces éléments sont requis avant de confronter les résultats à des données historiques, afin d'éviter de choisir ou modifier les règles après observation des résultats.

## Registre automatique

`portfolio-historical-validation-audit.js` produit un audit déterministe de chaque portefeuille et refuse l'éligibilité au replay tant qu'une référence obligatoire manque.

L'état attendu des trois presets actuels est donc `blocked`. Ce statut n'est pas un échec scientifique : il indique seulement que les objets pédagogiques actuels ne constituent pas encore des unités expérimentales entièrement reproductibles.

## Décision de Phase 0

Les trois presets sont réutilisables comme base de définition, mais ne doivent pas encore être rejoués historiquement.

La prochaine étape est de créer des **spécifications expérimentales figées** dérivées de ces presets, sans modifier silencieusement les presets de démonstration. Chaque spécification devra fixer les sept références manquantes et conserver un lien explicite vers le preset d'origine.

## Critère de sortie restant

La Phase 0 sera terminée lorsque chaque portefeuille retenu possédera :

- une définition figée ;
- une date de référence ;
- une allocation ;
- une politique de rééquilibrage ;
- une politique de coûts ;
- une version du moteur ;
- des références reproductibles vers campagne, plan de graines et snapshot de résultats.

Aucune donnée historique complète ne doit être ouverte avant ce gel méthodologique.
