# Stratégie de déploiement

## Décision

LEYNOR AI sépare désormais le frontend statique de l’API.

- Vercel publie le frontend généré dans `dist/` et fournit le proxy sécurisé `/api/leynor/*`.
- Railway conserve le serveur Node.js, les données persistantes, les traitements métier et les fournisseurs externes.
- Les deux services sont construits depuis la branche de production `main`.

Cette séparation supprime la liste manuelle de fichiers statiques du chemin critique de production : un nouveau module navigateur est copié automatiquement par `npm run build` lorsqu’il appartient aux ressources frontend du dépôt.

## Données et sécurité

Le changement d’hébergement du frontend ne modifie ni le moteur LEYNOR, ni les dépôts persistants Railway, ni les simulations.

Le proxy Vercel utilise les variables suivantes :

- `LEYNOR_BACKEND_URL` : URL HTTPS publique du backend Railway ;
- `LEYNOR_BACKEND_TOKEN` : valeur de `APP_AUTH_TOKEN` configurée sur Railway.

Le jeton reste côté serveur dans la fonction Vercel et n’est pas exposé au navigateur.

Les données uniquement présentes dans `localStorage` ou `IndexedDB` restent attachées à leur domaine d’origine. L’ancien frontend Railway doit donc rester accessible pendant la validation et une éventuelle migration des données locales.

## Production

### Frontend Vercel

- branche : `main` ;
- commande de construction : `npm run build` ;
- dossier publié : `dist` ;
- proxy API : `/api/leynor/*` ;
- cache désactivé pour éviter qu’un ancien shell PWA masque un déploiement récent.

### Backend Railway

- branche : `main` ;
- construction : `Dockerfile` ;
- configuration : `railway.json` ;
- contrôle de disponibilité : `/ready` ;
- redémarrage automatique en cas d’échec.

Railway ne doit pas être supprimé : il reste la source de vérité pour les données et l’API.

## Pull requests et fusion

Les contrôles GitHub Actions requis doivent être au vert avant fusion. Les previews Vercel peuvent aider à valider l’interface, mais ne remplacent pas les tests.

Après fusion, la publication est considérée comme valide lorsque :

1. Railway répond sur `/ready` ;
2. Vercel sert `index.html` et les modules navigateur ;
3. `/api/leynor/health` répond via le proxy sécurisé ;
4. le portefeuille quitte l’état « Chargement… » sur un navigateur sans cache.

## Retour arrière

Le frontend Railway actuel reste temporairement disponible comme solution de repli. En cas d’échec du nouveau frontend, il suffit de réassigner le domaine public à la dernière version fonctionnelle sans toucher aux données Railway.
