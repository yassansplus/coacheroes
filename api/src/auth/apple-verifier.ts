import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class AppleVerifier {
  private readonly keys = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  constructor(private readonly config: ConfigService) {}
  async verify(identityToken: string, nonce: string) {
    const audience = this.config.get<string>('APPLE_CLIENT_ID');
    if (!audience) throw new ServiceUnavailableException('La connexion Apple n’est pas configurée.');
    try {
      const { payload } = await jwtVerify(identityToken, this.keys, {
        issuer: 'https://appleid.apple.com', audience, algorithms: ['RS256'],
        requiredClaims: ['sub', 'exp', 'iat', 'nonce'], maxTokenAge: '10m',
      });
      if (payload.nonce !== nonce || !payload.sub) throw new Error('Invalid nonce');
      return { subject: payload.sub, email: typeof payload.email === 'string' &&
        (payload.email_verified === true || payload.email_verified === 'true') ? payload.email : null };
    } catch { throw new UnauthorizedException('Connexion Apple invalide ou expirée. Réessaie.'); }
  }
}
