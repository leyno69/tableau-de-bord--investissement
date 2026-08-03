# LEYNOR AI — Smoke import Twelve Data sécurisé

## Objet

Cette brique vérifie uniquement :

- la présence de `TWELVEDATA_API_KEY` sans révéler sa valeur ;
- la connectivité avec l’API Twelve Data ;
- la conformité minimale du schéma OHLCV ;
- la production d’une empreinte SHA-256 déterministe ;
- le maintien des garde-fous scientifiques.

Elle ne constitue ni une validation externe, ni une preuve de disponibilité point-in-time, ni une autorisation d’activer un score IGL de production.

## Limites obligatoires

Le smoke import est volontairement borné à cinq lignes. Il doit être exécuté sur un seul symbole et une courte période avant tout élargissement.

La clé doit provenir exclusivement de la variable d’environnement :

```text
TWELVEDATA_API_KEY
```

Elle ne doit jamais être :

- commitée ;
- placée dans une URL ;
- affichée dans les logs ;
- copiée dans un rapport ou une issue GitHub.

## Exemple d’exécution

```js
import { runTwelveDataSmokeImport } from '../market-data/TwelveDataSmokeImport.js';

const report = await runTwelveDataSmokeImport({
  symbol: 'AAPL',
  startDate: '2026-01-01',
  endDate: '2026-01-05',
  interval: '1day',
  outputSize: 5,
});
```

Le rapport contient uniquement des métadonnées non secrètes : fournisseur, période, nombre de lignes, empreinte et état de l’audit temporel.

## Interprétation scientifique

Un import réussi démontre uniquement que la connexion et le mapping fonctionnent. Twelve Data ne doit pas être considéré comme point-in-time, exempt de survivorship bias ou adapté à une validation scientifique externe tant que ces propriétés ne sont pas établies séparément et documentées.

## Étape suivante

Configurer le secret dans l’environnement d’exécution, lancer un import réel minimal, conserver l’empreinte et le rapport d’acquisition, puis décider si les données sont limitées au développement ou admissibles à une validation plus exigeante.
