# Guide méthodologique LEYNOR AI

## Statut du document

Ce document est la source de vérité méthodologique du projet LEYNOR AI.

Toute fonctionnalité qui modifie une méthode, une hypothèse, une métrique, une conclusion, un niveau de confiance, un niveau de preuve, une simulation, un rapport Premium ou un futur composant de l’IGL doit mettre à jour ce document dans la même pull request.

Une fonctionnalité ne doit pas être considérée comme terminée si son impact méthodologique n’est pas documenté.

---

## 1. Finalité de LEYNOR AI

LEYNOR AI est une plateforme d’analyse de portefeuille, de simulation financière et d’aide à la décision.

LEYNOR AI ne prédit pas l’avenir, ne garantit aucun rendement et ne remplace pas un conseil financier réglementé.

L’application doit aider l’utilisateur à comparer des scénarios, comprendre les facteurs qui influencent ses résultats et identifier les limites des conclusions produites.

---

## 2. Test obligatoire pour toute nouvelle fonctionnalité

Toute nouvelle fonctionnalité doit répondre explicitement aux trois questions suivantes :

1. Quelle décision aide-t-elle à éclairer ?
2. Quelles données, simulations, méthodes ou preuves soutiennent son résultat ?
3. Quelles sont ses limites et dans quels cas ne faut-il pas s’y fier ?

Une fonctionnalité qui ne peut pas répondre clairement à ces trois questions ne doit pas être exposée comme fonctionnalité Premium ni comme aide à la décision.

---

## 3. Principes non négociables

### 3.1 Explicabilité

Chaque résultat important doit pouvoir être relié à :

- une méthode identifiée ;
- des paramètres explicites ;
- des données ou simulations identifiables ;
- des hypothèses documentées ;
- des limites compréhensibles ;
- une date ou une version de calcul.

### 3.2 Reproductibilité

Toute simulation déterministe doit restituer au minimum :

- la version du moteur ;
- la graine ;
- les paramètres ;
- l’identifiant de campagne ;
- l’identifiant reproductible ;
- les résultats et distributions utiles.

À graine et paramètres identiques, le résultat doit être reproductible.

### 3.3 Séparation entre analyse et décision

LEYNOR AI peut :

- comparer des scénarios ;
- mesurer des écarts ;
- exposer des risques ;
- expliquer des sensibilités ;
- montrer des distributions et probabilités empiriques.

LEYNOR AI ne doit pas :

- promettre un rendement ;
- présenter une simulation comme une prévision ;
- fabriquer une recommandation d’achat ou de vente ;
- masquer l’incertitude ;
- transformer une corrélation observée en causalité démontrée.

### 3.4 Absence de faux score

Un score ne doit être affiché que si sa définition, sa formule, sa calibration, ses bornes, ses tests, ses limites et sa traçabilité sont documentés.

Un faux score est considéré comme plus dangereux qu’une absence de score.

### 3.5 Absence de pondération arbitraire

Aucune pondération de l’IGL ne doit être choisie manuellement à partir d’une intuition ou d’un résultat isolé.

Toute pondération future devra être soutenue par plusieurs campagnes indépendantes, une validation hors échantillon et une analyse de sensibilité.

---

## 4. Architecture méthodologique

LEYNOR AI est organisé en six couches :

1. **Données** : import, validation, qualité, fraîcheur et traçabilité.
2. **Simulations** : scénarios déterministes, graines, campagnes et exécution par lots.
3. **Analyse** : distributions, percentiles, drawdowns, récupération, sensibilité et stabilité.
4. **Validation méthodologique** : calibration, confiance, preuve, contradictions et limites.
5. **Restitution** : rapports PDF, graphiques, Radar, tableaux de bord et explications IA.
6. **Aide à la décision** : comparaison de scénarios et compréhension des compromis, sans conseil d’investissement automatisé.

Une couche ne doit pas inventer une information qui n’est pas démontrée par les couches précédentes.

---

## 5. Simulations et campagnes

Les simulations doivent comparer des scénarios et non prédire les marchés.

Chaque campagne doit documenter :

- l’objectif de l’étude ;
- les questions explorées ;
- les hypothèses ;
- les paramètres ;
- les graines ;
- la taille d’échantillon ;
- les événements et chocs simulés ;
- les métriques calculées ;
- les limites ;
- les critères d’arrêt ou d’annulation ;
- la version du moteur.

Les campagnes importantes doivent être exécutées sur plusieurs graines indépendantes.

Les résultats consolidés doivent distinguer :

