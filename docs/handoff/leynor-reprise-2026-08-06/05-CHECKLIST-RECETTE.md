# Checklist Release Candidate

## Accueil

- navigation ;
- responsive ;
- performances.

## Portefeuille

- ajout manuel ;
- import PDF texte ;
- import PDF scanné ;
- import CSV ;
- assistant 5 étapes ;
- suppression ;
- synchronisation marché ;
- fermeture des modales ;
- fonctionnement avec clavier mobile.

## Radar

- ouverture des thèmes ;
- entreprises proposées ;
- ETF proposés ;
- séparation thème/actif ;
- graphiques réels ;
- explication des scores ;
- sources, limites et fraîcheur.

## IA et voix

- réponse texte pertinente ;
- réponse vocale ;
- voix masculine ;
- voix féminine ;
- persistance ;
- prononciation LEYNOR AI ;
- message si voix compatible absente.

## Graphiques

- chargement ;
- données marché ;
- absence de 404 brute ;
- interaction tactile ;
- curseur vertical ;
- date/heure ;
- valeur ;
- variation ;
- message explicite si données indisponibles.

## Simulations

- création ;
- paramètres ;
- résultats ;
- graphiques ;
- export PDF ;
- absence de prédiction trompeuse.

## Export PDF

- portefeuille ;
- simulation ;
- Radar ;
- graphiques ;
- personnalisation ;
- téléchargement iPhone/iPad/Android/desktop ;
- nom du fichier ;
- message d’erreur.

## Appareils

- Safari iPhone ;
- iPad ;
- Chrome Android ;
- tablette Android ;
- desktop.

## Critères bloquants

- aucun écran cassé ;
- aucun bouton inactif ;
- aucun graphique vide sans explication ;
- aucune erreur brute d’API ;
- aucun texte de démonstration ;
- aucune fonction Premium incomplète exposée ;
- aucune fusion avec CI en échec.

## Méthode de reprise

1. Vérifier `main` et les PR ouvertes.
2. Contrôler la PR #148 et ses workflows.
3. Fusionner uniquement si CI et Domain tests sont au vert.
4. Vérifier le statut Vercel sans supposer.
5. Valider A1 et A2 sur appareils réels.
6. Ouvrir des branches séparées pour A3, A4 et A5.
7. Effectuer A6.
8. Ouvrir ensuite la Vague 6 Laboratoire.
9. Produire un rapport PDF exhaustif pour chaque grande campagne.
