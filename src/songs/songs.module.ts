import { Module } from '@nestjs/common';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { User } from 'src/user/entities/user.entity';
import { Song } from './entities/song.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module'; // ✅ Import your Cloudinary module

@Module({
  imports: [
    TypeOrmModule.forFeature([Playlist, Song, User]),
    CloudinaryModule, // ✅ Add Cloudinary module
    // ❌ Remove MulterModule.register - we don't need disk storage anymore
  ],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}