- moyenne ;
- médiane ;
- percentiles ;
- dispersion ;
- fréquence des pertes ;
- drawdown maximal ;
- durée de récupération ;
- probabilité empirique d’objectif ;
- impact des retraits ;
- impact des comportements ;
- scénarios non récupérés.

### 5.1 Validation historique préenregistrée des portefeuilles

Toute confrontation d’une simulation de portefeuille à l’histoire réelle doit partir d’une spécification expérimentale scellée avant l’examen des résultats de validation complets.

Cette spécification doit fixer au minimum :

- le preset ou portefeuille source ;
- la version méthodologique ;
- le commit exact du moteur ;
- la date historique de référence ;
- l’horizon ;
- l’allocation ;
- la politique de rééquilibrage ;
- la politique de coûts ;
- l’identifiant de campagne ;
- le plan de graines ;
- l’instantané de résultats simulés à confronter.

Une empreinte déterministe doit changer si l’un de ces éléments change. Une spécification déjà utilisée ne doit jamais être modifiée silencieusement : toute évolution nécessite une nouvelle version ou un nouvel identifiant.

Les périodes de calibration, de validation et de test verrouillé doivent être définies avant lecture des résultats correspondants. Une règle modifiée après observation doit être traitée comme une nouvelle expérience et ne peut pas réutiliser le statut de validation précédent.

La confrontation historique peut confirmer, fragiliser, réfuter ou laisser inconclusive une conclusion ; elle ne transforme jamais une performance passée en garantie future.

### 5.2 Proxies historiques

Lorsqu’un horizon précède la date d’existence réelle d’un instrument, LEYNOR ne doit jamais prolonger silencieusement son historique.

Un proxy historique ne peut être retenu que s’il est relié à l’instrument par une référence officielle de l’émetteur ou de l’administrateur d’indice, de préférence l’indice de référence déclaré du fonds. Il doit être sélectionné et enregistré avant accès aux résultats de validation concernés.

Chaque proxy doit conserver :

- l’instrument source ;
- l’identifiant du proxy ;
- le benchmark officiel ;
- la base de rendement ;
- la devise ;
- la source officielle ;
- le protocole qui l’autorise ;
- la justification ;
- toutes les limites connues.

L’utilisation d’un indice comme proxy ne doit jamais faire croire que l’indice est le fonds. Les frais, coûts de réplication, spreads de swap, tracking error, fiscalité ou effets de change non reconstitués doivent rester explicitement visibles comme limites.

Un changement de proxy après lecture des résultats constitue une nouvelle expérience et invalide toute prétention de préenregistrement pour l’expérience précédente.

### 5.3 Métriques de replay historique

Les métriques historiques doivent être calculées sur une trajectoire de valeur qui conserve explicitement les flux externes. Un apport ou un retrait ne doit jamais être assimilé à une performance.

Pour chaque période après la première valorisation, le rendement ajusté des flux est défini par `r_t = (V_t - F_t) / V_(t-1) - 1`, où `V_t` est la valeur après exécution des événements du jour et `F_t` le flux externe net du jour. Les coûts de transaction restent inclus dans la performance et ne sont pas neutralisés comme des flux externes.

Le rendement cumulé est obtenu par chaînage géométrique des rendements ajustés. Le rendement annualisé utilise la durée calendaire réelle et une année conventionnelle de `365.2425` jours.

Pour des observations quotidiennes de marché, la volatilité annualisée utilise l’écart-type échantillonnal des rendements de période et le facteur `sqrt(252)`. Cette convention ne suppose ni exactement 252 séances chaque année, ni indépendance ou normalité des rendements ; elle sert de convention de comparaison versionnée.

Le drawdown maximal est mesuré sur l’indice de richesse ajusté des flux, afin qu’un apport ne puisse pas masquer artificiellement une baisse. La récupération conserve le sommet précédent, le creux, la date éventuelle de récupération, la durée du creux à la récupération et la durée totale sous le sommet. Une trajectoire non récupérée reste explicitement non récupérée.

Les métriques d’une piste proxy restent celles du proxy. Elles ne doivent jamais être présentées comme l’historique de l’instrument réel avant son existence.

Toute modification de ces conventions exige une nouvelle version méthodologique et ne doit pas être décidée après lecture des résultats qu’elle servirait à évaluer.

### 5.4 Comparaison simulation / historique

La confrontation simulation / historique v1 est strictement descriptive. Elle compare un instantané de simulation préenregistré à une trajectoire historique calculée selon les conventions LEYNOR.

La comparaison porte au minimum sur :

