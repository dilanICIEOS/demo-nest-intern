import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT), // IMPORTANT
          password: process.env.REDIS_PASSWORD,
        };
      },
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
