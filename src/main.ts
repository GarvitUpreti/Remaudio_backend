import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Enable WebSocket support
  app.useWebSocketAdapter(new IoAdapter(app));

  // ✅ Improved CORS setup using NestJS built-in method
  app.enableCors({
    origin: [
      'http://localhost:5173', // Development frontend
      'http://localhost:3000', // Development backend
      process.env.FRONTEND_URL || 'http://localhost:4200', // Production frontend
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // Important for authentication
  });

  // ✅ Request logging middleware (optional - can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
  }

  // ✅ Payload limits for file uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // ❌ Remove static files setup - we're using Cloudinary now!
  // app.useStaticAssets(join(__dirname, '..', 'uploads'), {
  //   prefix: '/uploads',
  // });

  // ✅ Dynamic port for cloud deployment
  const port = process.env.PORT || 3000;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

  await app.listen(port, host);
  
  console.log(`🚀 Server running on ${host}:${port}`);
  console.log(`🔌 WebSocket server also running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`☁️ Using Cloudinary for file storage`);
  }
}

bootstrap();