- le rendement ajusté des flux externes ;
- la volatilité annualisée ;
- le drawdown maximal ;
- la durée de récupération lorsqu’une récupération est observée.

Pour chaque métrique, LEYNOR doit conserver la valeur simulée, la valeur historique, l’écart signé et, lorsque le dénominateur le permet, l’erreur relative. Les définitions comparées doivent être économiquement compatibles ; une ressemblance de nom ne suffit pas.

Aucun seuil de réussite, score de conformité, note ou verdict « simulation correcte / incorrecte » ne doit être dérivé de ces écarts sans calibration préenregistrée, plusieurs fenêtres indépendantes, validation hors échantillon et analyse de sensibilité. Une réalisation historique unique n’est pas une distribution.

Une comparaison utilisant un proxy doit rester explicitement identifiée comme telle et ne peut jamais être présentée comme une validation historique de l’instrument réel avant sa date d’existence.

Le protocole détaillé est défini dans `docs/methodology/COMPARAISON_SIMULATION_HISTORIQUE.md`.

### 5.5 Sensibilité historique aux coûts

Toute étude de coûts doit préciser avant exécution quels instruments supportent réellement les coûts modélisés. Une poche de liquidités ne doit pas supporter artificiellement des frais de transaction simplement parce qu’elle est représentée par un ticker technique tel que `CASH`.

Le moteur peut donc déclarer explicitement des tickers exempts de coûts. Cette exemption fait partie de la politique de coûts versionnée et doit être visible dans les résultats.

Les fenêtres glissantes peuvent être utilisées pour étudier la sensibilité temporelle, mais leur chevauchement doit être documenté et elles ne doivent pas être traitées comme observations indépendantes. Les niveaux de coûts testés doivent être préenregistrés avant lecture des résultats.

Le protocole détaillé est défini dans `docs/methodology/PORTFOLIO_HISTORICAL_COST_SENSITIVITY_V1.md`.

### 5.6 Diagnostic descriptif de couverture historique

Une observation historique peut être positionnée dans des bandes déjà produites par une simulation préenregistrée afin de rendre la confrontation reproductible. Pour la valeur finale, les bandes v1 utilisent p05, p25, médiane, p75 et p95. Pour le drawdown, elles utilisent la médiane, le p95 et le maximum simulé sur la magnitude de la baisse.

Ces bandes ne sont jamais des seuils de réussite ou d’échec. Une observation au-delà de p95 ou du maximum simulé doit rester visible et déclencher une investigation ; elle ne doit pas être supprimée, reclassée ou utilisée pour ajuster rétroactivement les bornes de l’expérience.

Les comptages de fenêtres par bande ne doivent pas être convertis en fréquence de couverture ou probabilité calibrée lorsque les fenêtres se chevauchent ou que la source de données n’est pas admissible à la validation scientifique.

Le protocole détaillé est défini dans `docs/methodology/HISTORICAL_COVERAGE_DIAGNOSTICS_V1.md`.

### 5.7 Appariement obligatoire des horizons

Toute confrontation descriptive entre une observation historique et une distribution simulée doit utiliser des horizons économiquement compatibles. Un trimestre historique ne doit jamais être positionné dans les percentiles d’une simulation annuelle simplement parce que les métriques portent le même nom.

Le moteur peut exprimer une durée de simulation en mois lorsque l’horizon étudié n’est pas un nombre entier d’années. Cette durée conserve les mêmes conventions mensuelles de rendement, volatilité, frais et contributions que l’API annuelle. Une durée de 12 mois avec mêmes paramètres et même graine doit reproduire exactement le résumé de la simulation annuelle équivalente.

Lorsqu’une observation historique dépasse le p95 d’une distribution appariée, ce dépassement doit être conservé comme preuve adverse descriptive. Il ne constitue pas à lui seul une réfutation du modèle, mais il doit déclencher une investigation et ne peut jamais être utilisé pour déplacer rétroactivement les percentiles ou modifier l’expérience initiale.

Le protocole détaillé est défini dans `docs/methodology/MATCHED_HORIZON_SIMULATION_V1.md`.

### 5.8 Piste de validation historique sous licence

Une confrontation ne peut être promue au statut de validation scientifique que si chaque série utilisée dispose d’un droit d’usage explicite, d’une référence de licence ou de contrat traçable, d’une devise compatible avec le protocole et d’un statut `validationEligible: true`.

Le benchmark officiel candidat pour prolonger WPEA avant son lancement est le MSCI World Index, code `990100`, variante `NETR`. L’identité officielle du benchmark ne vaut pas autorisation d’utiliser ou redistribuer sa série historique. Sans licence adaptée, les données MSCI restent bloquées pour la piste scientifique.

