import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';
import { DataSource, In } from 'typeorm';
import { hash } from '../auth/auth.service';
import { JournalEntry, Onboarding, OnboardingPhoto } from '../database/entities';
import { completionError, type SaveInput } from './onboarding.schema';

@Injectable()
export class OnboardingService {
  constructor(private readonly db: DataSource) {}
  get(userId: string) { return this.db.getRepository(Onboarding).findOneByOrFail({ userId }); }
  async save(userId: string, input: SaveInput, complete: boolean) {
    const requestHash = hash(JSON.stringify({ input, complete }));
    return this.db.transaction(async manager => {
      const row = await manager.findOneOrFail(Onboarding, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      const receipt = await manager.findOneBy(JournalEntry, { userId, requestId: input.requestId });
      if (receipt) {
        if (receipt.payload.requestHash !== requestHash) throw new ConflictException('Cet identifiant de requête a déjà été utilisé.');
        if (receipt.payload.revision !== row.revision) throw new ConflictException('Ton profil a changé depuis cette sauvegarde. Recharge les réponses.');
        return row;
      }
      if (row.revision !== input.revision) throw new ConflictException('Ton profil a changé sur un autre écran ou appareil. Recharge les réponses avant de modifier à nouveau.');
      if (complete || row.completedAt) {
        const error = completionError(input.profile);
        if (error) throw new BadRequestException(error);
      }
      const photoIds = [...new Set(Object.values(input.profile.photos))];
      if (photoIds.length && await manager.countBy(OnboardingPhoto, { userId, id: In(photoIds) }) !== photoIds.length)
        throw new BadRequestException('Une photo ne correspond pas à ton compte.');
      const before = { profile: row.profile, currentStep: row.currentStep, completedAt: row.completedAt?.toISOString() ?? null };
      const changed = Object.keys(input.profile).filter(key => !isDeepStrictEqual(row.profile[key], input.profile[key as keyof typeof input.profile]));
      const firstCompletion = complete && !row.completedAt;
      if (!changed.length && row.currentStep === input.currentStep && !firstCompletion) return row;
      row.profile = input.profile;
      row.currentStep = input.currentStep;
      if (firstCompletion) row.completedAt = new Date();
      row.revision++;
      await manager.save(row);
      const changes = Object.fromEntries(changed.map(key => [key, { before: before.profile[key] ?? null, after: row.profile[key] }]));
      await manager.save(JournalEntry, manager.create(JournalEntry, {
        userId, requestId: input.requestId, type: firstCompletion ? 'onboarding.completed' : 'onboarding.updated',
        occurredAt: new Date(input.occurredAt), payload: { schemaVersion: 1, requestHash, timezone: input.timezone,
          revision: row.revision, changes, previousStep: before.currentStep, currentStep: row.currentStep,
          completedAt: row.completedAt?.toISOString() ?? null },
      }));
      return row;
    });
  }
  async upload(userId: string, content: Buffer) {
    if (!Buffer.isBuffer(content) || !content.length || content.length > 8 * 1024 * 1024) throw new BadRequestException('Photo limitée à 8 Mo.');
    const type = content.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? 'image/jpeg' :
      content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png' :
      content.toString('ascii', 0, 4) === 'RIFF' && content.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' :
      content.toString('ascii', 4, 8) === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx', 'mif1'].includes(content.toString('ascii', 8, 12)) ? 'image/heic' : null;
    if (!type) throw new BadRequestException('Choisis une photo JPEG, PNG, WebP ou HEIC.');
    return this.db.transaction(async manager => {
      // Serialize per account, including the quota and deduplication check.
      await manager.findOneOrFail(Onboarding, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      const sha256 = hash(content);
      const existing = await manager.findOneBy(OnboardingPhoto, { userId, sha256 });
      if (existing) return { id: existing.id };
      if (await manager.countBy(OnboardingPhoto, { userId }) >= 100) throw new BadRequestException('Limite de photos de l’onboarding atteinte.');
      const photo = await manager.save(OnboardingPhoto, manager.create(OnboardingPhoto, { userId, sha256, contentType: type, content }));
      return { id: photo.id };
    });
  }
  async photo(userId: string, id: string) {
    const photo = await this.db.getRepository(OnboardingPhoto).createQueryBuilder('photo').addSelect('photo.content')
      .where('photo.id = :id AND photo.user_id = :userId', { id, userId }).getOne();
    if (!photo) throw new NotFoundException();
    return photo;
  }
}
