import { Module } from '@nestjs/common';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { User } from 'src/user/entities/user.entity';
import { Song } from 'src/songs/entities/song.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploadedSongs';
          
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      // Add this fileFilter configuration:
      fileFilter: (req, file, cb) => {
        console.log('Incoming file type:', file.mimetype); // Debug log
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true); // Accept file
        } else {
          console.log('Rejected file:', file.originalname);
          cb(new Error('INVALID_FILE_TYPE'), false); // Reject file
        }
      },
      // Add size limits too:
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1 // Only 1 file per upload
      }
    }),
    TypeOrmModule.forFeature([Playlist, Song, User]),
  ],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}