import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOkResponse, ApiBody } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginCredentials } from "./LoginCredentials";
import { UserInfo } from "./UserInfo";

@ApiTags("auth")
@Controller()
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post("login")
    @ApiOkResponse({ type: UserInfo })
    @ApiBody({ type: LoginCredentials })
    async login(@Body() body: LoginCredentials): Promise<UserInfo> {
        return this.authService.login(body);
    }

    @Post("logout")
    @ApiOkResponse({ type: Boolean })
    async logout(): Promise<boolean> {
        return true;
    }

    @Post("verify-email")
    @ApiOkResponse({ type: UserInfo })
    async verifyEmail(@Body() body: { userId: string, code: string }): Promise<UserInfo> {
        return this.authService.verifyEmail(body.userId, body.code);
    }

    @Post("forgot-password")
    @ApiOkResponse({ type: Object })
    async forgotPassword(@Body() body: { emailOrUsername: string }): Promise<any> {
        return this.authService.forgotPassword(body.emailOrUsername);
    }

    @Post("reset-password")
    @ApiOkResponse({ type: Object })
    async resetPassword(@Body() body: { token: string, newPassword: string }): Promise<any> {
        return this.authService.resetPassword(body.token, body.newPassword);
    }
}
