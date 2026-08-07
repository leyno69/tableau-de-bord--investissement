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