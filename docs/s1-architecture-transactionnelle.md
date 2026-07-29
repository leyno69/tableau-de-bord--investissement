# S1 — Architecture transactionnelle

## Statut et portée

Ce document fixe les invariants d'architecture à valider à la fin de S1. Il décrit le modèle transactionnel cible et les frontières entre ingestion, domaine financier, données de marché, projections et interprétation. Il ne prescrit ni framework ni implémentation et n'introduit aucun module exécutable.

Les décisions ci-dessous sont normatives. Les éléments encore à arbitrer sont regroupés en fin de document ; ils ne doivent pas conduire à contourner les invariants déjà actés.

## Principes directeurs

### 1. Transactions et lots comme source de vérité

Les transactions brutes importées ou saisies et leurs lots d'origine sont conservés de façon immuable et constituent la source de vérité. Une correction ne réécrit pas silencieusement une opération : elle est tracée, versionnée ou compensée selon le mécanisme qui sera retenu.

Les positions, prix de revient, plus-values et performances sont des **projections reproductibles** de cette source. Le domaine n'est pas enfermé dans une méthode unique de calcul du coût. Il doit pouvoir produire plusieurs projections — notamment coût moyen pondéré (CMP), FIFO et, si nécessaire, d'autres méthodes — en identifiant explicitement la méthode et la version des règles utilisées. Une projection n'altère jamais les transactions ni les lots sources.

### 2. Calcul décimal et arrondis centralisés

Les montants, quantités, prix, taux de change et résultats financiers reposent sur une représentation décimale précise. Le cœur financier ne dépend jamais implicitement de la sémantique binaire de `Number` en JavaScript.

Les règles d'arrondi sont centralisées et explicites par contexte : devise, quantité d'instrument, frais, fiscalité, conversion FX et présentation. Les calculs intermédiaires conservent la précision nécessaire ; l'arrondi d'affichage ne modifie pas les valeurs comptables. Toute projection doit être reproductible avec la même politique d'arrondi et sa version.

### 3. Identité stable et instrument générique

Chaque instrument possède un identifiant interne stable, indépendant des fournisseurs et des changements de symbole. Un ticker seul n'est jamais une identité suffisante.

Le référentiel d'instruments prévoit au minimum :

- le type d'actif ;
- l'ISIN lorsqu'il existe ;
- la place de cotation ;
- la devise de cotation ;
- les symboles et identifiants propres à chaque fournisseur, avec leur période de validité.

Le modèle est générique : il couvre dès sa conception les actions, ETF, obligations, fonds, cash et instruments monétaires. Il permet l'ajout ultérieur de nouvelles classes d'actifs sans modifier les invariants communs ni détourner un type existant.

### 4. Absence de position négative par défaut

Une opération qui provoquerait une position négative ou une survente est refusée par défaut dans une projection de portefeuille long. Le rejet doit être explicite et traçable ; le moteur ne doit ni créer un lot négatif implicite ni corriger automatiquement la quantité.

Une éventuelle gestion de la vente à découvert relève d'une capacité ou d'un module distinct, avec ses propres transactions, risques, garanties, frais et règles de valorisation. Elle ne sera pas obtenue en assouplissant cet invariant.

### 5. Décomposition des composantes monétaires

Une opération conserve séparément :

- le prix d'exécution et la quantité exécutée ;
- les frais de courtage ;
- les taxes ;
- les coûts de change (FX) ;
- les autres frais, catégorisés et documentés.

Les montants agrégés peuvent être calculés pour l'affichage ou les projections, mais ne remplacent jamais ces composantes sources. Chaque composante conserve sa devise, son signe et sa précision disponibles. Une conversion de devise est un calcul traçable fondé sur un taux et une source identifiés, et non une mutation du montant d'origine.

### 6. Fidélité temporelle

La précision temporelle reçue est préservée exactement : instant horodaté avec fuseau ou décalage lorsqu'il est fourni, date seule, ou information partielle. Le système n'invente jamais une heure, un fuseau, un jour ou une date manquante.

Les traitements qui exigent une granularité absente doivent signaler l'indétermination ou appliquer une convention explicitement choisie au niveau de la projection, sans enrichir artificiellement la donnée source. L'ordre de deux événements impossibles à départager avec les données disponibles reste indéterminé ; il ne doit pas être présenté comme un ordre historique certain.

