# Contrat de qualité des données du Radar LEYNOR

## Statut

Ce document complète le Guide méthodologique LEYNOR. Il définit les conditions minimales permettant à une donnée d'alimenter le Radar.

## Décision utilisateur éclairée

Déterminer si un sujet dispose d'un socle d'informations suffisamment frais, complet, diversifié et traçable pour mériter une analyse plus approfondie.

Ce contrat ne produit ni recommandation d'achat ou de vente, ni probabilité de performance.

## Familles de sources

Le Radar peut intégrer des observations provenant notamment des familles suivantes :

- marché ;
- fondamentaux ;
- macroéconomie ;
- actualités ;
- sentiment ;
- positionnement ;
- analyse technique ;
- événements ;
- données alternatives.

Le nombre de familles n'est pas un objectif en soi. Une source n'est conservée que si sa contribution, ses biais, sa licence, sa méthode et ses limites sont documentés.

## Définition obligatoire d'une source

Chaque source doit déclarer :

- un identifiant stable ;
- son fournisseur ;
- sa famille ;
- son point d'accès ou son origine interne ;
- sa latence attendue ;
- son âge maximal acceptable ;
- ses seuils minimaux de couverture et de complétude ;
- sa licence ;
- sa méthodologie ;
- ses limites connues.

## Traçabilité obligatoire d'une observation

Chaque observation doit contenir :

- l'actif ou le sujet concerné ;
- l'heure d'observation ;
- l'heure de réception ;
- la valeur et son unité ;
- la couverture ;
- la complétude ;
- un identifiant de lignée ;
- une empreinte du jeu de données ;
- les drapeaux de qualité éventuels.

## États de qualité

Une observation peut être :

- `accepted` : conforme aux exigences déclarées ;
- `degraded` : utilisable avec une limite explicite, par exemple une latence excessive ;
- `rejected` : inutilisable pour produire un signal, notamment si elle est périmée, incomplète ou insuffisamment couverte.

Une donnée rejetée reste traçable mais ne participe pas au calcul.

## Barrière avant signal

Par défaut, un signal Radar exige au minimum :

- 80 % d'observations utilisables ;
- trois sources indépendantes ;
- deux familles de sources distinctes.

Ces seuils sont des barrières de sécurité initiales et non une calibration de performance. Ils devront être réévalués par campagnes, analyses de sensibilité et validation hors échantillon avant toute qualification de confiance.

## Sources multiples et indépendance

Répéter plusieurs observations issues du même fournisseur ne constitue pas plusieurs preuves indépendantes.

Le Radar doit distinguer :

- nombre d'observations ;
- nombre de sources indépendantes ;
- diversité des familles ;
- qualité et fraîcheur de chaque observation.

## Limites

Ce contrat :

- ne prouve pas la pertinence prédictive d'une source ;
- ne garantit pas l'absence de biais communs entre fournisseurs ;
- ne transforme pas la diversité des sources en niveau de preuve ;
- ne remplace pas la calibration du moteur statistique ;
- ne permet pas d'afficher un pourcentage de confiance.

## Impact produit

Toute future intégration de source doit mettre à jour :

- le registre des sources ;
- les tests d'ingestion ;
- les règles de fraîcheur ;
- les limites visibles dans l'interface ;
- le Guide méthodologique si elle modifie une conclusion ou un seuil.
