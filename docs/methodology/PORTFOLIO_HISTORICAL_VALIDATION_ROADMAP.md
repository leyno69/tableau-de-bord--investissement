# Roadmap — validation empirique historique des simulations de portefeuilles

## Statut

Document de transition entre le Laboratoire LEYNOR actuellement en cours de finalisation et la reprise du projet de simulation de portefeuilles.

Ce chantier ne démarre qu'après clôture technique du laboratoire courant : CI exécutable, rapports consolidés reproductibles, contre-exemples conservés et paquet final vérifié.

## Objectif

Confronter les conclusions produites par le moteur de simulation de portefeuilles à des périodes de marché réellement observées afin de mesurer leur validité empirique, leurs limites et leurs échecs.

Cette validation ne doit jamais être présentée comme une preuve absolue de validité future. Elle vise à déterminer dans quelles conditions les résultats simulés restent cohérents avec l'historique et dans quelles conditions ils cessent de l'être.

## Principe de séparation des projets

### Projet A — Laboratoire LEYNOR actuel

But : terminer l'infrastructure de robustesse méthodologique, les simulations multi-régimes, les analyses de coûts, le holdout, le walk-forward, le Monte Carlo et les rapports consolidés.

### Projet B — Validation empirique des portefeuilles

But : reprendre les portefeuilles et résultats simulés déjà produits, les rejouer sur des données historiques réelles et comparer les résultats prévus aux trajectoires effectivement observées.

Le projet B réutilise les garde-fous du projet A mais ne doit pas être confondu avec lui.

## Critères d'entrée

Le projet B peut commencer lorsque les conditions suivantes sont remplies :

- le moteur de simulation utilisé est versionné ;
- la configuration de chaque portefeuille est reproductible ;
- les graines et paramètres des campagnes simulées sont conservés ;
- les métriques de comparaison sont définies avant l'ouverture des données de validation ;
- la CI du laboratoire est exécutable ;
- le rapport consolidé du laboratoire est techniquement publiable ;
- les limitations et preuves défavorables sont conservées.

## Phase 0 — audit de reprise

### Travaux

- inventorier les portefeuilles déjà simulés ;
- retrouver les campagnes, paramètres, graines et résultats associés ;
- identifier les sorties incomplètes ou non reproductibles ;
- vérifier les versions du moteur et des calculs ;
- séparer les hypothèses déjà figées des décisions encore ouvertes.

### Livrables

- registre des portefeuilles ;
- registre des campagnes ;
- matrice portefeuille × période × métrique ;
- liste des éléments manquants ;
- décision explicite sur ce qui peut être réutilisé.

### Critère de sortie

Chaque portefeuille retenu doit disposer d'une définition, d'une date de référence, d'une allocation, d'une politique de rééquilibrage, d'une politique de coûts et d'un identifiant reproductible.

## Phase 1 — protocole historique préenregistré

Le protocole doit être écrit avant d'examiner les résultats historiques complets afin de limiter l'ajustement rétrospectif.

### Définir

- les hypothèses testées ;
- les périodes historiques retenues ;
- les actifs et indices de référence ;
- les règles de reconstitution des portefeuilles ;
- les règles de rééquilibrage ;
- les frais, spreads, dividendes et fiscalité inclus ou exclus ;
- les métriques principales ;
- les seuils d'acceptation ;
- les critères de réfutation ;
- les périodes de calibration et les périodes hors échantillon.

### Métriques minimales

- rendement cumulé ;
- rendement annualisé ;
- volatilité ;
- drawdown maximal ;
- durée de récupération ;
- perte en période de crise ;
- stabilité relative entre portefeuilles ;
- erreur entre résultat simulé et résultat historique ;
- rang relatif prévu et rang relatif observé ;
- fréquence des inversions de conclusion.

### Critère de sortie

Le protocole doit pouvoir être exécuté sans choisir de nouvelles règles après observation des résultats.

## Phase 2 — acquisition et contrat des données réelles

### Travaux

- sélectionner des fournisseurs de données documentés ;
- récupérer les séries ajustées nécessaires ;
- enregistrer la provenance, la licence et la date de récupération ;
- vérifier les calendriers, fuseaux horaires, divisions, dividendes et valeurs manquantes ;
- refuser toute correction silencieuse ;
- produire une empreinte de chaque jeu de données.

### Jeux de données à couvrir

- périodes longues de marché normal ;
- crises rapides ;
- marchés baissiers prolongés ;
- remontées de taux ;
- inflation élevée ;
- marchés latéraux ;
- reprises rapides ;
- périodes de forte dispersion sectorielle.

### Critère de sortie

Chaque série doit être traçable, validée et rejouable avec la même empreinte.

## Phase 3 — moteur de replay historique

### Travaux

