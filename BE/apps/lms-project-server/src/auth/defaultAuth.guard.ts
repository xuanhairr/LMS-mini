import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class DefaultAuthGuard extends AuthGuard("jwt") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('--- DefaultAuthGuard: canActivate Start ---');
    const request = context.switchToHttp().getRequest();
    console.log('DefaultAuthGuard Request Headers:', request.headers);
    try {
      const result = await super.canActivate(context);
      console.log('DefaultAuthGuard: canActivate Success, result:', result);
      console.log('DefaultAuthGuard: User on request after super.canActivate:', (request as any).user);
      return result as boolean;
    } catch (err: any) {
      console.error('DefaultAuthGuard: canActivate Error:', err.message || err);
      throw err;
    }
  }
}
