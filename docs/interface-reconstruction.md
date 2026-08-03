# Reconstruction contrôlée de l’interface LEYNOR AI

## Objectif

Rétablir d’abord un accueil utilisable sur mobile et desktop, sans revenir sur le moteur LEYNOR, les API, Railway, le Laboratoire, les travaux IGL ou les modules scientifiques. Les fonctions d’interface sont ensuite validées et réintroduites bloc par bloc.

## Références

- Dernier état utilisateur identifié comme fonctionnel : zone historique autour de la PR #143.
- Commit de comparaison utilisé : `182b6f92dc4b329b78bfc1c7b99c251a1d388618`.
- Symptôme bloquant observé ensuite : accueil rendu mais portefeuille bloqué sur « Chargement… », sélecteur de courtier vide et interactions tactiles indisponibles.
- PR #260 : correction de la boucle de mutations de `radar-freshness.js`.
- PR #261 : sécurisation du démarrage de l’accueil et création du présent registre.

## Éléments préservés

Les éléments suivants ne doivent pas être annulés pendant la reconstruction de l’interface :

- moteur LEYNOR ;
- API et connecteurs de données ;
- runtime Railway ;
- modules de simulation ;
- Laboratoire LEYNOR ;
- travaux IGL ;
- protocoles méthodologiques ;
- campagnes et résultats scientifiques ;
- protections de stockage et diagnostics de démarrage.

## Registre de réintégration

| Bloc | Fonctionnalités à conserver ou réintroduire | État | Validation exigée |
|---|---|---|---|
| Socle | Accueil chargé, portefeuille visible, navigation et boutons tactiles | En cours — PR #261 | iPhone, iPad, Android, desktop ; aucun écran bloqué sur « Chargement… » |
| A1 | Import CSV, PDF texte, PDF scanné par OCR local, assistant en cinq étapes, conservation courtier/fichier/analyse | À revalider | Import réel, fermeture de la modale, clavier iOS, safe areas, validation manuelle des lignes |
| A2 | Prononciation LEYNOR AI, voix masculine/féminine réellement appliquée, préférence persistante, réponse vocale automatique | À revalider | Safari iPhone, Chrome Android, changement de voix, absence de bascule silencieuse |
| A3 | Graphiques historiques réels, curseur tactile, tooltip, date/heure, valeur et variation | À réintégrer après stabilisation | Données réelles, aucune courbe fabriquée, geste tactile fluide, erreurs API propres |
| A4 | Radar thématique, séparation thème/actif, entreprises et ETF représentatifs, confiance et preuve | À réintégrer après A3 | Aucun faux actif, aucun score de thème copié sur un titre, sources et limites visibles |
| A5 | Export PDF Premium portefeuille, simulation et Radar | À réintégrer après A4 | Téléchargement réel sur mobile et desktop, rapport lisible et gestion d’erreur |
| A6 | Recette complète et Release Candidate | À faire après A1–A5 | Régression, responsive, performance, console, appareils réels |
| Vague 6 | Campagnes du Laboratoire puis construction empirique de l’IGL | Différée jusqu’à stabilité UI | Reproductibilité, graines, campagnes indépendantes, preuves documentées |

## Règle de progression

Pour chaque bloc :

1. audit du code et de l’historique ;
2. branche dédiée ;
3. modification minimale ;
4. tests automatisés ;
5. PR ;
6. CI au vert ;
7. fusion ;
8. vérification du déploiement ;
9. recette sur appareil réel ;
10. mise à jour de ce registre.

Une fonctionnalité n’est marquée « validée » qu’après un test réel sur les appareils concernés. Une CI verte ne constitue pas, à elle seule, une validation ergonomique mobile.

## Checklist du socle avant réintégration

- [ ] Le portefeuille quitte toujours l’état « Chargement… ».
- [ ] Le sélecteur de courtier contient des options.
- [ ] Le menu principal répond au toucher.
- [ ] Ajouter une position ouvre une fenêtre fermable.
- [ ] Ajouter un actif ouvre une fenêtre fermable.
- [ ] Actualiser ne bloque pas l’interface.
- [ ] L’assistant peut être ouvert et fermé.
- [ ] Aucun overlay invisible n’intercepte les touchers.
- [ ] Le service worker charge la dernière version du shell.
- [ ] Les erreurs de modules secondaires n’empêchent pas l’accès au portefeuille local.
