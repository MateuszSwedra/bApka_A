import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inventoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  medication?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dosage?: string;

  @ApiProperty({ example: '08:30' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'time must be HH:mm' })
  time!: string;

  @ApiPropertyOptional({ example: 'DAILY' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  daysOfWeek?: number[];
}
