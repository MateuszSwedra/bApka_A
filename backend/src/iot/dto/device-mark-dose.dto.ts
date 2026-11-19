import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DeviceMarkDoseDto {
  @ApiProperty({ enum: ['TAKEN', 'MISSED'] })
  @IsIn(['TAKEN', 'MISSED'])
  status!: 'TAKEN' | 'MISSED';

  @ApiPropertyOptional({
    description: 'Idempotencja offline queue (unikalne per urządzenie)',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  clientEventId?: string;
}