La piste `beginner` est définie en EUR. Une série USD ne doit jamais être utilisée silencieusement comme équivalent du proxy EUR. La conversion éventuelle doit elle-même être documentée et préenregistrée.

Le plan v1 fixe avant lecture des données licenciées cinq fenêtres annuelles non chevauchantes : 2015, 2018, 2020, 2022 et 2023. Elles sont stratifiées par régime mais ne doivent pas être qualifiées de tirages iid ni de preuve d’indépendance statistique.

Le runner de validation stricte doit refuser tout fallback vers une source `development-only`. Les résultats Yahoo déjà produits restent exploratoires et ne peuvent pas être promus rétroactivement.

Le protocole détaillé est défini dans `docs/methodology/LICENSED_BENCHMARK_VALIDATION_TRACK_V1.md`.

### 5.9 Validation empirique par proxy ETF

Lorsqu’une série de benchmark officielle sous licence n’est pas disponible, LEYNOR peut exécuter une piste empirique secondaire sur un proxy ETF réel, à condition que le proxy soit choisi et documenté avant lecture des résultats.

Pour le preset `beginner`, le proxy WPEA pré-2024 est `IWDA.AS`, iShares Core MSCI World UCITS ETF, ISIN `IE00B4L5Y983`. Il est retenu en raison de son historique depuis 2009 et de son benchmark déclaré MSCI World Index (Net), et non en fonction de ses performances observées. PAEJ reste l’instrument réel `PAEJ.PA` sur les fenêtres retenues.

Cette piste porte le niveau de preuve `supporting-empirical-evidence`. Elle peut soutenir une conclusion de robustesse empirique, révéler des contradictions et positionner les observations dans des distributions simulées appariées. Elle ne peut jamais être qualifiée de validation officielle du MSCI World, d’équivalence historique entre IWDA et WPEA, de preuve prédictive ou de garantie de rendement futur.

Les fenêtres annuelles 2015, 2018, 2020, 2022 et 2023 sont figées avant lecture des résultats. Tout dépassement d’une borne simulée, notamment d’un p95 de risque, doit être conservé comme preuve adverse et ne doit entraîner aucune recalibration rétroactive.

Le protocole détaillé est défini dans `docs/methodology/ETF_PROXY_VALIDATION_TRACK_V1.md`.

### 5.10 Appariement de la fréquence d’observation des métriques

Une métrique dépendant du chemin, notamment le drawdown ou la durée de récupération, ne doit être confrontée à une distribution simulée que si sa fréquence d’observation est compatible avec celle du moteur.

Le moteur `beginner` v1 évolue mensuellement et son drawdown est donc observé sur des états mensuels. Un drawdown historique calculé quotidiennement reste une information de risque légitime, mais ne doit pas être positionné directement dans les percentiles d’un drawdown simulé mensuel. Pour cette confrontation, la trajectoire historique doit être rééchantillonnée à la fréquence mensuelle correspondante ou la simulation doit produire une distribution à fréquence quotidienne équivalente.

Une preuve adverse issue d’une comparaison de fréquence non appariée doit être conservée dans l’historique des résultats, mais son statut doit être corrigé en `non-comparable-frequency` et elle ne peut plus être utilisée comme preuve de sous-estimation du moteur.

Le diagnostic v1 a montré que le drawdown quotidien 2020 du proxy `beginner` était de 21,68 %, contre 11,51 % après échantillonnage mensuel. Le dépassement du p95 annuel simulé de 15,82 % disparaît donc en fréquence appariée. Cette correction ne constitue pas une recalibration du moteur : elle corrige la comparabilité de la métrique.

Le protocole détaillé est défini dans `docs/methodology/DRAWDOWN_RISK_DIAGNOSTICS_V1.md`.

### 5.11 Diagnostic de risque modèle et validation croisée

Le rejet diagnostique de la normalité mensuelle ne suffit pas à autoriser une complexification du moteur. Toute alternative doit démontrer une amélioration hors période d’estimation selon un protocole préenregistré.

La validation temporelle Student-t v1 utilise les degrés de liberté `[4, 6, 8, 12, 20]`, sélectionnés sur l’entraînement uniquement. Student-t gagne un fold sur trois et dégrade le score de log-vraisemblance négative agrégé ; les queues épaisses seules ne justifient donc pas une modification du moteur.

