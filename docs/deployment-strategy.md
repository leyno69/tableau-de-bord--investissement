# Stratégie de déploiement

## Décision

LEYNOR AI utilise Netlify comme plateforme unique de déploiement pour les aperçus de pull request et la production.

Vercel n'est plus requis par le dépôt, les tests, la CI ni la mise en production.

## Netlify

- Deploy Previews pour chaque pull request.
- Déploiement de production depuis `main`.
- Contrôle de déploiement obligatoire avant fusion.
- Source de vérité pour vérifier l'interface mobile et les changements fonctionnels.

## Vercel

Le fichier `vercel.json` a été supprimé du dépôt.

Pour arrêter complètement les checks et les consommations de quota, le projet Vercel relié à ce dépôt doit être déconnecté ou supprimé depuis le tableau de bord Vercel. Cette opération est un réglage externe au dépôt et ne peut pas être imposée par un commit GitHub.

Après déconnexion, vérifier que le contexte de statut `Vercel` n'est plus requis dans les règles de protection de `main`.

## Règle de fusion

Une pull request peut être fusionnée lorsque la CI, les tests métier et Netlify sont au vert. Aucun contrôle Vercel ne fait partie des critères de fusion.
