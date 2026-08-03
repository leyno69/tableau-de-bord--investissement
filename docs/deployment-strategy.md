# Stratégie de déploiement

## Objectif

- Netlify fournit les aperçus de pull request.
- Vercel ne construit que la branche de production `main`.

## Vercel

Le fichier `vercel.json` applique deux barrières :

1. `git.deploymentEnabled` désactive les déploiements Git sur toutes les branches sauf `main`.
2. `ignoreCommand` annule tout build dont `VERCEL_ENV` n’est pas `production`.

Configuration attendue dans le tableau de bord Vercel :

1. Production Branch : `main`.
2. Settings > Build and Deployment > Ignored Build Step : `Only build production`, ou laisser le dépôt imposer `ignoreCommand`.
3. Vérifier qu’un seul projet Vercel est connecté à ce dépôt.
4. Ne pas utiliser Vercel comme contrôle obligatoire des pull requests.

## Netlify

Netlify reste le fournisseur de Deploy Previews pour les pull requests et le contrôle de déploiement obligatoire avant fusion.

## Limite

Une requête de déploiement peut encore apparaître brièvement dans GitHub avant que Vercel ne l’ignore. Elle ne doit pas lancer de compilation de preview ni consommer un build complet.
