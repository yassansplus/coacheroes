import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import sharp = require('sharp');
import { JournalEntry } from '../database/entities';
import { avatarPrompt, parseAvatarPreferences, type AvatarPreferences } from './avatar-options';

const model = 'gpt-image-2.5-sunburst';
type AvatarRow = { id: string; status: string; error_code: string | null; created_at: Date; completed_at: Date | null;
  platform: string; genre: string; art_style: string };

@Injectable()
export class ProfileAvatarService {
  private readonly logger = new Logger(ProfileAvatarService.name);
  private timer?: ReturnType<typeof setInterval>;
  private active = 0;
  private pumping = false;
  constructor(private readonly db: DataSource, private readonly config: ConfigService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.pump(), 30000);
    this.timer.unref?.();
    void this.pump();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async get(userId: string) {
    const [row] = await this.db.query(`SELECT v.id,v.status,v.error_code,v.created_at,v.completed_at,v.platform,v.genre,v.art_style
      FROM profile_avatars a JOIN profile_avatar_versions v ON v.id=a.current_version_id WHERE a.user_id=$1`, [userId]) as AvatarRow[];
    return row ? { versionId: row.id, status: row.status, errorCode: row.error_code,
      platform: row.platform, genre: row.genre, artStyle: row.art_style,
      sourceUrl: `/profile/avatar/images/${row.id}/source`, generatedUrl: row.status === 'ready' ? `/profile/avatar/images/${row.id}/generated` : null,
      createdAt: row.created_at, completedAt: row.completed_at } : null;
  }