### 7. Séparation RÉEL / SIMULATION

Toute transaction, tout portefeuille et toute projection porte un contexte explicite `RÉEL` ou `SIMULATION`. Les deux contextes sont strictement séparés dans le stockage logique, les agrégations, les performances et les statistiques. Aucun indicateur réel ne peut inclure une donnée simulée, même temporairement ou par défaut implicite.

Une comparaison entre réel et simulation est une vue dédiée qui conserve les deux séries distinctes. Le passage d'une simulation au réel crée ou importe des transactions réelles ; il ne change pas simplement l'étiquette des données simulées.

### 8. XIRR comme métrique dérivée

Le XIRR est une métrique dérivée de flux datés sélectionnés. Il n'est jamais stocké ni importé comme donnée source faisant autorité. Sa valeur doit être recalculable en précisant le périmètre, la devise, la convention de flux, la date de valorisation, les données de marché utilisées et la version de l'algorithme. Une valeur fournie par un courtier peut être conservée comme information externe à comparer, jamais comme résultat comptable de référence.

## Frontières de l'architecture

### Connecteurs et adaptateurs de courtiers

Le domaine transactionnel ne dépend jamais de Trade Republic, Revolut ni d'aucun autre courtier. Chaque entrée — fichier CSV, saisie manuelle, API directe ou agrégateur — passe par un connecteur ou un adaptateur qui produit le même schéma canonique.

L'adaptateur conserve la provenance, l'identifiant externe, le lot d'import, la donnée brute nécessaire à l'audit et les avertissements de normalisation. Il traduit les formats et vocabulaires du fournisseur, mais n'implémente pas les règles de position, de coût ou de performance. Le schéma canonique est validé à la frontière avant son utilisation par le domaine.

### Données de courtier et données de marché

Les données de courtier décrivent les opérations effectivement exécutées et leurs frais. Les cotations, cours historiques, taux de change de référence et autres séries destinées à la valorisation ou à l'analyse proviennent d'une couche de données de marché indépendante.

Cette séparation interdit de traiter une cotation indicative comme une exécution ou de laisser un format de courtier définir le modèle de marché. Chaque donnée conserve sa provenance et son horodatage. Une projection qui combine opérations et marché référence le jeu de données de marché et la politique de sélection employés afin de rester explicable et reproductible.

### Moteur financier, couche data et couche IA

Les responsabilités sont séparées :

- la **couche data** acquiert, normalise, qualifie et fournit les données de courtier, de référence et de marché ;
- le **moteur financier** applique les invariants et calcule positions, coûts, flux, performances et statistiques ;
- la **couche IA** interprète, explique ou assiste l'utilisateur à partir des résultats et de leur provenance.

La couche IA n'est jamais la source d'un calcul comptable ou financier, ne fabrique pas une donnée manquante et ne modifie pas la source de vérité. Toute explication produite par IA reste distinguable des résultats déterministes du moteur.

## Schéma canonique conceptuel minimal

Sans figer l'implémentation, le modèle doit rendre représentables les concepts suivants :

- **Lot d'ingestion** : identifiant interne, canal, fournisseur éventuel, provenance, empreinte, instant ou date de réception et statut de validation ;
- **Transaction brute** : identifiant interne stable, identifiant externe éventuel, contenu source conservé, lien vers le lot, contexte réel/simulation et précision temporelle d'origine ;
- **Opération canonique** : nature, instrument interne, quantité, prix d'exécution, devise, composantes de frais séparées, temporalité fidèle et provenance ;
- **Instrument** : identifiant interne, classe d'actif, attributs de référence et mappings fournisseurs historisés ;
- **Donnée de marché** : instrument, type de donnée, valeur décimale, devise, temporalité, fournisseur et qualité ;
- **Projection** : périmètre, contexte réel/simulation, méthode de coût, règles d'arrondi, données de marché, versions de calcul et résultat ;
- **Métrique dérivée** : projection source, paramètres, algorithme versionné et résultat, notamment pour le XIRR.

Le stockage physique peut séparer davantage ces concepts. Il ne doit toutefois ni supprimer leur provenance ni confondre donnée brute, donnée canonique et résultat dérivé.

