import { Module } from '@nestjs/common';
import { MultiplayGateway } from './multiplay.gateway';
import { MultiplayService } from './multiplay.service';

@Module({
  providers: [MultiplayGateway, MultiplayService],
})
export class MultiplayModule {}
