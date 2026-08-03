# Fournisseur Twelve Data

## Statut

Premier fournisseur HTTP exploitable sans carte bancaire. L’adaptateur prépare l’usage d’une clé existante, mais n’annonce ni import réel exécuté ni validation externe.

## Secret

La clé doit être fournie uniquement par `TWELVEDATA_API_KEY`. Elle est transmise dans le header `Authorization: apikey ...` et n’est jamais ajoutée à l’URL, aux commits ou aux journaux applicatifs.

## Endpoint

L’adaptateur utilise `https://api.twelvedata.com/time_series` avec un symbole, un intervalle documenté et une taille de sortie bornée par la requête appelante.

## Interprétation scientifique

Les champs OHLCV et le timestamp de barre sont normalisés. En revanche, cet adaptateur ne prouve pas :

- la disponibilité point-in-time de chaque observation ;
- l’historique des corrections et révisions ;
- l’inclusion des sociétés radiées ;
- l’absence de survivorship bias ;
- l’autorisation de redistribution selon le plan actif.

Les capacités correspondantes restent donc volontairement à `false`. Les données Twelve Data peuvent alimenter le développement et les essais d’intégration, mais ne suffisent pas seules à déclarer l’IGL validé extérieurement.

## Quota

`/time_series` consomme des crédits selon le nombre de symboles. Les réponses 429 sont propagées sans contournement. Un futur registre d’acquisition devra conserver les headers de consommation, l’empreinte du lot, la période, le symbole et la date d’ingestion.

## Prochaine étape

Ajouter un audit de configuration et un premier import contrôlé sur un symbole et une courte période, après installation sécurisée de `TWELVEDATA_API_KEY` dans l’environnement d’exécution.
