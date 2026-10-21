import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    error: any,
    user: TUser,
    _info: any,
    context: ExecutionContext,
  ): TUser {
    if (error) {
      throw error;
    }
    if (user) {
      return user;
    }

    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    if (request.headers.authorization) {
      throw new UnauthorizedException();
    }
    return null as TUser;
  }
}
