# Pilote de confrontation historique — preset beginner v1

## Statut

`simulation-pilot-only`

Ce bloc prépare la première confrontation historique. Il produit un instantané simulé reproductible sur un horizon d’un an ; aucune donnée de marché réelle n’est encore utilisée dans ce rapport.

## Paramètres figés

- preset source : `beginner` ;
- capital initial : 10 000 € ;
- horizon pilote : 1 an ;
- trajectoires : 10 000 ;
- graine : `20260807` ;
- rendement annuel agrégé : 4,5 % ;
- volatilité annuelle agrégée : 10 % ;
- versement mensuel : 0 € ;
- frais : 0 % pour ce pilote isolé ;
- inflation : 0 % pour ce pilote isolé.

L’hypothèse agrégée de rendement/volatilité provient du preset `beginner`. Le pilote ne prétend pas reproduire séparément WPEA, PAEJ et le cash.

## Premiers résultats simulés

| Mesure | Résultat |
|---|---:|
| Valeur finale p05 | 8 787,00 € |
| Valeur finale médiane | 10 407,21 € |
| Valeur finale p95 | 12 200,97 € |
| Rendement médian vs capital initial | +4,07 % |
| Drawdown maximal médian | 6,74 % |
| Drawdown maximal p95 | 15,82 % |
| Drawdown maximal observé dans le lot | 27,98 % |

## Lecture autorisée

Ces valeurs décrivent la distribution produite par les hypothèses du pilote. Elles ne constituent ni une prévision ni une validation du modèle.

La prochaine étape est de rejouer la même fenêtre sur des données historiques réelles, puis de comparer les métriques avec le comparateur simulation/historique v1. Si la source utilisée n’est pas éligible à la validation scientifique finale, le résultat restera explicitement classé comme développement ou pilote.

## Limites

- hypothèse agrégée et non instrument par instrument ;
- absence de matrice de corrélation dans le moteur Monte Carlo utilisé ;
- pas de données historiques dans ce bloc ;
- pas de calibration d’un seuil de conformité ;
- aucun score de qualité ou verdict prédictif.