La validation EWMA v1 utilise les paramètres `[0.90, 0.94, 0.97]`, également sélectionnés sur l’entraînement uniquement. EWMA gagne deux folds sur trois mais dégrade le score agrégé en raison du premier fold. Le signal est donc mitigé et insuffisant pour promouvoir une volatilité conditionnelle dans le moteur de production.

Le moteur `beginner` reste inchangé. Toute nouvelle mécanique doit être développée dans un prototype séparé puis démontrer une amélioration reproductible et, ensuite, une validation hors échantillon distincte.

Les protocoles détaillés sont définis dans `docs/methodology/HEAVY_TAIL_CROSS_VALIDATION_V1.md`, `docs/methodology/CONDITIONAL_VOLATILITY_CROSS_VALIDATION_V1.md` et `docs/methodology/MODEL_RISK_DECISION_V1.md`.

### 5.12 Validation empirique du calculateur DCA

Le calculateur DCA est une projection déterministe distincte du portefeuille complet. Sa validation ne doit donc pas intégrer silencieusement le cash résiduel du preset ni lui attribuer une distribution de probabilité inexistante.

Le protocole v1 confronte exactement 3 000 € initiaux, 150 € mensuels pendant 60 mois et un rendement constant de 7 % à trois séquences historiques de cinq ans utilisant `IWDA.AS` comme proxy ETF Monde : 2010–2014, 2015–2019 et 2020–2024.

Les trois fenêtres observées terminent au-dessus de la projection déterministe de 14 887,03 €, mais ce constat constitue uniquement une preuve empirique de soutien. Il ne permet pas de calibrer une probabilité de réussite, de garantir 7 %, ni d’assimiler IWDA à WPEA avant son lancement.

Le protocole détaillé est défini dans `docs/methodology/DCA_EMPIRICAL_VALIDATION_V1.md`.

---

## 6. Sensibilité et stabilité

La stabilité entre graines et la sensibilité aux hypothèses doivent être analysées séparément.

Une analyse un facteur à la fois ne mesure pas les interactions entre hypothèses et cette limite doit être indiquée.

Aucune dispersion ne doit être qualifiée de bonne, mauvaise, faible ou élevée sans calibration empirique documentée.

---

## 7. Niveau de confiance

Le niveau de confiance mesure la robustesse statistique ou méthodologique d’un résultat.

Il doit notamment considérer :

- la taille d’échantillon ;
- la couverture des graines ;
- la couverture des métriques ;
- la stabilité entre graines ;
- la stabilité entre campagnes ;
- la sensibilité aux hypothèses ;
- la reproductibilité ;
- la fraîcheur des données ;
- la validation hors échantillon.

Avant toute classification, chaque critère doit disposer :

- d’une méthode ;
- d’une observation ;
- d’une règle d’acceptation ;
- d’une référence de calibration ;
- d’un statut explicite ;
- de limites.

Sans calibration documentée, aucun niveau de confiance ne doit être affiché.

### 7.1 Registre versionné des calibrations

Chaque résultat de calibration doit être conservé dans un registre immuable et versionné.

Un enregistrement doit contenir au minimum :

- un identifiant unique ;
- l’identifiant et la version du protocole ;
- la version du moteur ;
- la conclusion ciblée ;
- les campagnes de calibration ;
- les campagnes de validation hors échantillon ;
- les empreintes des jeux de données et des résultats ;
- le résultat de chaque critère ;
- la référence de calibration ;
- la justification de la décision ;
- les limites ;
- le statut `prepared`, `validated`, `rejected` ou `obsolete` ;
- l’identifiant de l’enregistrement remplacé, le cas échéant.

Une calibration validée exige que tous les critères enregistrés soient satisfaits et validés hors échantillon.

Une calibration existante ne doit jamais être écrasée silencieusement. Une évolution produit un nouvel enregistrement qui référence explicitement la version remplacée. Deux résultats divergents ne peuvent pas partager le même identifiant ou la même empreinte de résultat.

Le registre conserve la traçabilité ; il ne transforme pas une calibration en score de confiance et ne garantit pas la généralisation hors des campagnes documentées.

---

## 8. Niveau de preuve

Le niveau de preuve est distinct du niveau de confiance.

Il mesure la qualité et la diversité des éléments soutenant une conclusion, notamment :

- simulations indépendantes ;
- données historiques ;
- résultats reproduits ;
- cohérence entre campagnes ;
- validation hors échantillon ;
- sources externes fiables ;
- contradictions identifiées ;
- limites connues.

Un résultat peut être statistiquement stable tout en reposant sur un niveau de preuve insuffisant.

