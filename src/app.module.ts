import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { SongsModule } from './songs/songs.module';
import { TypeOrmModule } from '@nestjs/typeorm';
// ❌ Remove ServeStaticModule - we'll use Cloudinary URLs
// import { ServeStaticModule } from '@nestjs/serve-static';
// import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MultiplayModule } from './multiplay/multiplay.module';

@Module({
  imports: [
    // ❌ Remove ServeStaticModule - no more local file serving
    // ServeStaticModule.forRoot({
    //   rootPath: join(__dirname, '..', 'uploads'),
    //   serveRoot: '/uploads',
    // }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    TypeOrmModule.forRoot({
      type: 'postgres', // ✅ Changed from mysql to postgres
      url: process.env.DATABASE_URL, // ✅ Use Supabase connection string
      synchronize: true,
      autoLoadEntities: true,
      logging: true,
      retryAttempts: 3,
      ssl: {
        rejectUnauthorized: false, // ✅ Required for Supabase
      },
    }),
    SongsModule,
    PlaylistsModule,
    UserModule,
    AuthModule,
    MultiplayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}