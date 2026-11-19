import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DeviceMoodDto {
  @ApiProperty({ enum: ['happy', 'neutral', 'sad'] })
  @IsIn(['happy', 'neutral', 'sad'])
  mood!: 'happy' | 'neutral' | 'sad';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  clientEventId?: string;
}
