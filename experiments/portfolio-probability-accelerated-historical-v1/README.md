# Falsification historique accélérée des probabilités — v1

## Objet

Cette campagne cherche une décision scientifique plus rapide que l'attente d'un résultat prospectif à douze mois. Elle teste exactement la revendication à douze mois du moteur inchangé sur des données historiques exactes et licenciées.

Elle est asymétrique :

- une défaite reproductible contre le benchmark dynamique peut rejeter la revendication probabiliste ;
- une victoire ne peut produire que `retrospective-support-only` ;
- cette campagne ne peut jamais, seule, autoriser l'affichage d'une probabilité réelle.

## Verrouillage avant données

- moteur : commit `66d09ccf94bdec3b5c4e1e09fc406e6ccc5df6b9` ;
- horizon : douze mois ;
- trajectoires : 5 000 ;
- score primaire : Brier ;
- benchmark : taux de base dynamique point-in-time ;
- sélection des fenêtres : métadonnées uniquement, de la plus ancienne à la plus récente, fenêtres de douze mois non chevauchantes ;
- aucun fallback vers Yahoo ou une source de développement ;
- aucune recalibration avant décision.

Les périodes déjà inspectées sont enregistrées dans l'artefact. Une nouvelle source ne transforme pas un événement de marché déjà connu en résultat prospectif ou en holdout vierge. Chaque fenêtre conservera donc son statut de nouveauté historique.

## Règle de falsification

La perte de Brier est comparée origine par origine au benchmark. La revendication ne peut être rejetée que si :

1. la campagne passe tous les contrôles de licence, de temporalité et de reproductibilité ;
2. un audit séparé déclare la structure de dépendance admissible pour une décision négative ;
3. l'intervalle à 95 % préenregistré de la différence `Brier moteur − Brier benchmark` est entièrement supérieur à zéro.

La méthode d'incertitude devra tenir compte de la dépendance et être verrouillée avant exécution. Aucun intervalle iid standard ne peut être substitué après observation.

## État initial

La campagne est `blocked-before-locked-historical-run` :

- `worldProxy` exact/licencié manque ;
- `paej` exact/licencié manque ;
- les fenêtres ne peuvent être dérivées des seules métadonnées de couverture tant que les manifestes ne sont pas disponibles ;
- la méthode d'audit de dépendance ne peut être verrouillée qu'après détermination de la structure des fenêtres, mais avant lecture des rendements ;
- zéro résultat a été produit.

Commande de reproduction :

```bash
node experiments/portfolio-probability-accelerated-historical-v1/prepare.mjs
```

L'artefact généré est `artifacts/portfolio-probability-accelerated-historical-v1-launch.json`.
