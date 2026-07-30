# Protocole de validation du moteur probabiliste

## Principe

Une probabilité ne devient publiable que si elle est évaluée hors échantillon et si sa calibration est mesurable. Un taux de bonnes directions ne suffit pas.

## Jeux temporels

Le protocole impose des périodes chronologiques distinctes :

1. **train** : apprentissage des paramètres ;
2. **validation** : choix du modèle, des hyperparamètres et des seuils ;
3. **test** : évaluation finale, conservée intacte jusqu'au gel du modèle.

Le test ne doit jamais servir à améliorer le modèle évalué.

## Référence minimale

Chaque modèle doit être comparé au benchmark probabiliste naïf de taux de base construit uniquement sur le train.

Un modèle qui ne fait pas mieux que ce benchmark au Brier score ne peut pas être présenté comme apportant une capacité prédictive démontrée.

## Mesures obligatoires

Pour chaque horizon et chaque version de modèle :

- taille d'échantillon ;
- Brier score ;
- table de calibration ;
- erreur de calibration pondérée ;
- comparaison au benchmark ;
- période exacte du test ;
- univers d'instruments ;
- version des données et du pipeline.

Des métriques complémentaires seront ajoutées pour la discrimination et les performances économiques, mais elles ne remplacent pas la calibration.

## Lecture d'une probabilité

Si le moteur publie 70 % pour un ensemble suffisamment grand de cas comparables, la fréquence observée doit être proche de 70 %. Une probabilité n'est donc pas jugée sur un cas individuel mais sur son comportement statistique répété.

## Conditions de publication

La première version de production devra disposer de seuils explicites et versionnés. Avant de fixer ces seuils, nous devons mesurer les distributions réelles obtenues lors des backtests.

Nous ne fixons donc pas aujourd'hui de valeur arbitraire pour :

- le Brier score maximal ;
- l'erreur de calibration maximale ;
- la taille minimale universelle d'échantillon ;
- le niveau minimal de surperformance économique.

Ces seuils seront définis à partir des résultats empiriques et documentés. Cela évite de choisir après coup une règle uniquement parce qu'elle fait passer un modèle particulier.

## Sous-groupes

Une bonne moyenne globale peut masquer des échecs. Le rapport devra donc, lorsque l'échantillon le permet, ventiler les résultats par :

- horizon ;
- secteur ;
- capitalisation ;
- régime de volatilité ;
- région/marché ;
- niveau de probabilité prédit.

Un sous-groupe insuffisamment représenté doit être marqué comme tel plutôt que recevoir une conclusion forte.

## Versionnage

Toute modification significative des données, features, labels, paramètres, calibration ou règles d'éligibilité crée une nouvelle version de modèle. Les résultats historiques d'une version ne doivent pas être attribués automatiquement à la suivante.

## Statuts proposés

- `experimental` : construction ou données insuffisantes ;
- `backtested` : backtest exécuté mais critères de publication non validés ;
- `validated` : critères prédéfinis satisfaits sur le test hors échantillon ;
- `degraded` : dérive ou qualité récente insuffisante ;
- `retired` : version retirée.

Seul `validated` pourra alimenter une probabilité utilisateur présentée comme opérationnelle.
