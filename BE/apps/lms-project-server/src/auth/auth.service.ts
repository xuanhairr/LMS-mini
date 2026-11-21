import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import { LoginCredentials } from "./LoginCredentials";
import { UserInfo } from "./UserInfo";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService
    ) { }

    async validateUser(username: string, pass: string): Promise<any> {
        const user = await this.userService.findByUsernameOrEmail(username);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return user;
        }
        throw new UnauthorizedException("Sai tài khoản hoặc mật khẩu");
    }

    async login(credentials: LoginCredentials): Promise<UserInfo> {
        const user = await this.validateUser(
            credentials.username,
            credentials.password
        );

        const isAdmin = user.roles.includes("ADMIN");

        // Nếu không phải ADMIN và chưa xác thực email (lần đăng nhập đầu tiên)
        if (!isAdmin && !user.isEmailVerified) {
            if (!user.email) {
                throw new BadRequestException("Tài khoản chưa được thiết lập email để xác nhận.");
            }

            // Tạo mã 6 chữ số
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            // Cập nhật vào user
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationCode: code,
                    verificationCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 phút
                }
            });

            // Gửi email
            await this.emailService.sendVerificationCode(user.email, user.fullName || user.username, code);

            return {
                id: user.id,
                username: user.username,
                roles: user.roles,
                forcePasswordChange: user.forcePasswordChange,
                needsVerification: true,
                email: user.email,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
            };
        }

        const accessToken = this.jwtService.sign({
            id: user.id,
            username: user.username,
            roles: user.roles,
            forcePasswordChange: user.forcePasswordChange,
        });

        return {
            id: user.id,
            username: user.username,
            roles: user.roles,
            forcePasswordChange: user.forcePasswordChange,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            accessToken,
        };
    }

    async verifyEmail(userId: string, code: string): Promise<UserInfo> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException("Không tìm thấy người dùng");
        }

        if (user.isEmailVerified) {
            throw new BadRequestException("Email đã được xác nhận");
        }

        if (!user.verificationCode || user.verificationCode !== code) {
            throw new BadRequestException("Mã xác nhận không đúng");
        }

        if (user.verificationCodeExpiresAt && user.verificationCodeExpiresAt < new Date()) {
            throw new BadRequestException("Mã xác nhận đã hết hạn");
        }

        // Đánh dấu đã xác nhận
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                verificationCode: null,
                verificationCodeExpiresAt: null,
            }
        });

        const accessToken = this.jwtService.sign({
            id: user.id,
            username: user.username,
            roles: user.roles,
            forcePasswordChange: user.forcePasswordChange,
        });

        return {
            id: user.id,
            username: user.username,
            roles: user.roles,
            forcePasswordChange: user.forcePasswordChange,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            accessToken,
        };
    }

    async forgotPassword(emailOrUsername: string): Promise<{ success: boolean; email?: string }> {
        const user = await this.userService.findByUsernameOrEmail(emailOrUsername);
        if (!user) {
            // Không văng lỗi để tránh dò tìm tài khoản
            return { success: true };
        }

        if (!user.email) {
            throw new BadRequestException("Tài khoản chưa được thiết lập email.");
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode: code,
                verificationCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 phút
            }
        });

        // Gửi email chứa OTP
        await this.emailService.sendPasswordResetCode(user.email, user.fullName || user.username, code);

        return { 
            success: true, 
            email: user.email 
        };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        if (!token || typeof token !== 'string') {
            throw new BadRequestException("Mã xác nhận không hợp lệ.");
        }
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            throw new BadRequestException("Mật khẩu mới không hợp lệ.");
        }

        const user = await this.prisma.user.findFirst({
            where: {
                verificationCode: token,
                verificationCodeExpiresAt: {
                    gt: new Date()
                }
            }
        });

        if (!user) {
            throw new BadRequestException("Mã xác nhận không hợp lệ hoặc đã hết hạn.");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                verificationCode: null,
                verificationCodeExpiresAt: null,
                forcePasswordChange: false
            }
        });

        return { success: true, message: "Đổi mật khẩu thành công" };
    }
}
