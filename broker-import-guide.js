const GUIDES = {
  'trade-republic': {
    title: 'Exporter depuis Trade Republic',
    note: 'Les intitulés peuvent varier selon la version de l’application. Recherchez les rubriques Profil, Documents, Activité ou Relevés.',
    steps: [
      ['Ouvrez votre profil', 'Dans Trade Republic, ouvrez votre profil ou les paramètres du compte.', 'profile'],
      ['Accédez aux documents', 'Ouvrez Documents, Activité ou Relevés afin d’afficher vos opérations et justificatifs.', 'documents'],
      ['Choisissez la période', 'Sélectionnez une période assez large pour inclure toutes les opérations à importer.', 'period'],
      ['Téléchargez le fichier', 'Choisissez le CSV lorsqu’il est disponible. Sinon, téléchargez le PDF correspondant.', 'download']
    ]
  },
  revolut: {
    title: 'Exporter depuis Revolut',
    note: 'Selon votre formule Revolut et votre appareil, l’export peut se trouver dans Investissements, Activité, Relevés ou le menu ⋯.',
    steps: [
      ['Ouvrez Investissements', 'Depuis l’accueil Revolut, ouvrez Investissements puis votre compte-titres.', 'investments'],
      ['Ouvrez le menu', 'Touchez le menu ⋯, Activité ou Relevés pour accéder aux exports.', 'menu'],
      ['Choisissez Exporter', 'Sélectionnez l’export de l’historique ou le relevé de transactions.', 'export'],
      ['Sélectionnez la période', 'Choisissez la période et le format CSV si disponible, puis téléchargez le fichier.', 'download']
    ]
  },
  generic: {
    title: 'Exporter depuis un autre courtier',
    note: 'Recherchez un export de transactions, d’opérations ou de portefeuille. Le CSV est recommandé.',
    steps: [
      ['Ouvrez votre compte', 'Connectez-vous à l’application ou au site officiel de votre courtier.', 'profile'],
      ['Cherchez les relevés', 'Ouvrez Activité, Historique, Documents, Relevés ou Transactions.', 'documents'],
      ['Choisissez la période', 'Incluez toutes les opérations nécessaires pour reconstruire votre portefeuille.', 'period'],
      ['Exportez en CSV', 'Téléchargez le CSV. Utilisez un PDF uniquement si aucun export structuré n’est proposé.', 'download']
    ]
  }
};

function screenshot(kind, index) {
  const rows = {
    profile: ['Accueil', 'Portefeuille', 'Profil'],
    documents: ['Documents', 'Historique des transactions', 'Relevés fiscaux'],
    period: ['Période', 'Du 01/01/2026', 'Au 31/12/2026'],
    download: ['Format : CSV', 'Télécharger', 'Fichier prêt'],
    investments: ['Comptes', 'Cartes', 'Investissements'],
    menu: ['Activité', 'Relevés', 'Exporter'],
    export: ['Historique des ordres', 'Exporter l’historique', 'CSV ou PDF']
  }[kind] || ['Compte', 'Historique', 'Exporter'];
  return `<div class="guide-phone" aria-hidden="true"><div class="guide-phone__bar"><span>9:${30 + index}</span><span>•••</span></div><div class="guide-phone__screen"><strong>${rows[0]}</strong>${rows.slice(1).map((row, rowIndex) => `<div class="guide-phone__row ${rowIndex === rows.length - 2 ? 'is-highlighted' : ''}">${row}</div>`).join('')}<div class="guide-phone__chart"><i></i><i></i><i></i><i></i><i></i></div></div></div>`;
}

