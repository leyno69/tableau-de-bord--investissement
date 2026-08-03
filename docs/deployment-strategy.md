# Stratégie de déploiement

## Décision

LEYNOR AI utilise Railway comme plateforme unique de production.

Le frontend statique et le serveur Node.js sont livrés ensemble depuis le même commit et la même image Docker. Vercel et Netlify restent éventuellement connectés comme solutions de secours, mais ne sont requis ni par le dépôt, ni par les tests, ni par les règles de fusion.

## Pull requests

Les pull requests exécutent uniquement les contrôles GitHub Actions :

- tests Node.js ;
- tests métier ;
- validation syntaxique ;
- smoke test Docker ;
- contrôles de sécurité et de non-régression.

Aucun déploiement externe de preview n'est requis pour fusionner une pull request. Une preview visuelle peut être déclenchée ponctuellement lorsque cela apporte une valeur réelle.

## Production Railway

- branche de production : `main` ;
- construction : `Dockerfile` ;
- configuration : `railway.json` ;
- contrôle de disponibilité : `/ready` ;
- redémarrage automatique en cas d'échec ;
- frontend et API issus du même commit.

Railway doit être configuré pour suivre uniquement `main`. Les branches de pull request ne doivent pas déclencher de déploiement automatique.

## Vercel et Netlify

Les deux services peuvent rester connectés comme solutions de secours. Leurs statuts, quotas, previews et déploiements ne font pas partie des critères de fusion ou de publication de LEYNOR AI.

Ils peuvent être déconnectés ultérieurement sans modifier l'architecture de production.

## Règle de fusion

Une pull request peut être fusionnée lorsque les contrôles GitHub Actions requis sont au vert. Aucun contrôle Vercel, Netlify ou Railway de preview n'est obligatoire avant fusion.

Après fusion dans `main`, le déploiement Railway de production doit réussir et répondre sur `/ready` avant de considérer la nouvelle version comme publiée.

## Maîtrise des coûts

Le tableau de bord Railway doit définir :

- une alerte budgétaire ;
- une limite dure de dépenses ;
- un seul service de production actif pour l'application complète ;
- aucun environnement de preview automatique par pull request.
