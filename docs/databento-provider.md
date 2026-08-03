# LEYNOR AI — Profil fournisseur Databento

## Statut

Adaptateur technique prêt à recevoir une clé API Databento valide. Aucun appel réel, aucune donnée historique et aucune validation externe ne sont inclus dans cette PR.

## Source officielle vérifiée

- API historique HTTP : `https://hist.databento.com/v0/timeseries.get_range`
- authentification HTTP Basic, clé API utilisée comme nom d’utilisateur et mot de passe vide ;
- paramètres envoyés comme données de formulaire ;
- sorties OHLCV possibles aux fréquences seconde, minute, heure et jour ;
- conservation de `ts_event` comme date observée et de `ts_recv` comme date de disponibilité lorsqu’elle existe.

## Contrat LEYNOR

L’adaptateur exige :

- `dataset` ;
- `symbol` ;
- `start` inclusif ;
- `end` exclusif ;
- un schéma OHLCV autorisé.

La clé n’est jamais stockée dans le dépôt. Elle doit être injectée par l’environnement d’exécution ou un gestionnaire de secrets.

## Limites

- les droits d’usage dépendent du contrat et des entitlements du jeu demandé ;
- le profil ne prouve pas que chaque dataset contient les sociétés radiées ;
- les opérations sur titres ne sont pas encore branchées ;
- les réponses réelles n’ont pas encore été testées faute de clé ;
- aucun résultat ne peut être qualifié de validation externe avant acquisition, empreinte, audit temporel et revue indépendante.

## Prochaine étape

Configurer une clé de test, interroger les métadonnées d’un dataset autorisé, enregistrer sa licence et son empreinte, puis exécuter un import historique limité avant toute campagne de validation.
