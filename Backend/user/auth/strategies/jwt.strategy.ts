import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    }); //lấy token, kiểm tra xem chữ ký secret có chính xác không 
  }

  async validate(payload: { sub: string; role: string }) { //nếu hợp lệ thì lấy payload từ bên trong token
    return { id: payload.sub, role: payload.role };
  }
}