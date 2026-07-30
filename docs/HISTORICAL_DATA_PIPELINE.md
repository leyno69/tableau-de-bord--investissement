# Pipeline historique actions

## But

Construire des observations reproductibles pour entraîner et tester le moteur probabiliste sans utiliser une information qui n'était pas disponible à la date de prédiction.

## Unité d'observation

Une observation est identifiée par `(instrument, asOf)` et contient deux blocs strictement séparés :

- `features` : uniquement des informations connues au plus tard à `asOf` ;
- `labels` : résultats futurs observés après `asOf`, utilisés uniquement pour entraînement/validation/backtest.

Le code applicatif de production ne doit jamais recevoir les labels futurs.

## Première version

Le pipeline `modeling/historical-pipeline.js` normalise les cours EOD, vérifie l'ordre des dates et les valeurs de prix, calcule des variables de prix point-in-time puis crée les labels futurs pour 1, 3, 6 et 12 mois (21/63/126/252 séances).

Variables initiales volontairement simples :

- rendement 21 séances ;
- rendement 63 séances ;
- rendement 126 séances ;
- rendement 252 séances ;
- volatilité annualisée sur 63 séances.

Ce jeu n'est pas présenté comme suffisant pour un modèle professionnel. Il sert de benchmark reproductible avant d'ajouter fondamentaux, valorisation, révisions, secteur et macro.

## Règles anti-fuite

1. Les splits sont chronologiques, jamais aléatoires.
2. Une feature ne peut utiliser une ligne de prix postérieure à `asOf`.
3. Une donnée fondamentale devra porter sa date de publication/disponibilité, pas seulement la période comptable qu'elle décrit.
4. Les révisions historiques devront conserver la valeur réellement connue à la date de l'observation si le fournisseur permet de la récupérer.
5. Les constituants d'univers et benchmarks devront être point-in-time pour éviter le biais de survivance lorsque cette donnée sera disponible.
6. Toute transformation statistique apprise (normalisation, winsorisation, calibration, sélection de variables) devra être ajustée sur le train uniquement puis appliquée aux périodes suivantes.
7. La période test finale ne doit pas servir au choix des hyperparamètres ou des seuils.

## Audit minimal

Chaque série doit conserver : fournisseur, symbole fournisseur, date de collecte, première/dernière séance, nombre de lignes, contrôles échoués et version du pipeline.

## Limites actuelles

Le dépôt ne contient pas encore de base historique persistante ni de job d'ingestion complet. Cette étape pose le contrat et les transformations déterministes. La connexion fournisseur et le stockage devront être ajoutés séparément avec la traçabilité de provenance.
