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
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const user = new User();
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    if (createUserDto.googleId) user.googleId = createUserDto.googleId;
    if (createUserDto.profilePic) user.profilePic = createUserDto.profilePic;

    user.name = createUserDto.name;
    user.email = createUserDto.email;
    user.password = hashedPassword;
    user.playlists = [];

    // ✅ Try to find the song from DB first
    const defaultSong = await this.songRepository.findOne({ where: { id: 1 } });

    if (defaultSong) {
      // If song exists in DB, use it directly
      user.songs = [defaultSong];
    } else {
      // Otherwise, inject plain object version
      user.songs = [
      {
        id: 2,
        name: "Bye Bye Bye (Deadpool 3 Soundtrack)",
        audioURL: "https://res.cloudinary.com/dxkalcupm/video/upload/v1760184239/remaudio/songs/file_n70wnh.mp3",
        cloudinary_public_id: "remaudio/songs/file_n70wnh",
        artist: "Unknown Artist",
        createdAt: new Date("2025-10-11T06:34:12.579Z"),
        updatedAt: new Date("2025-10-11T06:34:12.982Z"),
        coverImgURL: null,
        duration: "3:20",
        playlists: [],
        user: null, // ✅ avoid circular reference
      } as any,
      ];
      console.warn('⚠️ Default song with id 1 not found in database — using static fallback');
    }

    // ✅ Save to DB
    return await this.userRepository.save(user);
  }
  async updateRefreshToken(userId: number, refreshToken: string) {
    await this.userRepository.update(userId, { refreshToken });
  }

  // ✅ FIXED: Removed relations
  findAll() {
    return this.userRepository.find(); // ✅ No relations loaded
  }

  // ✅ FIXED: Removed relations
  findById(id: number) {
    return this.userRepository.findOne({ where: { id } }); // ✅ No relations
  }

  // ✅ FIXED: Removed relations
  findByName(name: string) {
    return this.userRepository.findOne({ where: { name } }); // ✅ No relations
  }

  // ✅ FIXED: Removed relations - THIS IS THE CRITICAL ONE FOR AUTH!
  findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } }); // ✅ No relations
  }

  // ✅ KEPT: This NEEDS relations because you're updating songs/playlists
  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['playlists', 'playlists.songs', 'songs', 'songs.playlists'] // ✅ Keep - needed for update logic
    });

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

  // ✅ KEPT: These NEED relations because they're specifically fetching songs/playlists
  async getUserSongs(userId: number): Promise<Song[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['songs'], // ✅ Keep - this endpoint is specifically for getting songs
    });

    if (!user) throw new NotFoundException('User not found');

    return user.songs;
  }

  async getUserPlaylists(userId: number): Promise<Playlist[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['playlists'], // ✅ Keep - this endpoint is specifically for getting playlists
    });

    if (!user) throw new NotFoundException('User not found');

    return user.playlists;
  }

  async remove(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    this.userRepository.remove(user);
  }
}