---

## 9. IGL — Indice Global LEYNOR

L’IGL est une fonctionnalité future.

Aucun IGL ne doit être calculé ou affiché tant que ses composantes et pondérations ne sont pas validées empiriquement.

Chaque composante devra disposer de :

- une définition ;
- une formule ;
- des bornes ;
- une justification ;
- des tests ;
- une calibration ;
- un niveau de confiance ;
- un niveau de preuve ;
- des limites ;
- un historique de versions.

Toute modification d’une composante ou d’une pondération devra produire une nouvelle version de l’IGL et conserver les versions antérieures.

---

## 10. Rapports Premium

Chaque rapport Premium doit expliquer :

- les questions auxquelles il permet de répondre ;
- les hypothèses utilisées ;
- la méthode ;
- les données et simulations ;
- les résultats ;
- les distributions et percentiles ;
- les risques ;
- les facteurs favorables et contradictoires ;
- les limites ;
- la confiance et la preuve lorsqu’elles sont réellement disponibles.

Chaque grande section doit inclure, lorsque pertinent, un encadré :

**Décisions que ce rapport ne permet pas de prendre**

Le rapport doit rappeler qu’il ne prédit pas les marchés, ne garantit aucun rendement et ne constitue pas une recommandation d’achat ou de vente.

---

## 11. Questions que le Laboratoire doit permettre d’explorer

Le Laboratoire LEYNOR doit progressivement permettre d’explorer notamment :

- la probabilité empirique d’atteindre un objectif selon plusieurs scénarios ;
- l’impact d’une interruption de versements ;
- l’impact d’une vente de panique ;
- l’effet de la poursuite des investissements pendant une baisse ;
- la capacité à absorber un retrait imprévu ;
- l’effet de l’épargne de précaution ;
- l’impact du nombre de lignes ;
- les bénéfices et limites de la diversification ;
- la sensibilité à une concentration sectorielle ;
- les facteurs qui influencent réellement les résultats ;
- la stabilité des conclusions entre graines et campagnes ;
- les conditions dans lesquelles une conclusion cesse d’être valable.

Chaque réponse doit rester conditionnelle aux hypothèses de la campagne.

---

## 12. Gouvernance des évolutions

Une pull request doit mettre à jour ce guide lorsqu’elle modifie l’un des éléments suivants :

- méthode de calcul ;
- hypothèse ;
- métrique ;
- seuil ;
- règle de validation ;
- source de données ;
- niveau de confiance ;
- niveau de preuve ;
- simulation ;
- rapport Premium ;
- IGL ;
- formulation d’une conclusion utilisateur.

La pull request doit indiquer explicitement :

- la décision utilisateur éclairée ;
- les éléments qui soutiennent le résultat ;
- les limites ;
- les fichiers du guide mis à jour ;
- ou la justification précise de l’absence d’impact méthodologique.

---

## 13. Historique méthodologique

Les changements méthodologiques significatifs doivent être consignés dans la section suivante.

### Version initiale

- formalisation des principes d’explicabilité, de reproductibilité et de séparation analyse/décision ;
- formalisation des exigences applicables aux simulations, à la confiance, à la preuve, aux rapports Premium et au futur IGL ;
- obligation de mise à jour du guide dans la même pull request que toute évolution méthodologique.

### Registre des calibrations

- ajout d’un registre immuable et versionné des résultats de calibration ;
- interdiction des écrasements silencieux et des empreintes divergentes ;
- validation conditionnée à des critères satisfaits et contrôlés hors échantillon ;
- conservation explicite des versions remplacées, des justifications et des limites.

### Validation historique préenregistrée

- obligation de sceller les paramètres d’une expérience historique avant lecture des résultats de validation ;
- traçabilité du commit moteur, des politiques de coûts et de rééquilibrage, de la campagne, des graines et du snapshot simulé ;
- changement d’empreinte obligatoire en cas d’évolution méthodologique ;
- toute modification postérieure aux résultats constitue une nouvelle expérience.

### Proxies historiques

- interdiction de prolonger silencieusement l’histoire d’un instrument avant sa date d’existence ;
- proxy ancré sur une référence officielle et choisi avant lecture des résultats ;
- conservation obligatoire des différences entre indice proxy et fonds réel ;
- toute substitution postérieure aux résultats constitue une nouvelle expérience.

### Métriques historiques ajustées des flux

