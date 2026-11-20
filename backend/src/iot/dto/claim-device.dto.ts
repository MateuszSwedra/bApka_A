import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ClaimDeviceDto {
  @ApiProperty({ description: 'Jednorazowy claim token z prepare' })
  @IsString()
  @MinLength(6)
  claimToken!: string;

  @ApiPropertyOptional({ description: 'Opcjonalnie publicId z SoftAP' })
  @IsOptional()
  @IsString()
  publicId?: string;
}
