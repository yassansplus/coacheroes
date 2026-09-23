const { randomUUID } = require('node:crypto');
const profile = () => ({ goal: ['muscle'], age: '28', height: '178', weight: '76,5', gender: 'male', level: 'beginner',
  performances: [], sports: ['strength'], places: ['home'], days: [0], sessions: 1, timeOfDay: 'evening', duration: '45', gymType: 'home', equipment: ['dumbbells'],
  painSide: 'left', pains: [], painNotes: '', noPain: true, sleep: 420, activity: 'moderate', steps: 7000, meals: '3', cooking: 'often', restaurants: '0-1', tracking: ['none'],
  likedFoods: [], avoidedFoods: [], allergies: '', photos: { front: randomUUID() }, measurements: { waist: '', chest: '', arms: '', thighs: '' }, skippedSteps: [] });
const raw = id => ({ id, uuid: randomUUID(), category: { id: 11, name: 'Chest' }, muscles: [{ id: 4, name: 'Pectorals' }], muscles_secondary: [], equipment: [{ id: 3, name: 'Dumbbell' }],
  license: { id: 2, full_name: 'CC-BY-SA 4', url: 'https://creativecommons.org/licenses/by-sa/4.0/' }, license_author: 'Author',
  images: [{ image: 'https://example.test/private-image.jpg' }], videos: [{ video: 'https://example.test/video' }],
  translations: [{ id: id + 100, name: `Exercise ${id}`, description: '<p>Move carefully</p>', language: 2, license: 2, license_author: 'Translator' }] });
const prescription = id => ({ exerciseId: id, sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, rir: 3, guidance: 'Choisis la charge selon ton effort.', progression: 'Augmente seulement après validation de la plage de répétitions.' });
const plan = () => ({ outcome: 'ready', title: 'Reprise', summary: 'Une séance adaptée à ton matériel.', blockWeeks: 4, questions: [], assumptions: [], progression: 'Ajuster après tes séances.',
  sessions: [{ name: 'Corps entier', sport: 'strength', setting: 'self', blocks: [], weekday: 0, warmupMinutes: 5, warmup: 'Mobilité douce et séries progressives.', estimatedMinutes: 20, exercises: [prescription(1), prescription(2)] }] });

module.exports = { profile, raw, plan };
