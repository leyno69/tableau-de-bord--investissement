# Sensibilité historique aux coûts — v1

## Objet

Cette expérience mesure séparément l’effet de la fenêtre historique et l’effet de coûts de transaction prédéfinis sur le preset `beginner`.

## Fenêtres

Six fenêtres glissantes d’environ un an sont utilisées à partir d’avril 2024, première période compatible avec l’existence réelle de WPEA. Les fenêtres se chevauchent : elles servent à tester la stabilité temporelle du résultat mais ne sont pas considérées comme six observations statistiquement indépendantes.

## Coûts

Les niveaux testés sont `0`, `10`, `25` et `50` points de base. Ils sont appliqués aux achats et ventes d’instruments négociés. Le ticker `CASH` est explicitement exempt : conserver une poche de liquidités n’est pas assimilé à un achat supportant des frais de transaction.

Dans le pilote actuel, il n’y a ni apport ni rééquilibrage. Les coûts testés représentent donc essentiellement le coût d’entrée. Les résultats ne doivent pas être extrapolés à une stratégie de rotation fréquente.

## Source et statut

Les cours ajustés proviennent du service Yahoo Finance Chart, utilisé uniquement comme source de développement. `validationEligibleSource` reste `false`.

Cette expérience peut révéler des incohérences, des sensibilités ou des défauts de moteur. Elle ne constitue pas la validation scientifique finale de LEYNOR.

## Interprétation

Les résultats doivent conserver :

- rendement par fenêtre ;
- volatilité annualisée ;
- drawdown maximal ;
- récupération ;
- coûts totaux ;
- écart de rendement par rapport au scénario sans frais.

Aucun seuil de réussite n’est introduit après lecture des résultats.
