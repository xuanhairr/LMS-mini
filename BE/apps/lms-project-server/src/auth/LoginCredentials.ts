import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEmail } from "class-validator";

export class LoginCredentials {
    @ApiProperty()
    @IsString()
    username!: string;

    @ApiProperty()
    @IsString()
    password!: string;
}
