import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import {Playlist} from './entities/playlist.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Song } from '../songs/entities/song.entity';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,  
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>

  ) {}


  async create(createPlaylistDto: CreatePlaylistDto) {
    const playlist =  new Playlist;
    // playlist.createdAt = new Date(); // Set the createdAt date to now 
    playlist.name = createPlaylistDto.name;
    await this.playlistRepository.save(playlist)

    return playlist;
  }

  findAll() {
    return this.playlistRepository.find({
      relations: ['songs', 'user'] // This will load both relations
    });
  }

  findById(id: number) {
    const playlist = this.playlistRepository.findOne({ where: { id }, relations: ['songs', 'user'] });
    if (!playlist) { 
          throw new BadRequestException('Song not found');
        }
    return playlist;
  }

  findByName(name: string) {
    const playlist = this.playlistRepository.findOne({ where: { name }, relations: ['songs', 'user'] });
    if (!playlist) { 
          throw new BadRequestException('Song not found');
        }
    return playlist;
  }
  

  // removeItem<T>(array: T[], item: T): T[] {
  //   const index = array.indexOf(item);
  //   if (index > -1) array.splice(index, 1);
  //   return array;
  // }

  async update(id: number, updatePlaylistDto: UpdatePlaylistDto) {
    const playlist = await this.playlistRepository.findOne({
      where: { id },
      relations: ['songs'], // Load songs relation
    });
  
    if (!playlist) {
      throw new BadRequestException('Playlist not found');
    }
  
    if (!playlist.songs) {
      playlist.songs = [];
    }
  
    if (updatePlaylistDto.name) {
      playlist.name = updatePlaylistDto.name;
    }
  
    // Add songs
    if (updatePlaylistDto.songIdsToAdd) {
      const songsToAdd = await this.songRepository.findBy({
        id: In(updatePlaylistDto.songIdsToAdd),
      });
  
      const missingIds = updatePlaylistDto.songIdsToAdd.filter(
        id => !songsToAdd.some(song => song.id === id),
      );
  
      if (missingIds.length > 0) {
        throw new BadRequestException(`Songs not found: ${missingIds.join(', ')}`);
      }
  
      const existingSongIds = new Set(playlist.songs.map(song => song.id));
      const uniqueSongsToAdd = songsToAdd.filter(song => !existingSongIds.has(song.id));
      playlist.songs.push(...uniqueSongsToAdd);
    }
  
    // Remove songs
    if (updatePlaylistDto.songIdsToRemove) {
      playlist.songs = playlist.songs.filter(
        song => !updatePlaylistDto.songIdsToRemove.includes(song.id),
      );
    }
  
    const currentTime = new Date();
    playlist.updatedAt = currentTime 

    return await this.playlistRepository.save(playlist);
  }
  


  async remove(id: number) {
    const playlist = await this.playlistRepository.findOne({ where: { id }});

    if (!playlist) {
      throw new Error('playlist not found');
    }
    await this.playlistRepository.remove(playlist);
  }
}
