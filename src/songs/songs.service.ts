// src/songs/songs.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  PayloadTooLargeException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from './entities/song.entity';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateSongDto } from './dto/update-song.dto';

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  // ✅ Allowed file types
  private readonly ALLOWED_MIME_PATTERNS = [
    /^audio\/.*/,  // Any audio type
    /^video\/.*/   // Any video type (may contain audio)
  ];

  private readonly ALLOWED_MIME_TYPES = [
    'audio/mpeg',
    'audio/x-mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/aac',
    'audio/x-m4a',
    'audio/webm',
    'audio/flac',
    'video/mp4',
    'video/webm',
  ];

  // ✅ Allowed file types


  constructor(
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(file: Express.Multer.File) {
    this.logger.log('='.repeat(60));
    this.logger.log('🎵 Starting song upload process');
    this.logger.log('='.repeat(60));

    // ✅ Step 1: Validate file exists
    if (!file) {
      this.logger.error('❌ No file provided');
      throw new BadRequestException('No file uploaded');
    }

    // ✅ Step 2: Validate file buffer (memory storage)
    if (!file.buffer) {
      this.logger.error('❌ File buffer is missing');
      throw new BadRequestException('Invalid file data - file buffer is empty');
    }

    // ✅ Step 3: Log file details
    this.logger.log(`📝 Original filename: ${file.originalname}`);
    this.logger.log(`📊 File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    this.logger.log(`🎵 MIME type: ${file.mimetype}`);
    this.logger.log(`📦 Buffer size: ${file.buffer.length} bytes`);

    // ✅ Step 4: Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      this.logger.error(
        `❌ File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: ${this.MAX_FILE_SIZE / 1024 / 1024}MB)`,
      );
      throw new PayloadTooLargeException(
        `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (file.size === 0) {
      this.logger.error('❌ File is empty');
      throw new BadRequestException('Cannot upload empty file');
    }

    // ✅ Step 5: Validate MIME type
    const isValidMimeType =
      this.ALLOWED_MIME_PATTERNS.some((pattern) => pattern.test(file.mimetype)) ||
      this.ALLOWED_MIME_TYPES.includes(file.mimetype);

    if (!isValidMimeType) {
      this.logger.error(`❌ Invalid file type: ${file.mimetype}`);
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Only audio files are allowed.`,
      );
    }

    this.logger.log('✅ File validation passed');

    let cloudinaryResult = null;

    try {
      // ✅ Step 6: Upload to Cloudinary
      this.logger.log('-'.repeat(60));
      this.logger.log('☁️  Uploading to Cloudinary...');

      const uploadStartTime = Date.now();
      cloudinaryResult = await this.cloudinaryService.uploadAudio(file);
      const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(2);

      // ✅ Validate Cloudinary response
      if (!cloudinaryResult) {
        throw new Error('Cloudinary returned null response');
      }

      if (!cloudinaryResult.secure_url) {
        throw new Error('Cloudinary response missing secure_url');
      }

      if (!cloudinaryResult.public_id) {
        throw new Error('Cloudinary response missing public_id');
      }

      this.logger.log(`✅ Cloudinary upload successful (took ${uploadDuration}s)`);
      this.logger.log(`🔗 URL: ${cloudinaryResult.secure_url}`);
      this.logger.log(`🆔 Public ID: ${cloudinaryResult.public_id}`);
      this.logger.log(`⏱️  Duration: ${cloudinaryResult.duration || 'N/A'} seconds`);
      this.logger.log(`📏 Format: ${cloudinaryResult.format || 'N/A'}`);

      // ✅ Step 7: Create song entity
      this.logger.log('-'.repeat(60));
      this.logger.log('💾 Creating song entity...');

      const song = new Song();
      song.name = this.removeFileExtension(file.originalname);
      song.artist = 'Unknown Artist';
      song.audioURL = cloudinaryResult.secure_url;
      song.cloudinary_public_id = cloudinaryResult.public_id;
      song.duration = this.formatDuration(cloudinaryResult.duration);
      song.coverImgURL = null;

      this.logger.log(`📝 Song name: ${song.name}`);
      this.logger.log(`👤 Artist: ${song.artist}`);
      this.logger.log(`⏱️  Formatted duration: ${song.duration}`);

      // ✅ Step 8: Save to database
      this.logger.log('-'.repeat(60));
      this.logger.log('💾 Saving to database...');

      const dbStartTime = Date.now();
      const savedSong = await this.songRepository.save(song);
      const dbDuration = ((Date.now() - dbStartTime) / 1000).toFixed(2);

      // ✅ Validate database response
      if (!savedSong) {
        throw new Error('Database returned null after save');
      }

      if (!savedSong.id) {
        throw new Error('Database returned song without ID');
      }

      this.logger.log(`✅ Database save successful (took ${dbDuration}s)`);
      this.logger.log(`🆔 Song ID: ${savedSong.id}`);

      // ✅ Step 9: Success!
      this.logger.log('='.repeat(60));
      this.logger.log('🎉 Upload completed successfully!');
      this.logger.log(`✅ Song: ${savedSong.name}`);
      this.logger.log(`✅ ID: ${savedSong.id}`);
      this.logger.log(`✅ URL: ${savedSong.audioURL}`);
      this.logger.log('='.repeat(60));

      return savedSong;

    } catch (error) {
      this.logger.error('='.repeat(60));
      this.logger.error('❌ Upload process failed!');
      this.logger.error(`📝 File: ${file.originalname}`);
      this.logger.error(`⚠️  Error type: ${error.name}`);
      this.logger.error(`💬 Error message: ${error.message}`);

      if (error.stack) {
        this.logger.error(`📚 Stack trace:`);
        this.logger.error(error.stack);
      }

      // ✅ Rollback: Delete from Cloudinary if DB save failed
      if (cloudinaryResult?.public_id) {
        this.logger.warn('-'.repeat(60));
        this.logger.warn('⚠️  Rolling back: Deleting file from Cloudinary...');
        try {
          await this.cloudinaryService.deleteAudio(cloudinaryResult.public_id);
          this.logger.log('✅ Cloudinary rollback successful');
        } catch (rollbackError) {
          this.logger.error('❌ Failed to rollback Cloudinary upload:');
          this.logger.error(rollbackError.message);
        }
      }

      this.logger.error('='.repeat(60));

      // ✅ Categorize and throw appropriate error
      if (error.message?.includes('Cloudinary')) {
        throw new BadRequestException(
          `Failed to upload to Cloudinary: ${error.message}`,
        );
      }

      if (error.message?.includes('Database') || error.name === 'QueryFailedError') {
        throw new InternalServerErrorException(
          'Failed to save song to database. Please try again.',
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof PayloadTooLargeException
      ) {
        throw error;
      }

      // ✅ Generic error
      throw new InternalServerErrorException(
        `Failed to upload audio file: ${error.message || 'Unknown error'}`,
      );
    }
  }

  private removeFileExtension(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }

  // ✅ Helper: Format duration with error handling
  private formatDuration(seconds: number | undefined): string {
    if (!seconds || isNaN(seconds) || seconds <= 0) {
      this.logger.warn('⚠️  Invalid or missing duration, defaulting to 0:00');
      return '0:00';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }


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