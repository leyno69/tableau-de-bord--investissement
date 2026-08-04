# Contrat de calibration du Radar LEYNOR

## Statut

Ce document complète le Guide méthodologique LEYNOR AI pour toute restitution du Radar d’opportunités, du Radar thématique et des futurs moteurs très court terme.

## Décision utilisateur éclairée

Le Radar aide l’utilisateur à identifier les sujets qui méritent une analyse approfondie et à comprendre les éléments favorables, contradictoires et invalidants d’un scénario.

Il ne constitue pas une recommandation d’achat ou de vente et ne prétend pas prédire le marché.

## Règle absolue d’affichage

Un pourcentage, une probabilité ou un niveau de confiance ne peut être affiché que si le résultat est relié à une calibration empirique validée hors échantillon.

À défaut, l’interface affiche explicitement :

- le statut `Non calibré` ;
- la raison de l’indisponibilité ;
- les éléments favorables et contradictoires disponibles ;
- les risques, sources, limites et la fraîcheur des données.

Une probabilité issue d’un signal de démonstration, d’une heuristique, d’un modèle non calibré ou d’une pondération intuitive ne doit jamais être présentée comme une confiance utilisateur.

## Contrat d’une évaluation validée

Toute évaluation validée doit contenir au minimum :

- `status: validated` ;
- une probabilité comprise entre 0 et 1 ;
- un identifiant de calibration immuable ;
- une version méthodologique ;
- une date d’observation ;
- les sources et leur fraîcheur ;
- les limites applicables.

L’identifiant de calibration doit référencer le registre versionné des calibrations prévu par le Guide méthodologique.

## Classement

Les opportunités disposant d’une calibration validée peuvent être classées selon leur probabilité empirique documentée.

Les opportunités non calibrées restent consultables, mais sont placées après les résultats validés et ne sont jamais classées entre elles à partir d’un pourcentage fictif.

## Données de démonstration

Les données locales ou statiques peuvent servir à tester l’interface et les contrats logiciels. Elles doivent être identifiées comme données de démonstration et ne doivent produire aucun pourcentage visible.

## Limites actuelles

Ce contrat ne valide aucun moteur de prédiction et ne crée aucune calibration. Il empêche seulement l’exposition de faux scores pendant la construction des campagnes, des sources de données et du moteur statistique.

Les futurs travaux devront documenter séparément :

- le protocole de définition de la cible ;
- les horizons étudiés ;
- les jeux de calibration et de validation ;
- les métriques de discrimination et de calibration ;
- la dérive temporelle ;
- la sensibilité aux régimes de marché ;
- les coûts, délais et biais des données ;
- les critères d’obsolescence d’une calibration.

## Impact méthodologique de la première implémentation

La première implémentation remplace le champ générique `confidence` par une évaluation structurée :

- `unavailable`, sans valeur numérique ;
- `validated`, avec probabilité et références de calibration obligatoires.

Cette évolution applique les règles d’absence de faux score, d’explicabilité, de traçabilité et de séparation entre analyse et décision.
