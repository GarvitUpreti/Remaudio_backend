import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { SongsService } from './songs.service';
// import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import { Public } from 'src/auth/public.decorator';
const execAsync = promisify(exec);

@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) { }

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('audio', {
    storage: diskStorage({
      destination: './uploads/songs',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {

      const allowedPatterns = [
        /^audio\/.*/,  // Any audio type
        /^video\/.*/   // Any video type (may contain audio)
      ];
      const allowedTypes = [
        'audio/mpeg',
        'audio/x-mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/ogg',
        'audio/aac',
        'audio/x-m4a',
        'audio/webm',
        'audio/flac'
      ];
      const isAllowed = allowedPatterns.some(pattern => pattern.test(file.mimetype)) || allowedTypes.includes(file.mimetype);
      if (isAllowed) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Invalid audio file type'), false);
      }
    }
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    console.log(file);
    console.log(file.path);
    return this.songsService.create(file);
  }


  @Get('user/:Uid')
  @Public()
  findByUserID(@Param('Uid') Uid: string) {
    return this.songsService.findByUserID(+Uid);
  }

  @Get()
  @Public()
  findAll() {
    return this.songsService.findAll();
  }

  @Get(':id')
  findByID(@Param('id') id: string) {
    return this.songsService.findById(+id);
  }

  @Get(':name')
  findByName(@Param('name') name: string) {
    return this.songsService.findByName(name);
  }

  @Patch(':id')
  updateById(@Param('id') id: string, @Body() updateSongDto: UpdateSongDto) {
    return this.songsService.update(+id, updateSongDto);
  }

  @Public()
  @Delete(':id')
  removeById(@Param('id') id: string) {
    return this.songsService.removeById(+id);
  }
}