- séparation obligatoire entre performance et apports/retraits externes ;
- rendement cumulé fondé sur un chaînage géométrique ajusté des flux ;
- annualisation calendaire versionnée sur 365.2425 jours ;
- volatilité quotidienne annualisée avec estimateur échantillonnal et facteur 252 ;
- drawdown et récupération calculés sur un indice de richesse ajusté des flux ;
- conservation explicite des périodes non récupérées.

### Comparaison simulation / historique

- comparaison descriptive entre instantané simulé préenregistré et replay historique ;
- conservation des valeurs sources, écarts signés et erreurs relatives lorsqu’elles sont définies ;
- interdiction de tout verdict, score ou seuil arbitraire sans calibration et validation hors échantillon ;
- compatibilité économique des métriques obligatoire avant interprétation ;
- distinction explicite entre instrument réel et proxy.

### Sensibilité historique aux coûts

- définition explicite des instruments auxquels les coûts sont appliqués ;
- possibilité d’exempter une poche de liquidités technique telle que `CASH` ;
- préenregistrement des niveaux de coûts ;
- fenêtres glissantes reconnues comme dépendantes lorsqu’elles se chevauchent ;
- conservation de la sensibilité des résultats sans produire de verdict scientifique prématuré.

### Diagnostic descriptif de couverture historique

- positionnement reproductible des observations historiques dans les bandes préexistantes de la simulation ;
- interdiction de transformer ces bandes en score ou verdict ;
- conservation obligatoire des observations extrêmes ;
- interdiction d’interpréter des fenêtres chevauchantes comme fréquences de couverture calibrées.

### Appariement des horizons

- possibilité d'exprimer une durée de simulation en mois sans modifier l'API annuelle existante ;
- équivalence obligatoire entre 12 mois et 1 an à paramètres et graine identiques ;
- interdiction de confronter directement des observations historiques à une distribution simulée d'un horizon différent ;
- conservation des dépassements de p95 comme preuves adverses descriptives sans recalibration rétroactive.

### Validation historique sous licence

- distinction explicite entre identité officielle d’un benchmark et droit d’usage de sa série ;
- licence ou contrat traçable obligatoire avant promotion au statut scientifique ;
- devise EUR obligatoire pour la piste `beginner` sauf conversion préenregistrée ;
- refus des fallbacks silencieux vers une source de développement ;
- cinq fenêtres non chevauchantes figées avant lecture des données licenciées ;
- résultats Yahoo existants maintenus au statut exploratoire.

### Validation empirique par proxy ETF

- proxy IWDA.AS préenregistré pour prolonger la composante World avant l’existence de WPEA ;
- PAEJ conservé comme instrument réel sur les fenêtres compatibles ;
- niveau de preuve séparé `supporting-empirical-evidence` ;
- interdiction d’assimiler cette piste à une validation MSCI officielle ;
- conservation obligatoire des preuves adverses, notamment tout dépassement de p95, sans recalibration rétroactive.

### Appariement de fréquence du drawdown

- obligation d’apparier la fréquence d’observation des métriques path-dependent avant confrontation ;
- conservation séparée du drawdown quotidien comme information de risque haute fréquence ;
- interdiction de comparer directement un drawdown quotidien à des percentiles simulés mensuels ;
- reclassement des anciennes preuves issues d’une fréquence non appariée en `non-comparable-frequency`, sans suppression de leur trace ;
- diagnostic 2020 : 21,68 % en quotidien contre 11,51 % en mensuel, supprimant le dépassement du p95 mensuel sans recalibrer le moteur.

### Diagnostic de risque modèle

- rejet diagnostique de la normalité mensuelle conservé comme limite du modèle ;
- Student-t : victoire sur un fold sur trois seulement et score de validation agrégé inférieur à l’hypothèse gaussienne ;
- EWMA : deux folds gagnés sur trois mais score agrégé inférieur à la volatilité constante ;
- décision explicite de ne pas modifier le moteur `beginner` faute de gain suffisamment robuste ;
- toute alternative future doit démontrer une amélioration reproductible puis passer un test hors échantillon distinct.

### Validation empirique DCA

- validation séparée du calculateur DCA, sans inclure silencieusement le cash résiduel du preset portefeuille ;
- trois fenêtres de cinq ans préenregistrées avec `IWDA.AS` comme proxy Monde ;
- projection déterministe de 14 887,03 € dépassée sur les trois fenêtres testées ;
- résultat conservé comme preuve empirique de soutien, sans probabilité calibrée ni garantie de rendement.

### Diagnostic scientifique exhaustif des drawdowns v2

