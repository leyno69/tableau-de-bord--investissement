# Falsification historique accélérée des probabilités — protocole v1

## Question

Peut-on obtenir une décision scientifique avant la maturité de la première prévision prospective à douze mois sans modifier la revendication étudiée ?

## Réponse méthodologique

Oui pour une falsification plus rapide ; non pour une validation prospective anticipée. Le test conserve l'horizon de douze mois et rejoue le moteur inchangé depuis des origines historiques. Raccourcir l'horizon à un, trois ou six mois constituerait une autre revendication et exigerait une campagne séparée.

## Autorité de décision

La campagne distingue trois résultats possibles :

- `probability-claim-rejected` : contre-preuve rétrospective admissible après audit d'indépendance ;
- `retrospective-support-only` : preuve favorable limitée, sans autorité de validation ;
- `inconclusive` : dépendance non résolue ou intervalle de comparaison traversant zéro.

Une campagne techniquement invalide reçoit `invalid-campaign`; elle n'apporte aucune preuve pour ou contre le moteur.

## Données et fenêtres

Les deux séries EUR exactes et licenciées sont obligatoires. Les manifestes doivent être examinés avant les valeurs de rendement afin de dériver déterministement les fenêtres communes :

1. retenir uniquement la couverture commune déclarée dans les métadonnées ;
2. parcourir les origines admissibles de la plus ancienne à la plus récente ;
3. construire des fenêtres de douze mois non chevauchantes ;
4. enregistrer tout chevauchement avec une période déjà inspectée ;
5. laisser `independentWindowCount` à `null` avant l'audit de dépendance.

Le fait d'acquérir une nouvelle source pour une ancienne période n'efface pas la connaissance préalable des événements de marché. Les fenêtres concernées restent identifiées `previously-inspected-period`.

## Score et falsification

Pour chaque origine, le moteur et le taux de base dynamique produisent une perte de Brier appariée. La quantité primaire est :

\[
\Delta_B = Brier_{moteur} - Brier_{benchmark}.
\]

Une valeur positive favorise le benchmark. Le rejet de la revendication probabiliste exige un intervalle à 95 % de \(\Delta_B\) entièrement supérieur à zéro, calculé par une méthode tenant compte de la dépendance et verrouillée avant l'exécution.

Une valeur entièrement inférieure à zéro ne valide pas le moteur : elle produit uniquement `retrospective-support-only`. La campagne prospective à douze mois reste nécessaire.

## Méthode de dépendance verrouillée

La spécification méthodologique est verrouillée le `2026-08-07T21:29:06Z`, sans accès aux valeurs de rendement :

- statistique : moyenne chronologique des différences de pertes de Brier appariées ;
- rééchantillonnage : bootstrap circulaire par blocs mobiles ;
- longueur primaire : `ceil(n^(1/5))`, où `n` est le nombre de fenêtres annuelles non chevauchantes ;
- analyse de sensibilité obligatoire : longueurs primaire − 1, primaire et primaire + 1, bornées entre 1 et `n` ;
- 50 000 réplications, graine déterministe `20260807` ;
- intervalle bilatéral à 95 % de type basic bootstrap pour chaque longueur ;
- intervalle décisionnel : enveloppe conservatrice, soit la plus petite borne basse et la plus grande borne haute ;
- ordre chronologique du registre obligatoire ;
- au moins douze fenêtres avant toute décision négative.

Le seuil de douze est un plancher opérationnel préenregistré : il garantit au moins quatre blocs à la longueur maximale prévue lorsque `n = 12`, mais ne démontre ni indépendance ni validité asymptotique. Le rapport conserve donc explicitement la limite `block-bootstrap-is-asymptotic-not-proof-of-independence`.

La méthode s'appuie sur l'extension du bootstrap aux séquences stationnaires de Künsch et sur les règles de longueur de bloc de Hall, Horowitz et Jing. Ces références justifient la famille de méthode, pas l'adéquation de données qui ne sont pas encore disponibles :

- Künsch, 1989, DOI [`10.1214/aos/1176347265`](https://doi.org/10.1214/aos/1176347265) ;
- Hall, Horowitz et Jing, 1995, DOI [`10.1093/biomet/82.3.561`](https://doi.org/10.1093/biomet/82.3.561).

Le verrou est en deux phases. La formule, la graine, les réplications et les règles de décision sont désormais figées. Après réception des seuls manifestes de couverture, elles seront liées à l'empreinte du registre de fenêtres avant lecture des niveaux ou rendements. Aucune longueur de bloc ne pourra ensuite être choisie selon le résultat le plus favorable.

## Interdictions

- aucune sélection de fenêtre après lecture des rendements ;
- aucun changement de benchmark après résultats ;
- aucune hypothèse iid implicite ;
- aucun fallback vers Yahoo ;
- aucun changement du moteur ;
- aucune transformation d'une victoire rétrospective en probabilité affichable.

## État au préenregistrement

Zéro fenêtre, zéro résultat et zéro règlement sont présents. Le lancement est bloqué par l'absence des deux séries licenciées et de leurs métadonnées de couverture.

La méthode de dépendance est verrouillée. Sa liaison à l'empreinte du registre reste impossible tant que les manifestes ne permettent pas de construire les fenêtres. Cette liaison devra précéder toute lecture des valeurs de rendement.
