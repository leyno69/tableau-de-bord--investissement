# Piste de validation historique sous licence — v1

## Décision méthodologique

Le benchmark officiel candidat pour prolonger WPEA avant son lancement reste le MSCI World Index, code officiel `990100`, variante de rendement net (`NETR`).

La documentation publique MSCI confirme l'identité du benchmark et publie des caractéristiques de performance, mais les conditions MSCI limitent l'utilisation des données sans accord spécifique. LEYNOR ne doit donc ni aspirer, ni versionner, ni redistribuer une série MSCI comme donnée de validation de production sans droit d'usage explicite.

## Verrou de licence

Une série de validation doit fournir un manifeste indiquant au minimum :

- fournisseur ;
- référence contractuelle ou de licence ;
- identifiant de série ;
- variante de rendement ;
- devise ;
- statut `validationEligible: true`.

Une série `development-only` est rejetée par le runner de validation stricte.

## Devise

La piste `beginner` est évaluée en EUR. Le proxy WPEA doit donc être fourni selon une convention EUR explicitement licenciée et documentée. Une série USD ne peut pas être utilisée silencieusement comme équivalent.

## Fenêtres préenregistrées

Le plan v1 fige avant lecture des données licenciées cinq fenêtres annuelles non chevauchantes : 2015, 2018, 2020, 2022 et 2023. Elles sont stratifiées par régime afin de confronter le moteur à des contextes différents.

Ces fenêtres sont distinctes mais ne sont pas qualifiées de tirages iid ni de preuve d'indépendance statistique.

## Exécution

Le runner `runLicensedBeginnerProxyValidation` :

- refuse les séries non admissibles ;
- conserve le proxy WPEA distinct de l'instrument réel ;
- utilise PAEJ et la poche de cash selon le plan figé ;
- applique le moteur de replay et les métriques historiques LEYNOR ;
- produit un résultat par fenêtre sans score ni verdict arbitraire.

## État actuel

Le protocole, l'import strict et les fenêtres sont prêts. L'exécution scientifique de ces fenêtres reste bloquée tant qu'aucune série licenciée admissible n'est fournie. Les replays Yahoo déjà produits restent explicitement exploratoires et ne sont pas promus rétroactivement.
