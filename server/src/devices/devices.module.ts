import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
