import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import { AuthChallenge, JournalEntry, Onboarding, Session, User } from '../database/entities';
import { AppleVerifier } from './apple-verifier';

export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(private readonly db: DataSource, private readonly apple: AppleVerifier) {}
  async challenge() {
    const nonce = randomBytes(32).toString('hex');
    await this.db.getRepository(AuthChallenge).insert({ nonceHash: hash(nonce), expiresAt: new Date(Date.now() + 300_000) });
    return { nonce };
  }
  async signIn(identityToken: string, nonce: string, firstName?: string) {
    const identity = await this.apple.verify(identityToken, nonce);
    return this.db.transaction(async manager => {
      const consumed = await manager.createQueryBuilder().update(AuthChallenge).set({ usedAt: new Date() })
        .where('nonce_hash = :hash AND used_at IS NULL AND expires_at > now()', { hash: hash(nonce) }).execute();
      if (consumed.affected !== 1) throw new UnauthorizedException('Cette connexion a expiré. Réessaie avec Apple.');
      await manager.createQueryBuilder().insert().into(User).values({ appleSubject: identity.subject, email: identity.email }).orIgnore().execute();
      const user = await manager.findOneByOrFail(User, { appleSubject: identity.subject });
      const name = firstName?.trim();
      if (name && !user.firstName) {
        const updated = await manager.createQueryBuilder().update(User).set({ firstName: name }).where('id = :id AND first_name IS NULL', { id: user.id }).execute();
        if (updated.affected) await manager.increment(Onboarding, { userId: user.id }, 'revision', 1);
        if (updated.affected) await manager.save(JournalEntry, manager.create(JournalEntry, { userId: user.id, type: 'profile.first_name_saved', requestId: randomUUID(), occurredAt: new Date(), payload: { before: null, after: name, source: 'apple_client' } }));
      }
      await manager.createQueryBuilder().insert().into(Onboarding).values({ userId: user.id }).orIgnore().execute();
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 86400_000);
      await manager.insert(Session, { tokenHash: hash(token), userId: user.id, expiresAt });
      await manager.insert(JournalEntry, { userId: user.id, type: 'session.started', requestId: randomUUID(), occurredAt: new Date(), payload: { provider: 'apple' } });
      return { token, expiresAt: expiresAt.toISOString() };
    });
  }
  async authenticate(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException();
    const session = await this.db.getRepository(Session).findOneBy({ tokenHash: hash(token), revokedAt: IsNull(), expiresAt: MoreThan(new Date()) });
    if (!session) throw new UnauthorizedException('Reconnecte-toi pour continuer.');
    return session;
  }
  async me(userId: string) {
    const user = await this.db.getRepository(User).findOneByOrFail({ id: userId });
    const onboarding = await this.db.getRepository(Onboarding).findOneByOrFail({ userId });
    return { id: user.id, firstName: user.firstName, email: user.email, createdAt: user.createdAt.toISOString(), onboardingCompleted: Boolean(onboarding.completedAt) };
  }
  async signOut(session: Session) {
    await this.db.getRepository(Session).update({ tokenHash: session.tokenHash }, { revokedAt: new Date() });
  }
}
