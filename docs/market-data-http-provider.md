# LEYNOR AI — Fournisseur HTTP de données de marché

## Objet

Cette brique connecte le contrat `MarketDataProvider` à une API HTTP sans coupler le noyau métier à Polygon, Databento, Nasdaq Data Link ou un autre fournisseur.

## Responsabilités

L’adaptateur générique reçoit explicitement :

- une fonction de construction de requête ;
- une fonction de transformation de réponse ;
- une implémentation de `fetch` injectable ;
- les capacités déclarées du fournisseur ;
- la provenance, la licence et une déclaration point-in-time ;
- un délai d’expiration.

Il normalise ensuite les observations OHLCV et exige `observedAt` et `availableAt` pour chaque ligne.

## Sécurité et reproductibilité

- aucune clé API n’est stockée dans le dépôt ;
- les secrets doivent être injectés dans les en-têtes par la configuration d’exécution ;
- les réponses HTTP non réussies bloquent l’import ;
- les données OHLC incohérentes sont rejetées ;
- les résultats et métadonnées sont immuables ;
- aucun résultat importé n’est déclaré validé ou prêt pour la production ;
- les opérations sur titres nécessitent un adaptateur dédié au schéma réel du fournisseur.

## Limite scientifique

Un transport HTTP fonctionnel ne prouve ni la qualité de la source, ni l’absence de survivorship bias, ni la disponibilité historique réelle. Chaque adaptateur fournisseur devra être lié au registre des sources externes et passer le pipeline anti-fuite temporelle avant toute campagne de validation.

## Prochaine étape

Créer des profils de configuration distincts pour les fournisseurs envisagés, sans implémenter de trafic réel tant qu’une licence et une clé valides ne sont pas disponibles.
