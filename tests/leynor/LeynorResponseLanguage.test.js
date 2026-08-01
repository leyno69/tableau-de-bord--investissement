import test from 'node:test';
import assert from 'node:assert/strict';
import { conciseGeneralReply, normalizeAnswer, translateHeadings } from '../../application/services/LeynorAssistantService.js';

test('les titres anglais sont traduits en français', () => {
  const result = translateHeadings('Introduction\nTexte.\n\nFacts\n- Élément.\n\nExplanation\nDétail.\n\nConclusion\nFin.');
  assert.match(result, /^Introduction/m);
  assert.match(result, /^Faits/m);
  assert.match(result, /^Explication/m);
  assert.match(result, /^Conclusion/m);
  assert.doesNotMatch(result, /^Facts$/m);
  assert.doesNotMatch(result, /^Explanation$/m);
});

test('une conversation générale devient un paragraphe court sans chapitres', () => {
  const source = 'Introduction\nJe suis LEYNOR.\n\nFacts\n- Je suis un assistant virtuel.\n- Je n’ai pas d’âge.\n\nExplanation\nJe peux néanmoins discuter naturellement avec vous.\n\nConclusion\nQue souhaitez-vous savoir ?';
  const result = conciseGeneralReply(source);
  assert.doesNotMatch(result, /Introduction|Faits|Explication|Conclusion|Facts|Explanation/);
  assert.doesNotMatch(result, /\n/);
  assert.equal((result.match(/[.!?]+/g) || []).length <= 4, true);
});

test('la normalisation dépend de l’intention et non de la voix choisie', () => {
  const general = normalizeAnswer('Facts\n- Réponse simple.', 'general_conversation');
  const finance = normalizeAnswer('Facts\n- Donnée financière.', 'portfolio_analysis');
  assert.equal(general, 'Réponse simple.');
  assert.match(finance, /^Faits/m);
});
