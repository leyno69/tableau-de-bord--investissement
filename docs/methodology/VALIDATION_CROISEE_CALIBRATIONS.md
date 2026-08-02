# Validation croisée des calibrations LEYNOR

## Objectif

La validation croisée compare plusieurs enregistrements du registre de calibration visant la même conclusion et utilisant le même protocole.

Elle répond à la question suivante : les critères documentés restent-ils concordants sur plusieurs jeux de données et validations hors échantillon indépendants ?

## Conditions de comparabilité

Les calibrations comparées doivent :

- partager le même identifiant de protocole ;
- viser la même conclusion ;
- disposer d’identifiants et d’empreintes de résultat uniques ;
- utiliser des jeux de données indépendants ;
- restituer des critères identifiables et des références de calibration traçables.

Les versions du protocole et du moteur sont inventoriées. Une divergence de version du protocole bloque la concordance automatique. Une divergence de version du moteur doit rester visible et être analysée séparément.

## Contrôles par critère

Pour chaque critère, LEYNOR restitue :

- le nombre d’enregistrements comparés ;
- la couverture du critère ;
- les statuts observés ;
- les références de calibration ;
- le nombre de validations hors échantillon ;
- les contradictions ;
- les blocages méthodologiques.

Un critère n’est déclaré concordant que lorsque :

- il est présent dans tous les enregistrements ;
- tous les statuts sont `satisfied` ;
- toutes les validations hors échantillon sont positives ;
- une seule référence de calibration est utilisée ;
- aucune contradiction n’est observée.

## Blocages explicites

Les blocages possibles incluent notamment :

- jeux de données non indépendants ;
- versions de protocole divergentes ;
- couverture incomplète d’un critère ;
- résultats contradictoires ;
- références de calibration divergentes ;
- validation hors échantillon incomplète.

## Limites

La concordance entre campagnes :

- ne calcule aucun score ni niveau de confiance ;
- ne constitue pas un niveau de preuve ;
- ne démontre pas une causalité ;
- ne garantit pas la généralisation à toutes les périodes, populations ou hypothèses ;
- ne constitue ni un IGL ni une recommandation d’investissement.

Cette annexe complète la section « Niveau de confiance » du `GUIDE_METHODOLOGIQUE_LEYNOR.md`. Toute évolution de ces règles doit être versionnée et revue avec le code correspondant.
