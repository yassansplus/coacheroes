import type { Conversation } from './types';

export function weekRange(timestamp: number) {
  const start = new Date(timestamp); start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const reset = new Date(end); reset.setDate(reset.getDate() + 1);
  return { start, end, reset };
}
export const dayLabel = (date: Date) => date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
export const timeLabel = (timestamp: number) => new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Local stand-in for the future decision tool. No network calls or actual model. */
export function evaluateDemoQuestion(text: string, conversation?: Conversation) {
  const question = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const active = conversation?.proposals.find(proposal => proposal.status === 'pending');
  if (/ne (veux|souhaite).*pas.*(modif|chang|alleg)|gard(er|e|ons).*seance|conserv/.test(question))
    return { text: 'D’accord, je conserve le programme actuel. Tu peux revenir sur la proposition à tout moment.', recommend: false };
  if (/protein/.test(question)) return { text: 'Dans le contexte d’exemple, il te reste 23 g de protéines pour atteindre 160 g aujourd’hui. Retrouve le détail dans ton journal Nutrition.', recommend: false };
  if (/calori|kcal|manger|nutrition|repas/.test(question)) return { text: 'Il reste 430 kcal dans la journée d’exemple. On peut composer un dîner autour d’une source de protéines, de légumes et d’une portion de féculents. Le journal Nutrition te permet d’ajuster les quantités.', recommend: false };
  if (/boxe/.test(question)) return { text: 'Aucun changement pour la boxe samedi dans cet exemple. La proposition concerne uniquement Muscu B ; la boxe pourra être réévaluée après la séance de jeudi.', recommend: false };
  if (/poids|stagn/.test(question)) return { text: 'Pour comprendre une stagnation, nous comparerons la tendance du poids sur plusieurs semaines, la régularité des mesures et le journal alimentaire. Une mesure isolée ne suffit pas. Sur quelle période observes-tu ce plateau ?', recommend: false };
  if (/progress/.test(question) && !/programme/.test(question)) return { text: 'L’historique de chaque exercice permet de comparer les charges et les répétitions. Dans cet exemple, la performance précédente est en baisse de 6 %. Souhaites-tu regarder l’adaptation de Muscu B ?', recommend: false };
  if (/alleg|ajust|modif|remplac|epaule|sommeil|dormi|fatigu|energie|programme|muscu|seance|semaine/.test(question)) {
    return { text: active ? 'La proposition pour Muscu B est toujours disponible ci-dessous. Tu peux consulter les raisons, comparer les versions et décider de son application.' : 'Je propose une version allégée de Muscu B : 18 → 14 séries, charges conservées et 3 répétitions en réserve. La boxe reste inchangée. Consulte l’ajustement avant de décider.', recommend: true, existingProposalId: active?.id };
  }
  return { text: 'Tu souhaites faire le point sur ton entraînement, ta nutrition ou ta progression ? Donne-moi un peu de contexte pour continuer cette conversation.', recommend: false };
}
