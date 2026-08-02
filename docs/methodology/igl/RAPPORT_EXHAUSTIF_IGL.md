# LEYNOR AI — Rapport exhaustif de l’Indice global LEYNOR (IGL)

**Version méthodologique :** IGL-EXPERIMENTAL-2026-08
**Date de référence :** 2 août 2026
**Statut :** synthèse exhaustive de la phase expérimentale ; aucun IGL de production activé

> Ce rapport décrit des simulations synthétiques et une méthode expérimentale. Il ne constitue ni une prévision, ni une promesse de rendement, ni un conseil en investissement.

## Résumé exécutif

Le Laboratoire LEYNOR a construit une infrastructure reproductible pour comparer des scénarios de comportement, de résilience, de diversification, de concentration, de corrélation, de volatilité, de chocs et d’horizon. Les campagnes fusionnées représentent **2 386 000 trajectoires synthétiques documentées**.

Le résultat central n’est pas un score final. Les campagnes montrent que les facteurs interagissent : un nombre de lignes plus élevé ne neutralise pas une forte corrélation, une réserve financière réduit les retraits forcés mais n’annule pas le risque de marché, et une interruption de versements produit des effets différents selon l’horizon et la capacité de reprise.

La conclusion méthodologique est donc stricte : **aucun poids ne peut être ajouté manuellement à l’IGL** et aucun IGL de production ne doit être affiché tant que les composantes candidates ne sont pas reproduites sur des campagnes indépendantes, calibrées hors échantillon et soumises à une porte de publication.

## 1. Principes directeurs

- L’IGL doit améliorer la compréhension de la situation d’un portefeuille, pas produire une impression artificielle de précision.
- Une simulation compare des scénarios ; elle ne prédit pas l’avenir.
- Score, niveau de confiance et niveau de preuve sont trois objets distincts.
- Une campagne unique ne peut pas déterminer une pondération.
- Les contradictions, cellules instables, données manquantes et limites restent visibles.
- Toute conclusion doit être traçable jusqu’aux campagnes, graines, hypothèses, métriques et versions du moteur.
- Aucun résultat synthétique n’est assimilé à une causalité réelle.
- Aucune promesse de rendement ou recommandation d’investissement n’est produite.

## 2. Chaîne méthodologique disponible

Le dépôt contient désormais les briques suivantes :

1. provenance et empreintes des données ;
2. bundles reproductibles et versions méthodologiques ;
3. contrats de campagne, plans de graines et exécution par lots ;
4. progression, annulation, reprise et instantanés de résultats ;
5. audits de complétude ;
6. agrégations statistiques, percentiles et stabilité entre graines ;
7. sensibilité aux hypothèses et interactions factorielles ;
8. contrats, calibrations et registres du niveau de confiance ;
9. registres, contradictions, fraîcheur, révocation et classification du niveau de preuve ;
10. portes de publication et audit de cohérence ;
11. convergence, validation croisée et comparaison expérimentale de modèles candidats à l’IGL.

Cette chaîne fournit une infrastructure d’audit. Elle ne suffit pas, à elle seule, à démontrer qu’un score global est scientifiquement valide.

## 3. Inventaire des campagnes exécutées

| Campagne | Objet | Trajectoires | Principales dimensions |
|---|---|---:|---|
| 1 | Versements réguliers contre interruption de douze mois | 20 000 | horizons 5, 10, 20 et 30 ans ; cinq graines |
| 2 | Modalités de reprise après interruption | 400 000 | reprise immédiate, progressive, retardée ou absente |
| 3 | Résilience financière face aux chocs de liquidité | 640 000 | réserves 0, 3, 6 et 12 mois ; quatre familles de chocs |
| 4 | Diversification structurelle | 180 000 | 2, 5, 8 et 20 actions ; concentration sectorielle ; proxy ETF |
| 5 | Nombre de lignes | 240 000 | 2, 3, 4, 5, 8, 10, 15 et 20 lignes |
| 6 | Pondérations, dérive, rééquilibrage et corrélation | 90 000 | six scénarios ; huit actifs ; corrélation explicite |
| 7 | Pilote factoriel | 96 000 | comportement, réserve, lignes, volatilité et horizon |
| 8 | Campagne factorielle étendue | 720 000 | comportement, réserve, lignes, volatilité, corrélation, choc et horizon |

**Total documenté : 2 386 000 trajectoires synthétiques.**

## 4. Résultats consolidés vérifiables

### 4.1 Comportement et continuité des versements

La campagne factorielle étendue a observé une valeur finale médiane agrégée de **134 266 €** pour le comportement régulier contre **118 711 €** pour une interruption de douze mois, dans le périmètre synthétique étudié. Cet écart ne constitue pas une prévision ; il illustre l’effet mécanique possible d’une interruption dans les hypothèses du modèle.

Les campagnes de reprise distinguent plusieurs trajectoires comportementales. Une reprise immédiate, progressive ou retardée ne doit pas être résumée par une règle universelle : l’impact dépend de l’horizon, des apports non effectués, du marché simulé et des chocs concomitants.

### 4.2 Résilience et réserve de liquidité

