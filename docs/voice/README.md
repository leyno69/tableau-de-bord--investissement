# Bounded context Voice

Le domaine Voice prépare l’offre Premium Voice de LEYNOR sans dépendre d’un navigateur, d’un framework, d’un courtier, d’un LLM ou d’un fournisseur audio.

## Modèle

- `VoiceSession` représente une conversation vocale et ses transitions immuables.
- `Transcript` normalise le texte, la langue et la confiance du Speech To Text.
- `VoiceCommand` déduit les intentions locales déterministes (`ask`, `stop`, `repeat`).
- `VoiceResponse` transporte le texte expliqué par LEYNOR, l’audio, les risques et la confiance.

## Ports

- `WakeWordProvider.detect()` détecte « Dis LEYNOR ».
- `SpeechToTextProvider.transcribe()` transforme un flux audio en transcript.
- `TextToSpeechProvider.synthesize()` transforme une réponse textuelle en audio.

Les adaptateurs concrets pourront utiliser des fournisseurs locaux ou cloud interchangeables. La mémoire conversationnelle devra être injectée par un port distinct lors d’une étape ultérieure.

## Orchestration

`VoiceAssistantService` exécute une seule itération déterministe : wake word, transcription, commande, assistant LEYNOR, synthèse vocale. Il n’effectue aucune recommandation d’investissement et conserve le score de confiance et les risques produits par l’assistant.

## Limites volontaires

Cette tranche ne capture pas encore le microphone, ne diffuse pas d’audio en streaming et ne persiste pas les sessions. Ces responsabilités appartiennent respectivement aux adaptateurs d’interface, de streaming et de mémoire.
