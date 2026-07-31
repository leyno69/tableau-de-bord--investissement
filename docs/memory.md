# Mémoire LEYNOR

La mémoire est un bounded context indépendant du fournisseur LLM, du courtier, du framework et du stockage concret.

## Responsabilités

- `UserMemory` conserve uniquement les catégories produit autorisées : objectifs, profil, risque, préférences, portefeuille, historique, ETF, actions, budget et courtier.
- `ConversationMemory` conserve un historique versionné et un résumé éventuel.
- `MemoryService` met à jour ces mémoires et construit un contexte borné pour les services applicatifs.
- Les ports de repository permettent des adaptateurs locaux, SQL, documentaires ou cloud interchangeables.

## Garanties

- objets immuables ;
- mises à jour explicites et versionnées ;
- aucune décision métier déléguée au LLM ;
- aucun stockage imposé ;
- historique transmis au modèle limité par l’application.

## Étapes suivantes

Ajouter des adaptateurs de persistance, une politique de consentement et rétention, puis injecter le contexte mémoire dans le pipeline LEYNOR et Voice.
