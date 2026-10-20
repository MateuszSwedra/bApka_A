import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class MarkDoseDto {
  @ApiProperty({ enum: ['TAKEN', 'MISSED'] })
  @IsIn(['TAKEN', 'MISSED'])
  status!: 'TAKEN' | 'MISSED';
}
