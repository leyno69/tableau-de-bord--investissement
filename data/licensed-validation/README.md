# Point d’entrée des données exactes/licenciées

Ne déposer aucun fichier dont la licence n’autorise pas cet usage.

Chaque série doit fournir :

1. un CSV strict `date,level` ;
2. un manifeste contenant `provider`, `licenseReference`, `indexCode`, `returnVariant`, `currency` et `validationEligible: true` ;
3. les empreintes SHA-256 brute et normalisée ;
4. la base de rendement (prix, total return brut ou net), la politique de devise et la politique d’opérations sur titres ;
5. les dates d’acquisition et de disponibilité point-in-time.

Le parseur existant `validation/licensedBenchmarkCsv.js` refuse les manifestes non éligibles, les dates dupliquées et les niveaux invalides. Aucun proxy Yahoo ne doit être placé ici ou requalifié en série exacte.
