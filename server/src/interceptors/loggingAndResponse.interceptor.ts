import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class LoggingAndResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();

    const start = Date.now();

    console.log('Incoming Request:', {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        console.log(`Request completed in ${duration}ms`);
      }),

      map((data) => ({
        success: true,
        data,
      })),
    );
  }
}
