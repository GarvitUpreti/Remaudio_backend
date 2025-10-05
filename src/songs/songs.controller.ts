import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { SongsService } from './songs.service';
import { UpdateSongDto } from './dto/update-song.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/auth/public.decorator';

@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) { }

  @Public()
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { 
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // ✅ Only basic null check - service handles everything else
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // ✅ Delegate everything to service
    return await this.songsService.create(file);
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

  @Public()
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