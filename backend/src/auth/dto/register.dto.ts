import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from '../auth-credentials';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', maxLength: AUTH_EMAIL_MAX_LENGTH })
  @IsString()
  @MinLength(3)
  @MaxLength(AUTH_EMAIL_MAX_LENGTH)
  email!: string;

  @ApiProperty({ minLength: AUTH_PASSWORD_MIN_LENGTH, maxLength: AUTH_PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(AUTH_PASSWORD_MIN_LENGTH)
  @MaxLength(AUTH_PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiPropertyOptional({ enum: ['CARETAKER', 'DEPENDENT', 'HYBRID'] })
  @IsOptional()
  @IsString()
  @IsIn(['CARETAKER', 'DEPENDENT', 'HYBRID'])
  role?: 'CARETAKER' | 'DEPENDENT' | 'HYBRID';
}
