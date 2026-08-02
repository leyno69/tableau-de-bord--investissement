# LEYNOR AI — Protocole de validation externe de l’IGL

## Statut

Première brique de la phase 2. Ce document préenregistre la méthode ; il ne prétend pas que l’IGL est validé.

## Question scientifique

L’IGL expérimental apporte-t-il une information stable, reproductible et utile sur la robustesse structurelle d’un portefeuille, au-delà de modèles de référence beaucoup plus simples, sans utiliser d’information indisponible à la date observée ?

## Construction mesurée

La robustesse structurelle désigne ici la capacité documentée d’un portefeuille et de son détenteur à :

- absorber des chocs de liquidité ;
- limiter la dépendance à quelques positions ou facteurs corrélés ;
- éviter des ventes forcées dans des périodes défavorables ;
- récupérer après un choc dans un délai mesurable ;
- rester cohérent avec l’horizon et les contraintes déclarées.

Elle ne désigne ni le rendement futur, ni la qualité intrinsèque des titres, ni une garantie d’atteinte d’objectif.

## Résultats principaux préenregistrés

Les cibles doivent être observables et indépendantes du futur score :

1. drawdown maximal observé ;
2. occurrence d’une vente ou d’un retrait forcé ;
3. durée de récupération ;
4. interruption durable des versements, lorsque les données le permettent ;
5. rupture d’un seuil de concentration ou de liquidité défini avant l’analyse.

Toute modification ultérieure d’une cible devra créer une nouvelle version du protocole. Elle ne pourra pas être appliquée rétrospectivement au test final verrouillé.

## Séparation des données

Trois jeux indépendants sont obligatoires :

- `development` : construction des variables et familles de modèles ;
- `validation` : sélection et calibration ;
- `locked-test` : évaluation finale unique.

Chaque jeu doit posséder :

- un identifiant ;
- une empreinte cryptographique ;
- une période ;
- une provenance ;
- une licence ou base juridique d’utilisation ;
- une politique de correction et de versionnement.

Le jeu `locked-test` reste inaccessible pour la sélection de variables, le choix des seuils et la modification des cibles.

## Contrôle des fuites temporelles

Pour chaque variable, LEYNOR doit stocker au minimum :

- la date de l’observation évaluée ;
- la date à laquelle l’information est réellement devenue disponible ;
- la version de la source ;
- la transformation appliquée.

Une variable publiée après la date observée est une fuite temporelle et doit bloquer l’expérience. Elle ne doit pas être imputée silencieusement.

## Modèles de référence

L’IGL devra être comparé au minimum à deux références simples parmi :

- nombre de lignes uniquement ;
- poids de la plus grande position ;
- volatilité historique uniquement ;
- allocation d’actifs uniquement ;
- combinaison équipondérée transparente des composantes.

La complexité de l’IGL n’est justifiée que si elle apporte un gain hors échantillon stable, utile et explicable.

## Critères d’acceptation à fixer avant l’exécution

Le protocole technique impose que les règles soient déclarées avant l’ouverture du test final. Elles devront couvrir :

- performance supérieure aux références simples ;
- calibration ;
- stabilité entre périodes et régimes de marché ;
- absence de dégradation majeure sur les sous-populations ;
- sensibilité maîtrisée aux hypothèses ;
- audit de fuite temporelle réussi ;
- revue indépendante terminée ;
- limites compatibles avec une présentation utilisateur honnête.

Aucun seuil numérique n’est inventé dans cette PR. Les seuils devront être justifiés par une étude de puissance, des coûts d’erreur explicites et une validation indépendante.

## Ajustements interdits

Après ouverture du jeu de test final, il est interdit de :

- changer les seuils pour améliorer le résultat ;
- sélectionner ou supprimer une variable en fonction du test ;
- redéfinir les résultats principaux ;
- exclure une période ou une sous-population sans règle préenregistrée ;
- reconstruire un jeu de test jusqu’à obtenir une conclusion favorable.

Toute déviation doit être publiée comme telle et évaluée sur un nouveau jeu indépendant.

## Revue indépendante

La validation finale doit être menée ou reproduite par une personne qui n’a pas choisi les composantes et les seuils. Elle doit pouvoir :

- reproduire les calculs ;
- contester les hypothèses ;
- tester des références alternatives ;
- identifier les erreurs et biais ;
- recommander le rejet, la restriction ou la surveillance du modèle.

## Séquence d’exécution

1. Préenregistrer le protocole et ses critères.
2. Sélectionner des sources point-in-time licenciées.
3. Versionner les jeux de données et leur provenance.
4. Exécuter l’audit de disponibilité temporelle.
5. Construire uniquement sur le jeu de développement.
6. Calibrer uniquement sur le jeu de validation.
7. Geler le modèle et toutes ses règles.
8. Ouvrir une seule fois le jeu de test final.
9. Produire un rapport complet, y compris les échecs et contradictions.
10. Faire réaliser une revue indépendante.
11. Exécuter une période d’observation silencieuse avant toute exposition aux utilisateurs.
12. Décider : rejet, expérimentation prolongée, usage restreint ou candidature à la production.

## Garde-fous

- aucun score IGL de production ;
- aucune pondération manuelle ;
- aucune promesse de rendement ;
- aucune conclusion favorable présumée ;
- aucun jeu de données réel inclus dans cette PR ;
- aucune validation externe annoncée avant son exécution et sa revue.

## Prochaine étape

Créer le registre des sources de données externes et le contrat point-in-time : provenance, licence, empreinte, dates de disponibilité, survivorship bias et politique de corrections.
