# Politique des validations GitHub Actions

Les pull requests conservent deux contrôles obligatoires :

- `Domain tests` exécute la suite complète sous Node.js 20 ;
- `CI` exécute la suite complète sous Node.js 22 et le smoke test Docker de production.

Chaque workflow annule automatiquement les exécutions plus anciennes de la même branche. Cette règle évite que des validations devenues obsolètes restent dans la file et consomment inutilement des runners.

Les deux versions de Node.js restent couvertes et aucun test métier n’est supprimé.
