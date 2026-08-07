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

Un amendement méthodologique pré-valeurs a été verrouillé le `2026-08-07T21:48:59Z` : la première origine exige 36 mois mensuels complets d'estimation, comme dans la campagne de calibration de référence. Cette précision manquait au protocole initial ; elle est conservée comme amendement explicite et non comme choix postérieur aux résultats.

Les périodes déjà inspectées sont enregistrées dans l'artefact. Une nouvelle source ne transforme pas un événement de marché déjà connu en résultat prospectif ou en holdout vierge. Chaque fenêtre conservera donc son statut de nouveauté historique.

## Règle de falsification

La perte de Brier est comparée origine par origine au benchmark. La revendication ne peut être rejetée que si :

1. la campagne passe tous les contrôles de licence, de temporalité et de reproductibilité ;
2. un audit séparé déclare la structure de dépendance admissible pour une décision négative ;
3. l'intervalle à 95 % préenregistré de la différence `Brier moteur − Brier benchmark` est entièrement supérieur à zéro.

La méthode d'incertitude est verrouillée avant exécution : bootstrap circulaire par blocs mobiles, longueur `ceil(n^(1/5))`, sensibilité obligatoire aux longueurs voisines, 50 000 réplications et graine déterministe. La décision utilise l'enveloppe conservatrice des intervalles basic bootstrap bilatéraux à 95 %. Aucun intervalle iid standard ne peut être substitué après observation.

## Barrière technique avant valeurs

La réception est divisée en deux opérations irréversibles dans cet ordre :

1. lire uniquement `paej.manifest.json` et `worldProxy.manifest.json` ;
2. sceller leurs empreintes, la couverture commune, les fenêtres et la liaison de l'audit ;
3. seulement ensuite autoriser l'ouverture des CSV dont les empreintes correspondent au scellement.

Le code rejette les manifestes qui incorporent des champs de valeurs. La règle de fenêtre est déterministe : intersection des couvertures déclarées, premier mois civil complet, 36 mois d'apprentissage, puis fenêtres de douze mois non chevauchantes oldest-first. Aucune date ne peut être retirée après connaissance d'un rendement.

L'attestation `LEYNOR_RETURN_VALUES_ACCESSED_AT_SEAL=false` reste déclarative. Elle ne démontre pas cryptographiquement qu'aucune personne n'a observé les valeurs ; toute consultation antérieure doit être conservée comme preuve défavorable et bloque le statut aveugle de la cohorte.

Commande à exécuter après dépôt des deux manifestes, mais avant toute ouverture des CSV :

```bash
LEYNOR_METADATA_SEALED_AT=YYYY-MM-DDTHH:mm:ssZ LEYNOR_RETURN_VALUES_ACCESSED_AT_SEAL=false node experiments/portfolio-probability-accelerated-historical-v1/seal-metadata.mjs
```

## État initial

La campagne est `blocked-before-locked-historical-run` :

- `worldProxy` exact/licencié manque ;
- `paej` exact/licencié manque ;
- les fenêtres ne peuvent être dérivées des seules métadonnées de couverture tant que les manifestes ne sont pas disponibles ;
- la méthode d'audit est verrouillée sans rendement, mais ne peut être liée à l'empreinte du registre avant réception des manifestes de couverture ;
- la méthode de sélection est verrouillée sans rendement, mais aucun scellement de métadonnées n'existe encore ;
- zéro résultat a été produit.

Commande de reproduction :

```bash
node experiments/portfolio-probability-accelerated-historical-v1/prepare.mjs
```

L'artefact généré est `artifacts/portfolio-probability-accelerated-historical-v1-launch.json`.
