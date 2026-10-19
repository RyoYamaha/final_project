import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

@Injectable()
export class SepayWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedApiKey = process.env.SEPAY_WEBHOOK_API_KEY;
    if (!expectedApiKey) {
      throw new InternalServerErrorException(
        'SEPAY_WEBHOOK_API_KEY chưa được cấu hình',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const match =
      typeof authorization === 'string'
        ? /^Apikey\s+(.+)$/i.exec(authorization)
        : null;

    if (!match) {
      throw new UnauthorizedException('Webhook authentication failed');
    }

    const supplied = Buffer.from(match[1], 'utf8');
    const expected = Buffer.from(expectedApiKey, 'utf8');
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new UnauthorizedException('Webhook authentication failed');
    }

    return true;
  }
}