Dans la campagne factorielle étendue, une réserve de six mois a réduit le retrait forcé médian de **4 500 € à 2 700 €**. Dans un exemple à trente ans avec interruption et volatilité individuelle de 20 %, la réserve de six mois a réduit le retrait forcé de **3 600 € à 1 800 €**.

Cette observation soutient la candidature d’une composante de résilience, mais ne mesure pas le coût d’opportunité complet de la réserve et ne justifie aucun poids automatique.

### 4.3 Diversification, nombre de lignes et corrélation

Le nombre de lignes produit un effet, mais cet effet est conditionné par la corrélation, les pondérations et la concentration sectorielle. Une diversification nominale peut rester fragile lorsque les lignes réagissent de manière similaire.

Dans la campagne factorielle étendue, le passage de 5 à 15 lignes a eu un effet plus limité que les variations de corrélation ou de volatilité. Cette observation interdit d’utiliser le nombre de lignes comme proxy unique de diversification.

### 4.4 Corrélation et drawdown

Dans le modèle factoriel étendu, une corrélation de **0,75** a porté le drawdown médian à **33,30 %**, contre **19,80 %** pour une corrélation de **0,10**. La corrélation apparaît donc comme une dimension structurante du risque simulé.

Ce résultat est propre au modèle équicorrélé et aux distributions choisies. Il ne décrit pas toutes les dépendances réelles, notamment les corrélations qui augmentent en période de crise.

### 4.5 Intensité des chocs

Un choc synthétique de **7 200 €** a porté le drawdown médian à **45,38 %** dans la campagne factorielle étendue. L’intensité du choc et le moment où il survient interagissent avec la réserve, l’horizon et le comportement.

La capacité à supporter un retrait forcé est donc une composante candidate distincte de la volatilité de marché.

### 4.6 Stabilité entre graines

Pour les 2 880 réplications de la campagne factorielle étendue :

- dispersion relative médiane : **5,09 %** ;
- 90e percentile : **10,11 %** ;
- maximum : **22,33 %**.

Le maximum interdit de considérer toutes les cellules comme uniformément robustes. Le plan de réplications ciblées classe les cellules, ajoute les graines par lots de cinq et plafonne le calcul à 25 graines sans confondre plafond budgétaire et validation statistique.

## 5. Interactions entre facteurs

Les analyses factorielles ont été conçues pour éviter une hypothèse dangereuse : additionner des points indépendants alors que les facteurs interagissent.

Exemple documenté à trente ans, avec interruption et volatilité individuelle de 20 % :

| Structure | Drawdown médian | Retrait forcé |
|---|---:|---:|
| 5 lignes, aucune réserve | 31,30 % | 3 600 € |
| 5 lignes, réserve de 6 mois | 30,03 % | 1 800 € |
| 15 lignes, aucune réserve | 27,87 % | 3 600 € |
| 15 lignes, réserve de 6 mois | 26,86 % | 1 800 € |

La réserve agit principalement sur le retrait forcé ; le nombre de lignes agit davantage sur le drawdown dans cet exemple. Ces effets ne sont ni interchangeables ni nécessairement additifs.

## 6. Composantes candidates de l’IGL

| Composante candidate | Statut actuel | Justification |
|---|---|---|
| Résilience financière | candidate forte, validation indépendante requise | effets documentés sur retraits forcés et récupération ; coût d’opportunité incomplet |
| Diversification effective | candidate forte, définition multidimensionnelle requise | nombre de lignes insuffisant seul ; corrélation et concentration indispensables |
| Concentration | candidate | pondérations et dépendance à quelques lignes affectent le risque simulé |
| Corrélation/dépendance | candidate forte | effet important sur drawdown dans les campagnes synthétiques |
| Liquidité et capacité de retrait | candidate | interaction directe avec les chocs et retraits forcés |
| Stabilité des versements | candidate | effet reproductible dans les campagnes comportementales, sensible à l’horizon |
| Capacité de reprise | candidate | modalités de reprise distinguées ; validation sur cohortes indépendantes nécessaire |
| Volatilité | candidate descriptive | ne doit pas résumer seule le risque ni être assimilée à une perte certaine |
| Cohérence avec l’horizon | candidate | les effets changent entre 5, 10, 20 et 30 ans |
| Exposition sectorielle | provisoire | nécessite des données sectorielles réelles et une validation distincte |
| Qualité des données | garde-fou obligatoire | doit limiter ou bloquer le calcul plutôt que contribuer naïvement à un score |
| Comportement déclaré | provisoire | risque de biais déclaratif ; ne doit pas être confondu avec le comportement observé |

## 7. Niveau de confiance

Le niveau de confiance doit refléter la robustesse méthodologique d’un résultat, notamment :

- taille d’échantillon ;
- nombre et indépendance des graines ;
- convergence des cellules ;
- stabilité entre campagnes ;
- sensibilité aux hypothèses ;
- dispersion résiduelle ;
- fraîcheur et qualité des données.

Une campagne n’est considérée comme convergée dans le registre expérimental que si une part suffisante de cellules satisfait simultanément les critères de dispersion et de dérive d’effet. Ce seuil est une règle expérimentale révisable, pas une vérité universelle.

