# Registre des calibrations du niveau de preuve

## Objectif

Conserver une trace versionnée et auditable des résultats issus du protocole empirique de calibration du niveau de preuve.

Le registre ne calcule aucun score et n'attribue aucun niveau de preuve. Il mémorise les résultats nécessaires à une future classification, sans transformer leur quantité en qualité.

## Contenu d'un enregistrement

Chaque enregistrement contient notamment :

- l'identifiant et la version du protocole ;
- la conclusion concernée ;
- la version du moteur ;
- les empreintes des données et du résultat ;
- les critères évalués ;
- les études indépendantes ;
- le holdout ;
- la revue explicite des contradictions ;
- la décision méthodologique et ses limites ;
- l'enregistrement éventuellement remplacé.

## Statuts

- `prepared` : résultat préparé mais non validé ;
- `validated` : critères satisfaits et contradictions revues ;
- `rejected` : calibration rejetée ;
- `obsolete` : calibration conservée pour l'historique mais remplacée.

## Garanties

- objets immuables ;
- ordre déterministe ;
- ajout idempotent ;
- conflits d'identifiants et d'empreintes explicites ;
- historique de remplacement ;
- sérialisation versionnée.

## Limites

Le registre garantit la traçabilité, pas la validité scientifique des études enregistrées. Une calibration validée ne constitue ni une recommandation d'investissement, ni un niveau de confiance, ni un IGL.
