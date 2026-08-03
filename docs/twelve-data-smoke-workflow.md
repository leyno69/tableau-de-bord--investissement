# Twelve Data — workflow de smoke import

Ce workflow vérifie la présence du secret `TWELVEDATA_API_KEY` sans afficher sa valeur, exécute un import borné à cinq lignes journalières et publie un rapport JSON non secret pendant sept jours.

## Déclenchement

- sur pull request : tests uniquement, sans secret ni appel réel ;
- après fusion dans `main` : tests puis import réel minimal ;
- manuellement : même import minimal via `workflow_dispatch`.

## Portée scientifique

Un succès prouve uniquement que le secret est utilisable, que l’API répond, que le schéma est normalisé et qu’une empreinte déterministe est produite. Il ne prouve ni disponibilité point-in-time, ni absence de survivorship bias, ni validation externe de l’IGL.

## Sécurité

La clé reste dans GitHub Actions Secrets. Elle n’est ni placée dans l’URL, ni écrite dans l’artefact, ni affichée dans les logs applicatifs. Le rapport contient uniquement le fournisseur, le symbole, le nombre de lignes, l’empreinte et les garde-fous scientifiques.