  async upload(userId: string, content: Buffer, choices: { platform?: string; genre?: string; artStyle?: string } = {}) {
    const preferences = parseAvatarPreferences(choices);
    if (!Buffer.isBuffer(content) || !content.length || content.length > 8 * 1024 * 1024)
      throw new BadRequestException('Choisis une photo de moins de 8 Mo.');
    let source: Buffer;
    try {
      source = await sharp(content, { limitInputPixels: 40000000 }).rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 76, mozjpeg: true }).toBuffer();
    } catch { throw new BadRequestException('Cette photo est illisible. Choisis une photo JPEG, PNG, WebP ou HEIC.'); }
    const versionId = await this.db.transaction(async manager => {
      await manager.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const [current] = await manager.query('SELECT current_version_id,revision FROM profile_avatars WHERE user_id=$1 FOR UPDATE', [userId]);
      if (current) await manager.query(`UPDATE profile_avatar_versions SET status='superseded',worker_token=NULL
        WHERE id=$1 AND status IN ('pending','processing','failed')`, [current.current_version_id]);
      const [version] = await manager.query(`INSERT INTO profile_avatar_versions(user_id,source_image,model,platform,genre,art_style)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [userId, source, model, preferences.platform, preferences.genre, preferences.artStyle]);
      await manager.query(`INSERT INTO profile_avatars(user_id,current_version_id) VALUES($1,$2)
        ON CONFLICT(user_id) DO UPDATE SET current_version_id=$2,revision=profile_avatars.revision+1,updated_at=now()`, [userId, version.id]);
      await manager.save(JournalEntry, manager.create(JournalEntry, { userId, requestId: randomUUID(), type: 'profile.avatar.uploaded',
        occurredAt: new Date(), payload: { versionId: version.id, previousVersionId: current?.current_version_id ?? null,
          bytesStored: source.length, model, preferences } }));
      return version.id as string;
    });
    void this.pump();
    return { versionId, status: 'pending', sourceUrl: `/profile/avatar/images/${versionId}/source`, generatedUrl: null, ...preferences };
  }

  async retry(userId: string) {
    const status = await this.db.transaction(async manager => {
      await manager.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const [row] = await manager.query(`SELECT v.id,v.status FROM profile_avatars a JOIN profile_avatar_versions v ON v.id=a.current_version_id
        WHERE a.user_id=$1 FOR UPDATE OF v`, [userId]);
      if (!row) throw new NotFoundException('Ajoute d’abord une photo.');
      if (row.status !== 'failed') return row.status as string;
      await manager.query("UPDATE profile_avatar_versions SET status='pending',error_code=NULL,worker_token=NULL,started_at=NULL WHERE id=$1", [row.id]);
      await manager.save(JournalEntry, manager.create(JournalEntry, { userId, requestId: randomUUID(), type: 'profile.avatar.retried',
        occurredAt: new Date(), payload: { versionId: row.id } }));
      return 'pending';
    });
    void this.pump();
    return { status };
  }

  async image(userId: string, id: string, kind: 'source' | 'generated') {
    const [row] = await this.db.query(`SELECT ${kind === 'source' ? 'source_image' : 'generated_image'} AS image
      FROM profile_avatar_versions WHERE id=$1 AND user_id=$2`, [id, userId]);
    if (!row?.image) throw new NotFoundException('Photo introuvable.');
    return row.image as Buffer;
  }

  private async pump() {
    if (this.pumping || this.active >= 2) return;
    this.pumping = true;
    try {
      const rows = await this.db.query(`SELECT v.id FROM profile_avatar_versions v JOIN profile_avatars a ON a.current_version_id=v.id
        WHERE v.status='pending' OR (v.status='processing' AND v.started_at<now()-interval '15 minutes')
        ORDER BY v.created_at ASC LIMIT $1`, [2 - this.active]) as { id: string }[];
      for (const row of rows) { this.active++; void this.generate(row.id).finally(() => { this.active--; void this.pump(); }); }
    } catch (error) { this.logger.error('Avatar job lookup failed', error instanceof Error ? error.stack : undefined); }
    finally { this.pumping = false; }
  }

  private async generate(id: string) {
    const worker = randomUUID();
    try {
      const [claimed] = await this.db.query(`UPDATE profile_avatar_versions SET status='processing',worker_token=$2,started_at=now(),error_code=NULL
        WHERE id=$1 AND (status='pending' OR (status='processing' AND started_at<now()-interval '15 minutes'))
        RETURNING id`, [id, worker]);
      if (!claimed) return;
      const [job] = await this.db.query('SELECT user_id,source_image,platform,genre,art_style FROM profile_avatar_versions WHERE id=$1 AND worker_token=$2', [id, worker]);
      if (!job) return;
      const key = this.config.get<string>('OPENAI_API_KEY');
      if (!key?.startsWith('sk-')) throw new Error('OPENAI_KEY_MISSING');
      const preferences: AvatarPreferences = parseAvatarPreferences({ platform: job.platform, genre: job.genre, artStyle: job.art_style });
      const form = new FormData();
      form.set('model', model); form.set('prompt', avatarPrompt(preferences)); form.set('size', '1024x1024'); form.set('quality', 'high');
      form.set('output_format', 'jpeg'); form.set('output_compression', '80');
      form.append('image[]', new Blob([new Uint8Array(job.source_image)], { type: 'image/jpeg' }), 'reference.jpg');
      const response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST',
        headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(180000) });
      if (!response.ok) throw new Error(`OPENAI_IMAGE_HTTP_${response.status}`);
      const result = await response.json() as { data?: { b64_json?: string }[] };
      if (!result.data?.[0]?.b64_json) throw new Error('OPENAI_IMAGE_EMPTY');
      const generated = await sharp(Buffer.from(result.data[0].b64_json, 'base64'), { limitInputPixels: 40000000 })
        .resize(512, 512, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      await this.db.transaction(async manager => {
        const [saved] = await manager.query(`UPDATE profile_avatar_versions SET status='ready',generated_image=$3,completed_at=now(),worker_token=NULL
          WHERE id=$1 AND worker_token=$2 AND status='processing' RETURNING user_id`, [id, worker, generated]);
        if (saved) await manager.save(JournalEntry, manager.create(JournalEntry, { userId: job.user_id, requestId: randomUUID(),
          type: 'profile.avatar.generated', occurredAt: new Date(), payload: { versionId: id, model, preferences, bytesStored: generated.length } }));
      });
    } catch (error) {
      const code = error instanceof Error ? error.message.slice(0, 80) : 'IMAGE_GENERATION_FAILED';
      this.logger.warn(`Avatar generation failed (${code})`);
      await this.db.query(`UPDATE profile_avatar_versions SET status='failed',error_code=$3,worker_token=NULL,completed_at=now()
        WHERE id=$1 AND worker_token=$2 AND status='processing'`, [id, worker, code]).catch(() => undefined);
    }
  }
}
