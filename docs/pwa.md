# LEYNOR PWA

La couche PWA transforme l’interface web en application installable sans introduire de dépendance dans le domaine métier.

## Composants

- `manifest.webmanifest` décrit l’application, sa palette et ses icônes.
- `service-worker.js` met en cache le shell applicatif et fournit une navigation de secours.
- `pwa.js` gère l’enregistrement, le cycle de mise à jour et l’invite d’installation.
- `offline.html` explique clairement les fonctions indisponibles hors connexion.

## Règles

Les requêtes d’écriture et les appels API ne sont jamais mis en cache. Les documents de navigation utilisent une stratégie réseau prioritaire. Les ressources statiques utilisent une stratégie cache avec revalidation en arrière-plan.
