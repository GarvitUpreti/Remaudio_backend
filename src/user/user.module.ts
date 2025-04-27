import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity'; // Ensure the path is correct
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Song } from 'src/songs/entities/song.entity';

@Module({
  controllers: [UserController],
  providers: [UserService ],
  exports: [UserService], // Export UserService if needed in other modules
  imports: [TypeOrmModule.forFeature([User,Playlist, Song]),]

})
export class UserModule {}
