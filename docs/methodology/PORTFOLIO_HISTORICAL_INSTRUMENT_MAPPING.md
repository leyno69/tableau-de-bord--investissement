# Validation historique — continuité d'identité des instruments

## Objectif

Empêcher qu'un portefeuille soit rejoué sur une période où l'instrument réel n'existait pas, ou qu'un autre actif soit utilisé à sa place sans le documenter.

## Deux modes seulement

### `exact-instrument`

La série doit représenter l'instrument lui-même. Une fenêtre historique qui commence avant sa date de création est refusée.

### `explicit-proxy`

Un proxy économique peut être utilisé uniquement si :

- son identité est explicite ;
- sa justification est documentée ;
- le résultat conserve l'avertissement qu'il ne s'agit pas de l'instrument d'origine.

Un proxy ne doit jamais être renommé ou présenté comme s'il constituait l'historique réel de l'ETF ou de l'action d'origine.

## Application aux presets actuels

Les presets contiennent des tickers pédagogiques ou des instruments dont la profondeur historique peut être inférieure à l'horizon étudié. Le mapping concret de `WPEA`, `PAEJ`, `NVDA` et `SMH` sera donc vérifié avant la sélection des fenêtres réelles.

Ce document ne déclare aucun de ces tickers admissible et ne choisit encore aucun proxy.

## Prochaine étape

Vérifier l'identité, la date de création, la série historique disponible et les droits d'utilisation de chaque instrument ou proxy candidat, puis inscrire ces décisions dans le registre de sources avant tout replay.
