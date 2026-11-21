import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpStatus,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<ApiResponse<T>> {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode || HttpStatus.OK;

        return next.handle().pipe(
            map((data) => {
                // Nếu data đã có cấu trúc { data: ..., message: ... } từ controller trả về
                // thì chúng ta giữ nguyên cấu trúc đó và bọc thêm success/statusCode
                return {
                    success: true,
                    statusCode: statusCode,
                    message: data?.message || "Operation successful",
                    data: data?.data !== undefined ? data.data : data,
                };
            })
        );
    }
}
