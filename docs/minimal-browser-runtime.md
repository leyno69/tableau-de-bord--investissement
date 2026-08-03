# Runtime navigateur minimal

Le frontend Vercel charge temporairement uniquement `browser-recovery.js` et `app.js`.

Les modules secondaires suivants sont exclus du HTML généré afin d'isoler le blocage navigateur :

- `resolver-ui.js`
- `assistant-ui.js`
- `server-sync.js`
- `broker-import.js`
- `home-recovery.js`

Ils pourront être réactivés un par un après validation du noyau sur Safari et Chrome.
