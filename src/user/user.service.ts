import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Song } from 'src/songs/entities/song.entity';
import { validateEmailFlow } from './validate-email';


@Injectable()

export class UserService {

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,

    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,

  ) { }

  async create(createUserDto: CreateUserDto) {

    // const validEmail = await validateEmailFlow(createUserDto.email, this.userRepository);

    const user = new User()
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    if(createUserDto.googleId) user.googleId = createUserDto.googleId;
    if(createUserDto.profilePic) user.profilePic = createUserDto.profilePic;
    // user.isGoogleUser = createUserDto.isGoogleUser;
    user.name = createUserDto.name;
    user.email = createUserDto.email;
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return user;
  }

  async updateRefreshToken(userId: number, refreshToken: string) {
    await this.userRepository.update(userId, { refreshToken });
  }
  findAll() {
    return this.userRepository.find({
      relations: ['playlists', 'songs']
    }) // This will load both relations;
  }

  findById(id: number) {
    return this.userRepository.findOne({ where: { id }, relations: ['playlists', 'songs'] });
  }

  findByName(name: string) {
    return this.userRepository.findOne({ where: { name }, relations: ['playlists', 'songs'] });
  }

  findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email }, relations: ['playlists', 'songs'] });
  }




  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['playlists', 'playlists.songs', 'songs', 'songs.playlists'] });
    if (!user) {
      throw new BadRequestException(`user with ${id} not found`);
    }

    // Only update name if it's provided
    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    // Only hash and update password if it's provided
    if (updateUserDto.password) {
      const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
      user.password = hashedPassword;
    }

    if (!user.songs) {
      user.songs = [];
    }

    // Add songs
    if (updateUserDto.songToAdd && updateUserDto.songToAdd.length > 0) {
      const songsToAdd = await this.songRepository.findBy({
        id: In(updateUserDto.songToAdd),
      });

      const missingIds = updateUserDto.songToAdd.filter(
        id => !songsToAdd.some(song => song.id === id),
      );

      if (missingIds.length > 0) {
        throw new BadRequestException(`Songs not found: ${missingIds.join(', ')}`);
      }

      const existingSongIds = new Set(user.songs.map(song => song.id));
      const uniqueSongsToAdd = songsToAdd.filter(song => !existingSongIds.has(song.id));
      user.songs.push(...uniqueSongsToAdd);
    }

    // Remove songs
    if (updateUserDto.songToRemove && updateUserDto.songToRemove.length > 0) {
      user.songs = user.songs.filter(
        song => !updateUserDto.songToRemove.includes(song.id),
      );
    }

    // Add playlists
    if (updateUserDto.playlistToAdd && updateUserDto.playlistToAdd.length > 0) {
      const playlistsToAdd = await this.playlistRepository.findBy({
        id: In(updateUserDto.playlistToAdd),
      });

      const missingIds = updateUserDto.playlistToAdd.filter(
        id => !playlistsToAdd.some(playlist => playlist.id === id),
      );

      if (missingIds.length > 0) {
        throw new BadRequestException(`playlists not found: ${missingIds.join(', ')}`);
      }

      const existingplaylistIds = new Set(user.playlists.map(playlist => playlist.id));
      const uniqueplaylistsToAdd = playlistsToAdd.filter(playlist => !existingplaylistIds.has(playlist.id));
      user.playlists.push(...uniqueplaylistsToAdd);
    }

    // Remove playlists
    if (updateUserDto.playlistToRemove && updateUserDto.playlistToRemove.length > 0) {
      user.playlists = user.playlists.filter(
        playlist => !updateUserDto.playlistToRemove.includes(playlist.id),
      );
    }

    const currentTime = new Date();
    user.updatedAt = currentTime;

    return this.userRepository.save(user);
  }

  async getUserSongs(userId: number): Promise<Song[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['songs'], // Load related songs
    });

    if (!user) throw new NotFoundException('User not found');

    return user.songs; // Return the songs related to the user
  }

  async getUserPlaylists(userId: number): Promise<Playlist[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['playlists'], // Load related songs
    });

    if (!user) throw new NotFoundException('User not found');

    return user.playlists; // Return the songs related to the user
  }

  async remove(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    this.userRepository.remove(user);
  }
}
