# Reprise avec checkout Git complet

Ce dépôt fournit un workflow `Export full Git bundle` qui produit un bundle Git complet contenant l'historique accessible au runner.

## Usage

1. Télécharger l'artefact `tableau-de-bord-investissement-full-git-bundle` depuis le run GitHub Actions.
2. Extraire `tableau-de-bord-investissement.bundle`.
3. Recréer un vrai dépôt Git local :

```bash
git clone tableau-de-bord-investissement.bundle tableau-de-bord--investissement
cd tableau-de-bord--investissement
git remote add origin https://github.com/leyno69/tableau-de-bord--investissement.git
```

Le clone obtenu possède l'historique Git du bundle et peut être audité normalement. L'accès d'écriture distant dépend ensuite des identifiants GitHub disponibles dans l'environnement de travail.

Ce mécanisme évite toute reconstruction partielle du projet à partir de diffs ou de fichiers isolés.
