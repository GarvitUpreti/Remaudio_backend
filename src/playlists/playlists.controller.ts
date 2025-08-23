import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { Public } from 'src/auth/public.decorator';

@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Public()
  @Post()
  create(@Body() createPlaylistDto: CreatePlaylistDto) {
    return this.playlistsService.create(createPlaylistDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.playlistsService.findAll();
  }

  @Get('user/:Uid')
  @Public()
  findByUserID(@Param('Uid') Uid: string) {
    return this.playlistsService.findByUserID(+Uid);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.playlistsService.findById(+id);
  }
  @Get(':name')
  findByName(@Param('id') name: string) {
    return this.playlistsService.findByName(name);
  }
  
  @Public()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlaylistDto: UpdatePlaylistDto) {
    return this.playlistsService.update(+id, updatePlaylistDto);
  }

  @Public()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.playlistsService.remove(+id);
  }
}
