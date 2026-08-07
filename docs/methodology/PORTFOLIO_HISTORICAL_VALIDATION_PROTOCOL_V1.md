# Protocole de validation historique des portefeuilles — contrat v1

## Objet

Ce bloc formalise le contrat logiciel du protocole préenregistré avant toute lecture des résultats historiques complets.

Il implémente les règles déjà inscrites dans le Guide méthodologique et ne choisit pas encore les périodes réelles de validation.

## Fenêtres obligatoires

Un protocole scellé doit comporter trois usages distincts et non chevauchants :

1. `calibration` — utilisée uniquement pour fixer ou vérifier les paramètres autorisés par le protocole ;
2. `validation` — utilisée pour mesurer la généralisation après calibration ;
3. `locked-test` — période tenue hors de portée jusqu'au gel complet des règles.

Les dates présentes dans les tests automatisés sont des **fixtures techniques** destinées uniquement à tester les contraintes de non-chevauchement. Elles ne constituent pas les dates retenues pour la future expérience LEYNOR.

## Métriques minimales obligatoires

Le contrat refuse un protocole qui omet l'une des métriques suivantes :

- rendement cumulé ;
- rendement annualisé ;
- volatilité ;
- drawdown maximal ;
- durée de récupération ;
- perte en période de crise ;
- stabilité du rang relatif ;
- erreur simulation/histoire ;
- rang prévu versus rang observé ;
- fréquence d'inversion des conclusions.

## Réfutation

Un protocole doit contenir au moins une règle de réfutation explicite. Les seuils numériques réels seront fixés avec les périodes et les données avant exécution, jamais après observation des résultats.

## Garde-fou principal

`createdWithoutOutcomeAccess` doit être explicitement `true`. Cette propriété ne prouve pas à elle seule l'absence de biais humain, mais elle rend impossible de sceller silencieusement un objet logiciel qui se déclare construit après consultation des résultats.

## Prochaine étape

Le prochain bloc doit définir les politiques de données et de benchmark nécessaires pour choisir les véritables fenêtres historiques, puis produire les spécifications scellées des portefeuilles retenus.
