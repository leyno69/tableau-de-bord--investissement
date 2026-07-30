# Moteur probabiliste — contrat produit et méthodologique

## Objectif

Le moteur doit aider à analyser et classer des instruments financiers sans présenter un score opaque comme une certitude ou comme une recommandation personnalisée.

Chaîne cible :

`scanner → analyser → probabiliser → contrôler le risque → classer → expliquer`

## Règle fondamentale

Aucun pourcentage ne doit être affiché sans préciser :

1. l’événement mesuré ;
2. l’horizon ;
3. le benchmark lorsqu’il est pertinent ;
4. le niveau de confiance ;
5. la fraîcheur et la couverture des données ;
6. la version du modèle ;
7. les principaux facteurs positifs et négatifs ;
8. les résultats de calibration/backtest disponibles.

Un score générique du type `72 %` ou `72 % de chances d’être un bon investissement` est interdit.

## Contrat d’une analyse

Chaque analyse doit pouvoir produire une structure comparable à :

```json
{
  "instrument": {
    "symbol": "NVDA.US",
    "isin": null,
    "assetType": "stock",
    "benchmark": "SPY.US"
  },
  "asOf": "2026-07-30T00:00:00Z",
  "modelVersion": "stock-v0",
  "status": "experimental",
  "horizons": {
    "1m": {
      "probabilityPositiveReturn": null,
      "probabilityOutperformBenchmark": null,
      "probabilityDrawdown20": null,
      "expectedReturnRange": null,
      "confidence": null
    },
    "3m": {},
    "6m": {},
    "12m": {}
  },
  "evidence": {
    "positive": [],
    "negative": [],
    "dataCoverage": [],
    "missingData": []
  },
  "validation": {
    "sampleSize": null,
    "brierScore": null,
    "calibrationError": null,
    "backtestPeriod": null
  }
}
```

Les valeurs `null` sont intentionnelles tant qu’un modèle calibré n’existe pas. L’interface ne doit jamais les remplacer par une estimation inventée.

## Horizons initiaux

Le socle prévoit :

- 1 mois ;
- 3 mois ;
- 6 mois ;
- 12 mois.

Les horizons très courts pourront être ajoutés plus tard avec des modèles distincts.

## Univers d’instruments

### Actions

Premier modèle à construire et valider. Familles de variables candidates : prix/momentum, volatilité, fondamentaux, valorisation, révisions, événements, secteur, macro et benchmark.

### ETF

Modèle séparé : indice suivi, concentration, expositions géographiques et sectorielles, volatilité, liquidité, tracking et contexte macro.

### Obligations

Modèle séparé : rendement, duration, qualité de crédit, spread, taux, liquidité et risque de défaut lorsque les données le permettent.

Aucun modèle d’action ne doit être réutilisé automatiquement pour un ETF ou une obligation.

## Classement des opportunités

La section « Opportunités détectées » ne doit pas trier les actifs uniquement par probabilité de hausse.

Un actif n’est éligible au classement que si :

- les données minimales requises sont présentes ;
- le modèle correspondant au type d’actif est validé pour l’horizon affiché ;
- la calibration dépasse les seuils définis ;
- la liquidité et la fraîcheur des données sont suffisantes ;
- aucun contrôle d’intégrité n’est en échec.

Le futur score de classement pourra combiner probabilité, rendement potentiel, risque, confiance et qualité des données. Les pondérations devront être versionnées et backtestées avant utilisation en production.

## Calibration

Une probabilité doit être testée comme une probabilité. Exemple : parmi les observations historiques auxquelles le modèle attribue environ 70 % de probabilité de hausse, la fréquence observée doit être proche de 70 % sur un échantillon suffisant.

Mesures minimales prévues :

- Brier score ;
- courbe/table de calibration ;
- erreur de calibration ;
- taille d’échantillon ;
- performance par période et régime de marché ;
- performance par secteur et type d’actif.

La précision directionnelle seule n’est pas suffisante.

## Explicabilité

L’IA générative peut expliquer et synthétiser les facteurs fournis par le moteur. Elle ne doit pas fabriquer la probabilité finale à partir d’un commentaire textuel.

Flux cible :

`données vérifiées → features → modèle quantitatif → calibration → contrôles → probabilités → explication IA`

L’explication doit distinguer faits, calculs du modèle et incertitudes.

## Interface simple / avancée

Les deux interfaces utilisent exactement la même analyse sous-jacente.

### Vue simple

Affiche l’événement, l’horizon, la probabilité, le risque, la confiance et quelques facteurs essentiels dans un langage accessible.

### Vue avancée

Ajoute benchmark, variables, données sources, date de mise à jour, version du modèle, métriques de calibration, scénarios et méthodologie.

## Garde-fous de lancement

Tant que le premier modèle n’est pas calibré et backtesté :

- aucun pourcentage prédictif fictif dans l’interface ;
- aucun classement « meilleures opportunités » présenté comme opérationnel ;
- les prototypes doivent porter explicitement le statut `experimental` ;
- les données absentes doivent rester absentes.

## Étapes de développement

1. Définir le schéma de données historique nécessaire aux actions.
2. Construire le collecteur de données et les contrôles de qualité.
3. Construire un benchmark naïf de référence.
4. Construire le premier modèle probabiliste actions.
5. Backtester sans fuite temporelle.
6. Calibrer les probabilités.
7. Définir les seuils de confiance et d’éligibilité.
8. Exposer l’analyse dans l’interface.
9. Construire le scanner et le classement d’opportunités.
10. Étendre avec des modèles spécifiques aux ETF puis aux obligations.
