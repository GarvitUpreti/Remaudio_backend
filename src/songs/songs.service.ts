import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSongDto } from './dto/update-song.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from './entities/song.entity';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../cloudinary/cloudinary.service'; // ✅ Import Cloudinary service

@Injectable()
export class SongsService {
  constructor(
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService, // ✅ Inject Cloudinary service
  ) { }

  async create(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    console.log('Starting Cloudinary upload for:', file.originalname);
    
    try {
      // ✅ Upload to Cloudinary
      const cloudinaryResult = await this.cloudinaryService.uploadAudio(file);
      console.log('Cloudinary upload successful:', cloudinaryResult.secure_url);

      // ✅ Save to database with Cloudinary data
      const song = new Song();
      song.name = this.removeFileExtension(file.originalname);
      song.artist = 'Unknown Artist';
      song.audioURL = cloudinaryResult.secure_url; // ✅ Cloudinary URL
      song.cloudinary_public_id = cloudinaryResult.public_id; // ✅ For deletion
      song.duration = this.formatDuration(cloudinaryResult.duration || 0);
      
      // ❌ Remove filePath - we don't store local files anymore
      // song.filePath = file.path;

      // Set default cover image (optional)
      song.coverImgURL = null;

      const savedSong = await this.songRepository.save(song);
      console.log('Song saved to database:', savedSong.name);
      return savedSong;

    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new BadRequestException('Failed to upload audio file');
    }
  }

  // ✅ Helper to remove file extension
  removeFileExtension(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ❌ Remove these methods - no longer needed
  // generateURL(fileName: string): string { ... }
  // filtername(name: string): string { ... }
  // renameToMp3(filePath: string): string { ... }

  findAll() {
    return this.songRepository.find({ relations: ['playlists', 'user'] });
  }

  findByUserID(Uid: number) {
    return this.songRepository.find({ where: { user: { id: Uid } }, relations: ['playlists', 'user'] });
  }

  async findById(id: number) {
    const song = await this.songRepository.findOne({ where: { id }, relations: ['playlists', 'user'] });
    if (!song) {
      throw new BadRequestException('Song not found');
    }
    return song;
  }

  async findByName(name: string) {
    const song = await this.songRepository.findOne({ where: { name }, relations: ['playlists', 'user'] });
    if (!song) {
      throw new BadRequestException('Song not found');
    }
    return song;
  }

  async update(id: number, updateSongDto: UpdateSongDto) {
    const song = await this.songRepository.findOne({ where: { id }, relations: ['playlists', 'user'] });

    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    if (updateSongDto.name !== undefined) {
      song.name = updateSongDto.name;
    }

    if (updateSongDto.artist !== undefined) {
      song.artist = updateSongDto.artist;
    }

    song.updatedAt = new Date();
    return await this.songRepository.save(song);
  }

  async removeById(id: number) {
    const song = await this.songRepository.findOne({ where: { id } });

    if (!song) {
      throw new Error('Song not found');
    }

    // ✅ Delete from Cloudinary
    if (song.cloudinary_public_id) {
      try {
        await this.cloudinaryService.deleteAudio(song.cloudinary_public_id);
        console.log(`Successfully deleted from Cloudinary: ${song.cloudinary_public_id}`);
      } catch (err) {
        console.error(`Error deleting from Cloudinary:`, err);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // ❌ Remove all local file deletion logic - no more local files
    // if (song.filePath) { ... }

    // ✅ Remove from database
    await this.songRepository.remove(song);
    console.log(`Song deleted: ${song.name}`);
  }
}