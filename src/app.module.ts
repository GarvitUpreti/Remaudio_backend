import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { SongsModule } from './songs/songs.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MultiplayModule } from './multiplay/multiplay.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // Path to your uploads folder
      serveRoot: '/uploads', // URL prefix
    }),
    ConfigModule.forRoot({
      isGlobal: true, // this allows it to be available everywhere
    }),
    AuthModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'Life7king',
      database: 'remaudiodb',
      synchronize:true,
      autoLoadEntities: true,
      logging: true,
      retryAttempts: 3,
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
