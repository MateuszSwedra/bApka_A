import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PrepareDeviceDto {
  @ApiPropertyOptional({ example: 'Płytka babci' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
