import { Field, InputType } from "@nestjs/graphql";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

@InputType({
  isAbstract: true,
})
export class StringListFilter {
  @ApiProperty({
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  @Field(() => [String], {
    nullable: true,
  })
  @Type(() => String)
  equals?: string[];

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  @Field(() => String, {
    nullable: true,
  })
  @Type(() => String)
  has?: string;

  @ApiProperty({
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  @Field(() => [String], {
    nullable: true,
  })
  @Type(() => String)
  hasEvery?: string[];

  @ApiProperty({
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  @Field(() => [String], {
    nullable: true,
  })
  @Type(() => String)
  hasSome?: string[];

  @ApiProperty({
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @Field(() => Boolean, {
    nullable: true,
  })
  @Type(() => Boolean)
  isEmpty?: boolean;
}
