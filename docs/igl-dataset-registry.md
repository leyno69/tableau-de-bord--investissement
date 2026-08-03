# Registre des jeux de données IGL

Ce registre versionne les jeux de données utilisés par les campagnes IGL sans confondre leur présence avec une validation scientifique.

## Métadonnées obligatoires

Chaque jeu déclare un identifiant, une version, un usage (`development`, `validation` ou `locked-test`), un statut, une période, un nombre d'enregistrements, une version de schéma, une transformation et les empreintes de toutes ses sources.

L'empreinte SHA-256 du jeu et celle du registre sont calculées sur une représentation canonique déterministe.

## Garde-fous

L'audit bloque l'éligibilité à une validation externe lorsque l'un des points suivants manque :

- disponibilité point-in-time vérifiée ;
- licence vérifiée ;
- audit du survivorship bias ;
- audit des révisions ;
- statut `frozen`.

Même lorsqu'un registre devient techniquement éligible, `readyForExternalValidation` et `readyForProduction` restent à `false`. Leur activation exige le protocole indépendant défini séparément.

## Portée actuelle

Les acquisitions Twelve Data peuvent être enregistrées pour le développement. Elles ne doivent pas être reclassées comme jeux de validation ou de test verrouillé tant que leurs limites temporelles, juridiques et historiques ne sont pas résolues.