- description obligatoire des rendements quotidiens et mensuels : moyenne, médiane, variance, volatilité, skewness, kurtosis et quantiles de 0,1 % à 99,9 % ;
- conservation de tous les épisodes de drawdown, y compris non récupérés, avec profondeur, durée et récupération ;
- séparation obligatoire entre métriques quotidiennes et mensuelles ;
- corrélations globale, conditionnelles aux marchés haussier et baissier, et roulantes ;
- autocorrélation des rendements absolus et carrés, plus volatilité descriptive par régime ;
- comparaison des fréquences extrêmes à la normale, sans promotion automatique d’une loi alternative ;
- contradiction obligatoire entre preuve descriptive et performance prédictive hors estimation ;
- aucune modification du moteur lorsque Student-t ou EWMA ne démontre pas un gain agrégé reproductible.

### Généralisation confirmatoire multi-portefeuilles v1

- cohorte figée avant exécution : défensif, beginner, dynamique et 100 % Monde ;
- trois folds temporels communs et sélection des paramètres exclusivement dans l’entraînement ;
- règle préenregistrée : amélioration agrégée et au moins 75 % des cellules gagnées ;
- Student-t : 4 cellules gagnées sur 12, score agrégé dégradé ;
- EWMA : 6 cellules gagnées sur 12, score agrégé dégradé ;
- quatre drawdowns mensuels au-dessus de la médiane mais sous le p95 apparié ;
- aucun prototype alternatif ni changement du moteur autorisé.

### Calibration probabiliste proxy v1

- 84 prévisions rétrospectives point-in-time à horizon douze mois ;
- couverture 50 % observée : 46,43 %, Wilson 95 % [36,15 % ; 57,02 %] ;
- couverture 90 % observée : 86,90 %, Wilson 95 % [78,05 % ; 92,53 %] ;
- Brier score 0,1966 contre 0,2500 pour la référence fixe 50 % ;
- Brier score 0,1966 contre 0,1894 pour la référence dynamique point-in-time : preuve défavorable agrégée ;
- défaite contre la référence dynamique pour trois portefeuilles sur quatre ;
- surconfiance adverse conservée dans la tranche annoncée 80–90 % ;
- effectif indépendant volontairement non déclaré en raison des fenêtres et actifs partagés ;
- intervalles de Wilson conservés comme descriptifs mais non inférentiels sous dépendance ;
- empreinte obligatoire des entrées de source en direct, avec limite explicite lorsqu’aucun instantané reconstructible n’est archivé ;
- exposition de probabilités réelles interdite tant que données exactes, holdout vierge et validation prospective manquent.

### Validation prospective probabiliste v1

- protocole, hypothèse, moteur, cohorte, horizon et règle de décision versionnés avant toute première prévision ;
- calendrier trimestriel interprété dans le fuseau `Europe/Paris`, avec horodatage UTC exact au scellement ;
- `asOf`, `sealedAt`, `maturesAt`, benchmark point-in-time, graine et empreintes des sources obligatoires ; aucun résultat ne peut être présent dans un objet de prévision ;
- première vague de huit origines considérée comme calendrier de collecte, jamais comme huit observations indépendantes ;
- effectif indépendant maintenu à `null` tant que le chevauchement temporel et les actifs partagés ne sont pas traités par un protocole séparé ;
- données exactes/licenciées et holdout prospectif obligatoires ; aucun fallback vers Yahoo ;
- Brier strictement meilleur que le benchmark dynamique, couverture compatible et au moins 100 prévisions effectivement indépendantes avant toute conclusion favorable ;
- statut initial `blocked-before-first-forecast` : aucune prévision fabriquée tant que les séries éligibles manquent.

### Falsification historique accélérée des probabilités v1

- horizon de douze mois et moteur inchangé afin de tester la même revendication que la campagne prospective ;
- fenêtres historiques dérivées des métadonnées uniquement, de la plus ancienne à la plus récente et sans chevauchement temporel ;
- registre obligatoire des périodes déjà inspectées, qu'une nouvelle source ne peut pas rendre vierges rétroactivement ;
- Brier apparié au benchmark dynamique comme critère primaire ;
- méthode d'incertitude tenant compte de la dépendance à verrouiller avant exécution ;
- rejet possible uniquement si l'intervalle à 95 % de `Brier moteur − Brier benchmark` est entièrement supérieur à zéro après audit admissible ;
- victoire historique limitée au statut `retrospective-support-only` ;
- aucune autorité de validation positive et aucune exposition d'une probabilité réelle ;
- statut initial bloqué : zéro fenêtre, audit de dépendance non verrouillé et zéro résultat tant que les métadonnées exactes/licenciées manquent.
