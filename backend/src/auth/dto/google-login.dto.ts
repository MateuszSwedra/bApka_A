import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AUTH_GOOGLE_ID_TOKEN_MAX_LENGTH } from '../auth-credentials';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID token' })
  @IsString()
  @MinLength(20)
  @MaxLength(AUTH_GOOGLE_ID_TOKEN_MAX_LENGTH)
  idToken!: string;
}
