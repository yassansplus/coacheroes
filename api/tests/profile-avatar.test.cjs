require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ConfigService } = require('@nestjs/config');
const { DataSource } = require('typeorm');
const sharp = require('sharp');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User, JournalEntry } = require('../dist/database/entities');
const { ProfileAvatarService } = require('../dist/profile-avatar/profile-avatar.service');
const migrations = fs.readdirSync(path.join(__dirname, '../dist/database/migrations')).filter(file => file.endsWith('.js')).sort()
  .flatMap(file => Object.values(require('../dist/database/migrations/' + file)));

test('avatar job uses the reference photo, stores a compact private result, and keeps replaced versions', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations,
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations();
  const person = await db.getRepository(User).save({ appleSubject: 'avatar-test-user' });
  const other = await db.getRepository(User).save({ appleSubject: 'avatar-other-user' });
  const service = new ProfileAvatarService(db, new ConfigService({ OPENAI_API_KEY: 'sk-test' }));
  service.pump = async () => {}; // PGlite has one connection; execute the worker serially below.
  const originalFetch = global.fetch;
  let requests = 0;
  let failOnce = false;
  const prompts = [];
  const output = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#3199ff' } }).png().toBuffer();
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/images/edits');
    assert.equal(options.body.get('model'), 'gpt-image-2.5-sunburst');
    assert.equal(options.body.get('quality'), 'high');
    assert.ok(options.body.get('image[]'));
    prompts.push(options.body.get('prompt'));
    requests++;
    if (failOnce) { failOnce = false; return { ok: false, status: 503 }; }
    return { ok: true, json: async () => ({ data: [{ b64_json: output.toString('base64') }] }) };
  };
  t.after(async () => { service.onModuleDestroy(); global.fetch = originalFetch; await db.destroy(); });
  const input = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#997766' } }).png().toBuffer();
  await assert.rejects(service.upload(person.id, input, { platform: 'unknown' }), { status: 400 });
  const first = await service.upload(person.id, input, { platform: 'game_boy', genre: 'jrpg', artStyle: 'pixel_art' });
  assert.equal(first.status, 'pending');
  await service.generate(first.versionId);
  const ready = await service.get(person.id);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.platform, 'game_boy');
  assert.equal(ready.genre, 'jrpg');
  assert.equal(ready.artStyle, 'pixel_art');
  assert.equal(requests, 1);
  assert.match(prompts[0], /Game Boy/);
  assert.match(prompts[0], /Japanese role-playing/);
  assert.match(prompts[0], /pixel art/);
  const source = await service.image(person.id, first.versionId, 'source');
  const generated = await service.image(person.id, first.versionId, 'generated');
  assert.ok(source.length < 1024 * 1024);
  assert.ok(generated.length < 1024 * 1024);
  assert.equal((await sharp(generated).metadata()).width, 512);
  await assert.rejects(service.image(other.id, first.versionId, 'source'), { status: 404 });
  const second = await service.upload(person.id, await sharp(input).modulate({ brightness: 0.8 }).toBuffer(),
    { platform: 'playstation_1', genre: 'boxing', artStyle: 'low_poly' });
  assert.notEqual(second.versionId, first.versionId);
  failOnce = true;
  await service.generate(second.versionId);
  assert.equal((await service.get(person.id)).status, 'failed');
  assert.equal((await service.retry(person.id)).status, 'pending');
  await service.generate(second.versionId);
  assert.equal((await service.get(person.id)).status, 'ready');
  assert.equal((await service.get(person.id)).platform, 'playstation_1');
  assert.match(prompts[2], /original PlayStation/);
  assert.match(prompts[2], /boxing game/);
  assert.match(prompts[2], /low-poly 3D/);
  assert.equal(prompts[1], prompts[2]);
  assert.ok((await service.image(person.id, first.versionId, 'generated')).length > 0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM profile_avatar_versions WHERE user_id=$1', [person.id]))[0].n, 2);
  assert.equal(await db.getRepository(JournalEntry).countBy({ userId: person.id, type: 'profile.avatar.uploaded' }), 2);
});