## 8. Niveau de preuve

Le niveau de preuve reste distinct du niveau de confiance. Il doit intégrer :

- reproductions indépendantes ;
- validation hors échantillon ;
- cohérence sur plusieurs campagnes ;
- données historiques ou externes pertinentes ;
- contradictions conservées et examinées ;
- qualité, indépendance et fraîcheur des sources.

Le nombre brut d’éléments ne constitue pas un niveau de preuve. Une contradiction importante ne peut pas être compensée mécaniquement par plusieurs éléments faibles favorables.

## 9. Validation croisée et calibration expérimentale

La validation croisée ajoutée au dépôt exige :

- des identifiants de campagne distincts ;
- la conservation de la direction de l’effet ;
- une dispersion maîtrisée dans la campagne de validation ;
- une dérive relative de l’effet sous un seuil explicite.

La calibration expérimentale compare des familles de modèles sur un jeu de validation tenu à l’écart avec RMSE, MAE et variance expliquée. Un modèle peut être sélectionné comme candidat expérimental uniquement s’il satisfait les seuils annoncés.

**Même sélectionné, un modèle n’autorise aucun IGL de production.**

## 10. Décisions méthodologiques retenues

- Ne pas afficher d’IGL tant que la calibration et la validation indépendante ne sont pas terminées.
- Ne pas choisir les poids manuellement.
- Ne pas utiliser le nombre de lignes comme mesure unique de diversification.
- Ne pas confondre volatilité, drawdown, probabilité de perte et capacité de retrait.
- Ne pas fusionner confiance et preuve dans un indicateur opaque.
- Utiliser la qualité des données comme porte de calcul et limitation explicite.
- Conserver les cellules instables, contradictions et limites dans les rapports.
- Versionner chaque protocole, résultat, calibration et remplacement.

## 11. Décisions rejetées

- Un score égal à la moyenne de sous-scores choisis intuitivement.
- Une pondération élevée donnée à un facteur sur la base d’une seule campagne.
- Un bonus automatique lié au seul nombre de lignes.
- Un score de thème copié sur une entreprise ou un ETF.
- Une probabilité affichée sans méthode, données, hypothèses et limites.
- Une courbe ou une métrique fabriquée lorsque les données sont indisponibles.
- Une classification de confiance ou de preuve fondée sur le seul volume de simulations.

## 12. Limites actuelles

- Les campagnes sont synthétiques et ne couvrent pas toutes les dynamiques des marchés réels.
- Les distributions de rendement, volatilité et corrélation reposent sur des hypothèses de modèle.
- La corrélation équicorrélée simplifie fortement les dépendances entre actifs.
- Les coûts, taxes, glissements, liquidité de marché et contraintes réglementaires ne sont pas tous modélisés.
- Le coût d’opportunité de la réserve de précaution reste incomplet.
- Les comportements simulés ne représentent pas toute la diversité humaine.
- Les résultats ne démontrent pas la causalité.
- Certaines cellules présentent encore une dispersion élevée entre graines.
- Les campagnes indépendantes de validation hors échantillon doivent être complétées avec des jeux de données séparés.
- Aucun modèle candidat n’a encore reçu l’autorisation méthodologique d’alimenter un IGL utilisateur.

## 13. Porte d’activation d’un futur IGL

Un IGL de production ne pourra être envisagé que si toutes les conditions suivantes sont satisfaites :

1. définition et formule versionnées pour chaque composante ;
2. données d’entrée identifiées, fraîches et auditables ;
3. au moins deux campagnes indépendantes convergées par composante ;
4. validation hors échantillon ;
5. stabilité du classement des modèles ;
6. contradictions et sensibilités documentées ;
7. niveau de confiance et niveau de preuve séparés ;
8. limites visibles dans l’interface et les exports ;
9. tests métier, CI et audit méthodologique au vert ;
10. aucune promesse de rendement ni décision automatique d’investissement.

## 14. Prochaines campagnes nécessaires

- Validation indépendante avec nouvelles graines et nouvelles périodes synthétiques.
- Tests de corrélations non constantes et dépendances de crise.
- Scénarios de coûts, fiscalité, inflation et liquidité.
- Validation avec données historiques documentées, sans surajustement.
- Analyse de sous-populations et profils d’horizon.
- Stress tests extrêmes et événements combinés.
- Mesure de stabilité temporelle des composantes candidates.
- Comparaison de modèles non linéaires explicables contre les modèles linéaires candidats.

## 15. Conclusion finale

Le Laboratoire LEYNOR dispose désormais d’un socle technique et méthodologique substantiel, construit autour de la reproductibilité, de la traçabilité et de la séparation entre analyse et décision.

Les campagnes soutiennent l’importance de la résilience, de la corrélation, de la concentration, de la liquidité, de la continuité des versements et de l’horizon. Elles montrent également qu’une pondération additive naïve serait trompeuse.

**Conclusion opérationnelle : l’IGL reste expérimental et ne doit pas être affiché comme score de production.** Le travail accompli permet de définir ce qui devra être prouvé avant son activation ; il ne permet pas encore de prétendre que les pondérations finales sont scientifiquement établies.
