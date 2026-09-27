require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User, JournalEntry } = require('../dist/database/entities');
const { WorkoutSession } = require('../dist/workouts/workout.entity');
const { SquadService } = require('../dist/squad/squad.service');
const { snapshot } = require('./workout-fixtures.cjs');
const migrations = fs.readdirSync(path.join(__dirname, '../dist/database/migrations')).filter(file => file.endsWith('.js')).sort()
  .flatMap(file => Object.values(require('../dist/database/migrations/' + file)));

test('friends and multiple groups stay distinct; claimed links require acceptance and keep audited history', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations,
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const [a, b, c, d] = await db.getRepository(User).save([
    { appleSubject: 'squad-a', firstName: 'Alice' }, { appleSubject: 'squad-b', firstName: 'Benoît' },
    { appleSubject: 'squad-c', firstName: 'Chloé' }, { appleSubject: 'squad-d', firstName: 'David' },
  ]);
  const service = new SquadService(db);
  const groupA = await service.createGroup(a.id, { requestId: randomUUID(), name: 'Les potes' });
  const groupB = await service.createGroup(b.id, { requestId: randomUUID(), name: 'Boxe du jeudi' });
  const groupAgain = await service.createGroup(a.id, { requestId: randomUUID(), name: 'Collègues' });
  assert.equal((await service.overview(a.id)).groups.length, 2);
  await assert.rejects(service.group(d.id, groupA.id), { status: 404 });

  const groupToken = randomUUID();
  await service.createInvitation(a.id, { token: groupToken, kind: 'group', groupId: groupA.id });
  await assert.rejects(service.claim(a.id, groupToken), { status: 400 });
  const claimed = await service.claim(b.id, groupToken);
  assert.equal((await service.invitations(b.id)).incoming.length, 1);
  await assert.rejects(service.claim(c.id, groupToken), { status: 409 });
  await service.resolve(b.id, claimed.id, true);
  await service.resolve(b.id, claimed.id, true);
  assert.equal((await service.group(b.id, groupA.id)).members.length, 2);
  assert.equal((await service.overview(b.id)).groups.length, 2);
  assert.equal((await service.overview(a.id)).friends.length, 0);

  const friendToken = randomUUID();
  await service.createInvitation(a.id, { token: friendToken, kind: 'friend' });
  const friendship = await service.claim(b.id, friendToken);
  await service.resolve(b.id, friendship.id, true);
  assert.equal((await service.overview(a.id)).friends[0].id, b.id);
  const groupWithFriend = await service.group(a.id, groupA.id);
  assert.equal(groupWithFriend.members.find(person => person.id === b.id).details, true);

  const cToken = randomUUID();
  await service.createInvitation(a.id, { token: cToken, kind: 'group', groupId: groupA.id });
  const cInvite = await service.claim(c.id, cToken); await service.resolve(c.id, cInvite.id, true);
  const memberOnly = await service.group(a.id, groupA.id);
  assert.equal(memberOnly.members.find(person => person.id === c.id).details, false);

  const challenge = await service.createChallenge(a.id, groupA.id, { requestId: randomUUID(), title: 'Objectif commun', targetSessions: 3, durationDays: 7 });
  const dToken = randomUUID();
  await service.createInvitation(a.id, { token: dToken, kind: 'group', groupId: groupA.id });
  const dInvite = await service.claim(d.id, dToken); await service.resolve(d.id, dInvite.id, true);
  const addWorkout = async (userId, minutes, offset) => {
    const at = new Date(Date.now() + offset * 1000);
    const workout = snapshot(); workout.status = 'completed'; workout.startedAt = at.getTime();
    workout.endedAt = at.getTime() + minutes * 60000; workout.workout.sport = 'strength'; workout.timezone = 'UTC';
    await db.getRepository(WorkoutSession).save({ id: randomUUID(), userId, programVersionId: null, revision: 1,
      status: 'completed', startedAt: at, endedAt: new Date(workout.endedAt), snapshot: workout,
      summary: { durationSeconds: minutes * 60 }, analysis: null, analysisAppliedAt: null });
  };
  await addWorkout(b.id, 40, 10); await addWorkout(b.id, 40, 20); await addWorkout(c.id, 35, 30);
  await addWorkout(a.id, 20, 40);
  await addWorkout(d.id, 40, -3600); // This workout predates group membership.
  await addWorkout(d.id, 40, 50);
  const result = await service.group(a.id, groupA.id);
  assert.equal(result.activeChallenge.id, challenge.id);
  assert.equal(result.activeChallenge.currentSessions, 2);
  assert.equal(result.activeChallenge.contributions.find(item => item.userId === b.id).count, 1);
  assert.equal(result.activeChallenge.contributions.some(item => item.userId === d.id), false);
  assert.equal(result.members.find(person => person.id === d.id).stats.sessionsWeek, 1);

  await service.preferences(b.id, { requestId: randomUUID(), revision: 0, shareActivity: false, shareRecords: false });
  assert.equal((await service.group(a.id, groupA.id)).activity.some(event => event.userId === b.id), false);
  await service.removeFriend(a.id, b.id, { requestId: randomUUID() });
  assert.equal((await service.overview(a.id)).friends.length, 0);
  assert.equal((await service.group(a.id, groupA.id)).members.find(person => person.id === b.id).details, false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM squad_friendships'))[0].n, 1);
  assert.equal(await db.getRepository(JournalEntry).countBy({ userId: a.id, type: 'squad.friend.removed' }), 1);
  assert.equal((await service.overview(a.id)).groups.some(group => group.id === groupAgain.id), true);
  assert.equal((await service.overview(b.id)).groups.some(group => group.id === groupB.id), true);
});