function guideMarkup(broker) {
  const guide = GUIDES[broker] || GUIDES.generic;
  return `<section class="import-guide" id="brokerImportGuide">
    <div class="import-guide__head">
      <div><p class="eyebrow">AIDE PAS À PAS</p><h3>Comment récupérer mon fichier ?</h3><p>Exportez vos données depuis votre courtier, puis revenez ici pour les analyser.</p></div>
      <button type="button" class="btn secondary" id="toggleImportGuide" aria-expanded="false">Voir le guide</button>
    </div>
    <div class="import-guide__content" id="importGuideContent" hidden>
      <div class="import-guide__tabs" role="tablist" aria-label="Choisir un courtier">
        <button type="button" role="tab" data-guide-broker="trade-republic" class="${broker === 'trade-republic' ? 'active' : ''}">Trade Republic</button>
        <button type="button" role="tab" data-guide-broker="revolut" class="${broker === 'revolut' ? 'active' : ''}">Revolut</button>
        <button type="button" role="tab" data-guide-broker="generic" class="${broker === 'generic' ? 'active' : ''}">Autre courtier</button>
      </div>
      <div class="import-guide__title"><h4>${guide.title}</h4><span>CSV recommandé</span></div>
      <div class="import-guide__steps">${guide.steps.map(([title, text, kind], index) => `<article class="import-guide__step"><div class="import-guide__number">${index + 1}</div><div><h5>${title}</h5><p>${text}</p>${screenshot(kind, index)}</div></article>`).join('')}</div>
      <aside class="import-guide__notice"><strong>Repères visuels</strong><p>Ces illustrations facilitent la recherche des menus, mais ne reproduisent pas exactement l’interface du courtier. Vérifiez toujours que vous utilisez l’application ou le site officiel.</p></aside>
      <div class="import-guide__security"><div><strong>Confidentialité</strong><p>LEYNOR ne demande jamais votre mot de passe, votre code PIN ou votre code SMS.</p></div><div><strong>Avant de confirmer</strong><p>Vérifiez les opérations reconnues. Aucune donnée n’est appliquée automatiquement.</p></div></div>
      <p class="import-guide__note">${guide.note}</p>
    </div>
  </section>`;
}

function renderGuide(broker = 'trade-republic', preserveOpen = false) {
  const host = document.getElementById('brokerImportDialog')?.querySelector('.import-shell');
  if (!host) return;
  let node = document.getElementById('brokerImportGuide');
  const wasOpen = preserveOpen && !document.getElementById('importGuideContent')?.hidden;
  if (node) node.remove();
  const firstImportStep = host.querySelector('.import-step');
  firstImportStep?.insertAdjacentHTML('afterend', guideMarkup(broker));
  node = document.getElementById('brokerImportGuide');
  const content = document.getElementById('importGuideContent');
  const toggle = document.getElementById('toggleImportGuide');
  if (wasOpen) { content.hidden = false; toggle.setAttribute('aria-expanded', 'true'); toggle.textContent = 'Masquer le guide'; }
  toggle?.addEventListener('click', () => {
    content.hidden = !content.hidden;
    toggle.setAttribute('aria-expanded', String(!content.hidden));
    toggle.textContent = content.hidden ? 'Voir le guide' : 'Masquer le guide';
  });
  node?.querySelectorAll('[data-guide-broker]').forEach(button => button.addEventListener('click', () => {
    const brokerSelect = document.getElementById('importBroker');
    if (brokerSelect) brokerSelect.value = button.dataset.guideBroker;
    brokerSelect?.dispatchEvent(new Event('change', { bubbles: true }));
    renderGuide(button.dataset.guideBroker, true);
  }));
}

function mount() {
  if (!document.getElementById('brokerImportDialog')) return window.setTimeout(mount, 0);
  if (!document.querySelector('link[data-import-guide]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'broker-import-guide.css';
    link.dataset.importGuide = 'true';
    document.head.append(link);
  }
  const broker = document.getElementById('importBroker')?.value || 'trade-republic';
  renderGuide(broker);
  document.getElementById('importBroker')?.addEventListener('change', event => renderGuide(event.target.value, !document.getElementById('importGuideContent')?.hidden));
}

window.setTimeout(mount, 0);
