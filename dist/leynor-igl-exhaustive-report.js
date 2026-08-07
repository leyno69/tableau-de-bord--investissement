function requireArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
}

function renderList(items) {
  return items.length === 0 ? '- Aucun élément documenté.' : items.map((item) => `- ${item}`).join('\n');
}

export function renderIglExhaustiveReport(input) {
  if (!input?.version || !input?.title) throw new TypeError('version and title are required');
  for (const name of ['principles', 'campaigns', 'findings', 'components', 'limitations', 'decisions', 'nextSteps']) {
    requireArray(input[name], name);
  }

  const campaignRows = input.campaigns.map((campaign) => {
    if (!campaign.id || !campaign.title || !Number.isInteger(campaign.trajectories) || campaign.trajectories < 0) {
      throw new TypeError('each campaign requires id, title and a non-negative integer trajectory count');
    }
    return `| ${campaign.id} | ${campaign.title} | ${campaign.trajectories.toLocaleString('fr-FR')} | ${campaign.status ?? 'documentée'} |`;
  });

  const componentRows = input.components.map((component) => {
    if (!component.name || !component.status || !component.rationale) {
      throw new TypeError('each component requires name, status and rationale');
    }
    return `| ${component.name} | ${component.status} | ${component.rationale} |`;
  });

  return [
    `# ${input.title}`,
    '',
    `**Version méthodologique :** ${input.version}`,
    `**Date de référence :** ${input.referenceDate ?? 'non fixée'}`,
    `**Statut :** ${input.status ?? 'rapport méthodologique'}`,
    '',
    '> Ce rapport décrit des simulations synthétiques et une méthode expérimentale. Il ne constitue ni une prévision, ni une promesse de rendement, ni un conseil en investissement.',
    '',
    '## 1. Principes directeurs',
    '',
    renderList(input.principles),
    '',
    '## 2. Inventaire des campagnes',
    '',
    '| Campagne | Objet | Trajectoires | Statut |',
    '|---|---|---:|---|',
    ...campaignRows,
    '',
    `**Total documenté : ${input.campaigns.reduce((sum, campaign) => sum + campaign.trajectories, 0).toLocaleString('fr-FR')} trajectoires.**`,
    '',
    '## 3. Résultats consolidés',
    '',
    renderList(input.findings),
    '',
    '## 4. Composantes candidates de l’IGL',
    '',
    '| Composante | Statut | Justification |',
    '|---|---|---|',
    ...componentRows,
    '',
    '## 5. Confiance, preuve et validation',
    '',
    renderList(input.validation ?? []),
    '',
    '## 6. Limites',
    '',
    renderList(input.limitations),
    '',
    '## 7. Décisions méthodologiques',
    '',
    renderList(input.decisions),
    '',
    '## 8. Étapes suivantes',
    '',
    renderList(input.nextSteps),
    '',
    '## 9. Conclusion',
    '',
    input.conclusion,
    '',
  ].join('\n');
}

export function auditIglReport(report) {
  if (typeof report !== 'string' || report.trim() === '') throw new TypeError('report must be a non-empty string');
  const requiredStatements = [
    'ne constitue ni une prévision',
    'aucun poids',
    'IGL de production',
    'limites',
  ];
  const missing = requiredStatements.filter((statement) => !report.toLowerCase().includes(statement.toLowerCase()));
  return Object.freeze({
    complete: missing.length === 0,
    missing: Object.freeze(missing),
  });
}
