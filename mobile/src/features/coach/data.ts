import type { IllustrationName } from '@/components/Illustration';
import type { SymbolName } from '@/components/Symbol';

export const questionGroups: { title: string; questions: { text: string; icon: IllustrationName; tone: 'green' | 'purple' | 'red' | 'blue' }[] }[] = [
  { title: 'Entraînement', questions: [
    { text: 'Dois-je alléger ma séance ?', icon: 'dumbbell', tone: 'green' },
    { text: 'Par quoi remplacer le développé épaules ?', icon: 'dumbbell', tone: 'purple' },
    { text: 'Puis-je ajouter une séance de boxe ?', icon: 'boxing', tone: 'red' },
  ] },
  { title: 'Nutrition', questions: [
    { text: 'Que manger avec 430 kcal ?', icon: 'cutlery', tone: 'green' },
    { text: 'Combien de protéines me reste-t-il ?', icon: 'shaker', tone: 'red' },
  ] },
  { title: 'Progression', questions: [
    { text: 'Pourquoi mon poids stagne ?', icon: 'scale', tone: 'purple' },
    { text: 'Quels exercices ont progressé ?', icon: 'performance', tone: 'blue' },
  ] },
];
export const observations: { label: string; value: string; status: string; icon?: IllustrationName; glyph?: SymbolName; tone: 'purple' | 'green' | 'red' }[] = [
  { label: 'Sommeil', value: '4 h 10', status: 'Faible', icon: 'moon', tone: 'purple' },
  { label: 'Énergie', value: '2 / 5', status: 'Basse', glyph: 'battery', tone: 'green' },
  { label: 'Courbatures épaules', value: '4 / 5', status: 'Élevées', icon: 'dumbbell', tone: 'purple' },
  { label: 'Performance précédente', value: '−6 %', status: 'En baisse', glyph: 'chart', tone: 'red' },
];

// Consistent fixture: the proposed removals total 4 sets, including one leg-curl set.
export const changes = [
  { id: 'shoulders', name: 'Développé épaules', before: '3 séries', after: '2 séries', detail: 'Une série de moins. La charge reste identique.', tone: 'purple' as const, glyph: 'dumbbell' as const },
  { id: 'lateral', name: 'Élévations latérales', before: '2 séries', after: 'Retirées jeudi', detail: 'Cet exercice est retiré de Muscu B pour laisser récupérer les épaules.', tone: 'red' as const, glyph: 'minus' as const },
  { id: 'legcurl', name: 'Leg curl', before: '2 séries', after: '1 série', detail: 'Une série de moins pour atteindre le volume total de 14 séries.', tone: 'purple' as const, glyph: 'dumbbell' as const },
  { id: 'rir', name: 'RIR cible', before: '2', after: '3', detail: 'Terminer chaque série avec environ trois répétitions encore possibles. Les charges principales restent inchangées.', tone: 'purple' as const, glyph: 'chart' as const },
];
export const comparison = [
  { label: 'Durée', before: '65 min', after: '50 min', glyph: 'clock', tone: 'green' },
  { label: 'Volume', before: '18 séries', after: '14 séries', glyph: 'chart', tone: 'purple' },
  { label: 'Épaules', before: '5 séries', after: '2 séries', glyph: 'dumbbell', tone: 'red' },
  { label: 'RIR cible', before: '2', after: '3', glyph: 'target', tone: 'neutral' },
] as const;
