# État GitHub et Phase A

## Travaux vérifiés dans la conversation

### PR #145 — Assistant d’import mobile

Fusionnée dans `main`. Commit cité : `3380d185`.

Contenu : assistant en 5 étapes, navigation Précédent/Continuer, fermeture accessible, pied fixe, hauteur Safari iOS, safe areas, validation des étapes et responsive mobile.

### PR #146 — Prononciation et voix

Fusionnée dans `main`. Commit cité : `ea3761fc`.

Contenu : prononciation proche de « Lainor, A, I », orthographe visible LEYNOR AI conservée, choix homme/femme strict, préférence persistée et message si aucune voix compatible n’existe.

### PR #147 — Radar thématique

Fusionnée dans `main`. Commit : `4e9dd9f5b7ea20b01f2edaa853427fd40a7e1c13`.

Contenu : séparation thème/actif, fiche thématique, score de confiance du thème, niveau de preuve provisoire, facteurs favorables et contradictoires, risques, sources, limites, fraîcheur, entreprises et ETF représentatifs. Premiers thèmes : IA, data centers et réseaux, défense et aéronautique.

### PR #148 — OCR local pour PDF scannés

Branche : `sprint-a1/pdf-ocr-mobile`.

Dernier statut connu : ouverte, non fusionnée. PDF.js traite les PDF avec couche texte ; Tesseract.js sert de fallback OCR local pour les scans, en français et anglais, avec limite de 20 pages et nettoyage des ressources.

Un ancien test attendait `Mozilla PDF.js` au lieu de `Mozilla PDF.js + OCR local`. Correction effectuée dans le commit `7be7d090bc46ba03f29a3bac9878ee2959b7cf50`.

Derniers workflows connus :

- CI : run `30732315611`, encore en file d’attente au dernier contrôle ;
- Domain tests : run `30732315612`, encore en file d’attente au dernier contrôle.

Action prioritaire : revérifier leur conclusion. Fusionner #148 seulement si les deux sont au vert ; sinon lire les logs et corriger.

## Phase A

### A1 — Import mobile PDF/CSV/OCR

État : assistant mobile fusionné ; OCR à valider.

Tests appareils réels : PDF texte, PDF scanné, CSV, assistant 5 étapes, clavier ouvert, fichier volumineux, ancien iPhone, scan médiocre, import incomplet, fermeture et conservation des choix.

### A2 — Voix

Code principal fusionné, recette réelle restante : iPhone, Android, homme, femme, persistance, prononciation LEYNOR AI, réponse orale après question vocale et absence de voix compatible.

### A3 — Graphiques interactifs

À finaliser : synchronisation marché, correction des 404, actifs internationaux dont TSMC, suivi au doigt, curseur vertical, date/heure, valeur exacte, variation, chargement, erreurs propres et fluidité mobile.

### A4 — Radar intelligent

Base fusionnée. À ajouter : cybersécurité, robotique, semi-conducteurs, nucléaire, eau, cloud, santé, transition énergétique ; plusieurs entreprises et ETF ; explication du lien ; historique du score ; pondérations ; bouton « Pourquoi LEYNOR pense cela ? » ; parcours Macro → Thème → Entreprises → ETF → Fiche → Watchlist ; préparation de « Simuler ce thème ».

### A5 — Export PDF Premium

À auditer et finaliser : PDF portefeuille, simulations et Radar ; personnalisation ; graphiques ; téléchargement mobile ; noms de fichiers ; erreurs claires. Le bug historique est l’impossibilité d’exporter le PDF sur mobile. Déterminer si la cause vient du code, du navigateur ou de la version non déployée.

### A6 — Release Candidate

Effectuer une recette complète avant d’ouvrir le Laboratoire LEYNOR.
