# Campagne 7 — Pilote factoriel croisé

## Statut

Campagne reproductible `factorial-pilot-001`.

Cette campagne croise plusieurs dimensions déjà étudiées séparément afin de vérifier leurs interactions. Elle compare des scénarios synthétiques et ne constitue ni une prévision de marché, ni une recommandation personnalisée.

## Plan factoriel

- comportements : versements réguliers / interruption de douze mois ;
- réserve : 0 ou 6 mois de versements ;
- nombre de lignes : 5 ou 15 ;
- volatilité individuelle : 12 % ou 20 % ;
- corrélation constante : 0,35 ;
- horizons : 5, 10, 20 et 30 ans ;
- cinq graines indépendantes ;
- 300 trajectoires par cellule et par graine ;
- 96 000 trajectoires au total.

Toutes les cellules utilisent le même rendement géométrique annuel hypothétique de 5 %, un capital initial de 10 000 € et un versement mensuel de 300 €.

## Objectif

Cette première campagne factorielle ne cherche pas à produire un score. Elle vérifie si les effets observés séparément restent cohérents lorsqu’ils sont croisés :

1. effet d’une interruption des versements ;
2. protection partielle apportée par une réserve ;
3. effet du nombre de lignes à corrélation constante ;
4. effet du niveau de volatilité ;
5. évolution de ces interactions selon l’horizon.

## Résultats sélectionnés à 30 ans

| Comportement | Réserve | Lignes | Volatilité individuelle | Médiane finale | Drawdown médian | Retrait forcé médian |
|---|---:|---:|---:|---:|---:|---:|
| Interruption | 0 mois | 5 | 20 % | 225 910 € | 31,30 % | 3 600 € |
| Interruption | 6 mois | 5 | 20 % | 225 056 € | 30,03 % | 1 800 € |
| Interruption | 0 mois | 15 | 20 % | 222 979 € | 27,87 % | 3 600 € |
| Interruption | 6 mois | 15 | 20 % | 234 668 € | 26,86 % | 1 800 € |
| Régulier | 0 mois | 5 | 12 % | 271 457 € | 14,78 % | 0 € |
| Régulier | 0 mois | 15 | 12 % | 274 835 € | 12,51 % | 0 € |

## Lecture méthodologique

Les interactions confirment plusieurs points, mais elles montrent aussi pourquoi une conclusion issue d’un seul facteur serait fragile.

- Une réserve de six mois réduit mécaniquement le retrait forcé de 3 600 € à 1 800 € dans le scénario d’interruption défini.
- À corrélation constante, quinze lignes réduisent généralement le drawdown par rapport à cinq lignes.
- Une volatilité individuelle de 20 % domine fortement l’effet du nombre de lignes sur les drawdowns.
- La médiane finale ne suit pas toujours une hiérarchie parfaite entre toutes les cellules, car l’échantillon reste volontairement limité et les trajectoires aléatoires peuvent déplacer les médianes.
- La réserve n’est pas modélisée avec un rendement alternatif ni un coût d’opportunité. Elle ne doit donc pas être classée à partir de la seule valeur finale du portefeuille.

## Conséquences pour LEYNOR

Cette campagne ne justifie aucune pondération de l’IGL. Elle confirme toutefois que les dimensions suivantes devront rester séparées dans toute future composante :

- comportement de versement ;
- liquidité disponible ;
- diversification effective ;
- volatilité ;
- horizon.

Une addition naïve de points masquerait les interactions. La prochaine étape devra augmenter l’échelle, introduire plusieurs niveaux de corrélation, plusieurs intensités de chocs et utiliser une analyse de sensibilité structurée.

## Limites

- hypothèses synthétiques ;
- rendements mensuels indépendants et lognormaux ;
- corrélation constante ;
- seulement deux niveaux par facteur principal ;
- aucune inflation, fiscalité ni frais ;
- réserve sans rendement et sans coût d’opportunité ;
- aucun revenu irrégulier ;
- aucun rééquilibrage ;
- aucune calibration historique multi-régimes ;
- aucune causalité réelle ne peut être déduite ;
- aucun résultat ne doit alimenter automatiquement l’IGL.

## Conclusion provisoire

Le pilote valide l’infrastructure factorielle et montre que les facteurs ne doivent pas être interprétés isolément. La robustesse d’une future méthodologie LEYNOR dépendra de campagnes plus larges, de réplications supplémentaires et d’analyses de sensibilité avant toute construction de score.