## Flux de référence

1. Un connecteur reçoit une donnée de courtier ou une saisie et crée un lot d'ingestion auditable.
2. Un adaptateur transforme chaque enregistrement vers le schéma canonique sans compléter les informations absentes par supposition.
3. La validation résout l'instrument via son identifiant interne et ses mappings ; les cas ambigus sont mis en attente plutôt qu'associés sur le seul ticker.
4. Le domaine accepte ou refuse l'opération selon ses invariants, notamment l'interdiction de survente dans le portefeuille long.
5. Le moteur génère à la demande une projection identifiée (CMP, FIFO ou autre), dans le contexte réel ou simulation demandé.
6. La couche marché fournit séparément les données nécessaires aux valorisations et analyses.
7. Les métriques, dont le XIRR, sont calculées depuis les flux et projections sélectionnés.
8. La couche IA peut expliquer ces résultats sans les remplacer ni les rendre sources de vérité.

## Ambiguïtés levées

- **Méthode de coût** : aucune méthode unique n'est imposée au stockage ; CMP, FIFO et d'autres projections coexistent au-dessus des mêmes sources.
- **Arithmétique** : les calculs financiers utilisent des décimaux précis et une politique d'arrondi centralisée, jamais des `Number` implicites.
- **Identité d'un titre** : elle repose sur un identifiant interne ; ticker, ISIN et symboles fournisseurs sont des attributs ou mappings, pas l'identité.
- **Survente** : elle est rejetée par défaut ; le short n'est pas un cas caché du portefeuille long.
- **Frais** : courtage, taxes, FX et autres frais ne sont pas fusionnés avec le prix d'exécution.
- **Temps incomplet** : sa précision est conservée ; aucune valeur temporelle n'est inventée.
- **Réel et simulation** : leurs transactions, performances et statistiques ne sont jamais mélangées.
- **XIRR** : il est recalculable et dérivé, non une donnée source.
- **Dépendance courtier** : tous les canaux convergent vers le même schéma canonique via des adaptateurs.
- **Source des cours** : les courtiers fournissent les exécutions ; une couche marché indépendante fournit les données analytiques.
- **Classes d'actifs** : le modèle d'instrument est générique et extensible.
- **IA** : elle interprète les sorties ; seuls les calculs déterministes du moteur font foi.

## Décisions restant à prendre

Les choix suivants restent ouverts pour la conception détaillée. Ils ne sont **pas bloquants pour valider les invariants de S1**, mais devront être tranchés avant l'implémentation de la capacité concernée :

1. La bibliothèque ou le format décimal concret, les échelles maximales et la matrice exacte des arrondis par devise, actif et contexte fiscal.
2. Le mécanisme de correction des sources (événement compensatoire, version, annulation/remplacement) et la durée de conservation des payloads bruts.
3. La taxonomie exhaustive des opérations, frais et classes d'actifs, ainsi que les attributs spécialisés des obligations, fonds et instruments monétaires.
4. Les règles déterministes de départage lorsque plusieurs opérations ont la même précision temporelle, en distinguant ordre technique de traitement et chronologie économique certaine.
5. La gouvernance du référentiel d'instruments : source prioritaire, résolution des doublons, changements d'ISIN ou de place et validation manuelle des correspondances ambiguës.
6. Le périmètre exact de chaque projection de coût et de performance : traitement des frais, taxes, revenus, opérations sur titres, transferts, devises et conventions calendaires.
7. La politique de données de marché : fournisseurs, hiérarchie, qualité, corrections, calendriers, cours de clôture et taux FX de référence.
8. Le contrat précis d'isolation entre réel et simulation (stockage physique, contrôle d'accès et mécanismes de promotion/rejeu).
9. Les conventions du XIRR : flux inclus, devise de calcul, conversion FX, valeur terminale, gestion des solutions multiples ou de l'absence de convergence.
10. Le périmètre et les garde-fous d'une future capacité short, explicitement hors du portefeuille long de S1.

À ce stade, aucune décision réellement bloquante ne subsiste pour valider l'architecture transactionnelle de S1. Le démarrage de l'implémentation financière restera toutefois conditionné à l'arbitrage des points 1, 2, 4 et 6, car ils affectent directement la reproductibilité et l'audit des calculs.
