# Politique v1 — validation historique en deux pistes

## Pourquoi deux pistes

Lorsqu'un instrument est plus récent que l'horizon étudié, LEYNOR ne fabrique pas une série unique en recollant silencieusement l'indice de référence et le fonds réel.

Deux résultats indépendants sont conservés :

1. **Exact instrument** : uniquement sur la période où l'instrument existe réellement ;
2. **Benchmark proxy** : uniquement comme preuve historique étendue et explicitement étiquetée comme proxy.

Les deux pistes ne sont pas concaténées sous l'étiquette « historique de l'instrument ».

## WPEA

Pour les horizons 5, 8 et 20 ans, la profondeur historique exacte de WPEA est insuffisante puisque le fonds a été lancé le 26 mars 2024.

Politique préenregistrée :

- piste exacte : WPEA à partir du 26/03/2024 seulement ;
- piste étendue : benchmark officiel MSCI World net total return ;
- aucune concaténation silencieuse ;
- aucune prétention que les résultats du benchmark représentent exactement les rendements du fonds ;
- TER, réplication synthétique, spread de swap et tracking error restent des limites du proxy.

## PAEJ

Sur l'horizon 5 ans du preset `beginner`, l'instrument exact possède une profondeur temporelle suffisante. La piste exacte doit donc être prioritaire et aucun proxy n'est nécessaire pour couvrir cet horizon.

## NVDA

Sur l'horizon 8 ans du preset `growth`, l'action exacte possède une profondeur temporelle suffisante. Aucun proxy n'est nécessaire.

## SMH

Aucune politique de replay n'est autorisée tant que l'identité du ticker fictif du preset n'est pas résolue. Les produits US et UCITS ne doivent pas être fusionnés.

## Règle de restitution

Les résultats doivent conserver un namespace de provenance :

- `exact` pour l'instrument réel ;
- `proxy` pour le benchmark.

Une sortie `proxy` ne peut jamais être affichée ou enregistrée comme un historique exact de l'instrument.

Cette séparation permet de comparer la cohérence de la simulation sur longue période tout en mesurant séparément, lorsque l'histoire réelle le permet, l'écart entre l'instrument et sa référence.
