# Point d’entrée des données exactes/licenciées

Ne déposer aucun fichier dont la licence n’autorise pas cet usage.

Chaque série doit fournir :

1. un CSV strict `date,level` ;
2. un manifeste contenant `provider`, `licenseReference`, `indexCode`, `returnVariant`, `currency` et `validationEligible: true` ;
3. les empreintes SHA-256 brute et normalisée ;
4. la base de rendement (prix, total return brut ou net), la politique de devise et la politique d’opérations sur titres ;
5. les dates d’acquisition et de disponibilité point-in-time.

Le parseur existant `validation/licensedBenchmarkCsv.js` refuse les manifestes non éligibles, les dates dupliquées et les niveaux invalides. Aucun proxy Yahoo ne doit être placé ici ou requalifié en série exacte.

## Scellement métadonnées-seulement de la campagne accélérée

Les deux manifestes sont lus avant les CSV, sous les noms exacts :

- `paej.manifest.json` ;
- `worldProxy.manifest.json`.

Ils doivent contenir uniquement les champs suivants, sans `series`, `values`, `prices`, `levels`, `returns` ni `csv` :

```json
{
  "seriesId": "worldProxy",
  "provider": "fournisseur contractuel",
  "licenseReference": "référence vérifiable",
  "indexCode": "code exact",
  "returnVariant": "NETR",
  "currency": "EUR",
  "observationInterval": "daily",
  "coverageStart": "YYYY-MM-DD",
  "coverageEnd": "YYYY-MM-DD",
  "acquiredAt": "YYYY-MM-DDTHH:mm:ssZ",
  "pointInTimeStatus": "description auditable",
  "rawFingerprint": "sha256 sur 64 caractères hexadécimaux",
  "normalizedFingerprint": "sha256 sur 64 caractères hexadécimaux",
  "valueFileName": "worldProxy.csv",
  "valueSchema": "date,level",
  "validationEligible": true,
  "returnValuesIncluded": false
}
```

Le second manifeste remplace `seriesId` et `valueFileName` par `paej` et `paej.csv`. Les empreintes déclarées seront vérifiées lors de l'ouverture ultérieure des valeurs ; leur simple présence ne démontre pas encore l'intégrité du fichier.

Le scellement s'exécute seulement après avoir fixé un horodatage UTC, sans ouvrir les CSV :

```bash
LEYNOR_METADATA_SEALED_AT=YYYY-MM-DDTHH:mm:ssZ LEYNOR_RETURN_VALUES_ACCESSED_AT_SEAL=false node experiments/portfolio-probability-accelerated-historical-v1/seal-metadata.mjs
```

L'artefact produit lie les manifestes, la couverture commune, les fenêtres oldest-first, la méthode de sélection et l'audit de dépendance. Il doit exister avant toute lecture analytique de `paej.csv` ou `worldProxy.csv`. L'étape suivante autorise seulement le hachage des octets bruts ; le parsing des niveaux reste bloqué jusqu'à correspondance de l'empreinte brute.

Le sas d'intégrité a été verrouillé le `2026-08-07T22:15:01Z`, avant réception des données. Il applique cet ordre indivisible :

1. valider l'artefact de scellement et les deux manifestes ;
2. lire les octets bruts des deux CSV ;
3. vérifier les deux empreintes SHA-256 brutes avant le premier parsing ;
4. décoder strictement en UTF-8 et parser `date,level` ;
5. vérifier que les première et dernière dates correspondent exactement à la couverture déclarée ;
6. sérialiser chaque série en CSV canonique UTF-8 avec en-tête `date,level`, fins de ligne LF, dates croissantes, nombres convertis par la représentation numérique JavaScript sans zéros décimaux superflus et saut de ligne final ;
7. vérifier l'empreinte SHA-256 normalisée avant toute analyse.

L'empreinte normalisée du manifeste doit correspondre exactement aux octets de cette sérialisation canonique. Elle n'est donc pas l'empreinte du fichier brut simplement réécrit.

Après production de l'artefact de scellement, la vérification s'exécute avec un nouvel horodatage UTC :

```bash
LEYNOR_LICENSED_INPUTS_VERIFIED_AT=YYYY-MM-DDTHH:mm:ssZ node experiments/portfolio-probability-accelerated-historical-v1/verify-licensed-inputs.mjs
```

L'artefact `artifacts/portfolio-probability-accelerated-historical-v1-licensed-input-evidence.json` conserve uniquement les identifiants, empreintes, couvertures et effectifs. Il ne contient aucun niveau et ne lance aucune analyse.

`LEYNOR_RETURN_VALUES_ACCESSED_AT_SEAL=false` est une attestation auditable, pas une preuve cryptographique d'aveuglement. Si les niveaux ou rendements ont déjà été consultés pour choisir la méthode ou les fenêtres, ne pas produire cette attestation : conserver le fait comme limite et arrêter le scellement de cette cohorte.
