import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UserInfo } from "./UserInfo";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(protected readonly configService: ConfigService) {
        const secret = configService.get<string>("JWT_SECRET_KEY");
        console.log('JwtStrategy: Loaded Secret Key (first 4 chars):', secret?.substring(0, 4));
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: any): Promise<UserInfo> {
        console.log('JwtStrategy: Decoded Payload:', payload);
        return {
            id: payload.id,
            username: payload.username,
            roles: payload.roles,
            forcePasswordChange: payload.forcePasswordChange,
        };
    }
}