- brancher les données réelles au moteur LEYNOR ;
- reproduire les allocations aux dates compatibles ;
- appliquer les règles de versement et retrait ;
- appliquer les politiques de coûts ;
- gérer les actifs indisponibles sans substitution silencieuse ;
- conserver tous les événements d'exécution ;
- produire une sortie déterministe.

### Tests obligatoires

- reproductibilité ;
- absence de fuite temporelle ;
- cohérence des calendriers ;
- absence de prix futurs ;
- exactitude des rééquilibrages ;
- exactitude des coûts ;
- refus des données incomplètes ;
- équivalence des résultats pour des entrées identiques.

## Phase 4 — confrontation simulation versus histoire

### Comparaisons

Pour chaque portefeuille et période :

- comparer la distribution simulée au résultat historique ;
- mesurer la position du résultat réel dans la distribution simulée ;
- mesurer l'erreur absolue et relative ;
- vérifier si le classement attendu des portefeuilles est conservé ;
- identifier les conclusions qui changent de signe ;
- conserver les périodes qui réfutent les conclusions initiales.

### Résultats attendus

- tableau portefeuille × période ;
- écarts simulation/histoire ;
- intervalles empiriques ;
- taux de couverture du réel par les distributions simulées ;
- catalogue des contre-exemples ;
- liste des hypothèses fragiles.

## Phase 5 — validation hors échantillon

### Principe

Aucune conclusion finale ne doit reposer uniquement sur des périodes utilisées pour ajuster le moteur ou les paramètres.

### Travaux

- figer une première version du protocole ;
- séparer calibration et validation ;
- exécuter le protocole sur des périodes non utilisées ;
- mesurer la dégradation hors échantillon ;
- refuser toute modification sans nouvelle version du protocole ;
- conserver les résultats rejetés.

### Critère de sortie

Les conclusions robustes doivent rester directionnellement cohérentes sur plusieurs périodes hors échantillon indépendantes.

## Phase 6 — robustesse transversale

### Analyses

- sensibilité aux coûts ;
- sensibilité aux dates d'entrée ;
- sensibilité au calendrier de rééquilibrage ;
- sensibilité aux versements et retraits ;
- bootstrap de périodes ;
- walk-forward historique ;
- comparaison entre plusieurs fournisseurs de données ;
- analyse des ruptures de régime ;
- stabilité des conclusions entre portefeuilles.

### Règle

Une conclusion qui disparaît après une variation raisonnable d'une hypothèse doit être marquée comme fragile.

## Phase 7 — rapport scientifique de validation empirique

Le rapport doit distinguer clairement :

- ce qui est confirmé ;
- ce qui est partiellement confirmé ;
- ce qui est réfuté ;
- ce qui reste inconclusif ;
- ce qui dépend fortement des hypothèses ;
- ce qui ne peut pas être généralisé.

### Livrables

- rapport global ;
- fiches par portefeuille ;
- registre des contre-exemples ;
- manifeste des données ;
- manifeste des paramètres ;
- empreintes des résultats ;
- limites et décisions que le rapport ne permet pas de prendre.

## Phase 8 — intégration produit éventuelle

Aucune restitution utilisateur ne doit être intégrée automatiquement à l'application avant la validation méthodologique.

Une intégration produit éventuelle devra :

- afficher les hypothèses ;
- afficher les périodes testées ;
- afficher les limites ;
- éviter toute promesse de rendement ;
- distinguer simulation et observation historique ;
- ne pas présenter une validation partielle comme une vérité générale.

## Conditions d'arrêt

Le projet doit être suspendu si :

- les données ne sont pas légalement ou méthodologiquement utilisables ;
- les portefeuilles d'origine ne sont pas reproductibles ;
- les règles ont été ajustées après observation sans nouvelle version ;
- les résultats historiques sont incomparables aux simulations ;
- les conclusions sont trop instables pour être présentées ;
- une décision métier indispensable n'est pas documentée.

## Définition de terminé

Le projet est techniquement terminé lorsque :

- tous les portefeuilles retenus sont rejouables ;
- les données sont traçables ;
- les périodes de validation sont séparées ;
- les résultats sont reproductibles ;
- les écarts sont calculés ;
- les contre-exemples sont conservés ;
- le rapport final est généré ;
- la CI est verte.

Le projet n'est scientifiquement concluant que si les résultats hors échantillon soutiennent les conclusions sur plusieurs contextes indépendants. À défaut, le statut doit rester `inconclusive` ou `rejected`.

## Ordre d'enchaînement prévu

1. terminer et valider le Laboratoire LEYNOR actuel ;
2. exécuter l'audit de reprise des portefeuilles ;
3. figer le protocole historique ;
4. intégrer les données historiques ;
5. construire le replay ;
6. lancer les confrontations ;
7. exécuter le hors échantillon ;
8. produire le rapport de validation empirique ;
9. décider séparément d'une intégration produit.
