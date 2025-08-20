import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSongDto } from './dto/update-song.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from './entities/song.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as mm from 'music-metadata';

@Injectable()
export class SongsService {
  constructor(
    
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
  ) {}

  async create(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Validate MIME type (optional)
    if (!file.mimetype.match(/audio\/mpeg|mp3/)) {
      throw new BadRequestException('Only MP3 files are allowed');
    }

    // Generate safe filename and paths
    const uploadDir = path.join(process.cwd(), 'uploads', 'songs');

    const filenaming :string = this.filtername(file.filename);
    const safeFileName =  filenaming;
    const newFilePath = path.join(uploadDir, safeFileName);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

     // 🔥 Extract metadata (especially duration)
    const metadata = await mm.parseFile(file.path);
    const duration = metadata.format.duration; // in seconds (float)

    // Save to database
    const song = new Song();
    song.name = file.originalname;  // Remove extension
    song.artist = 'Unknown Artist';
    song.filePath = file.path;
    song.audioURL = this.generateURL(filenaming);
    song.duration = this.formatDuration(duration)

    // Set default cover image (if needed)
    const defaultCoverPath = path.join(process.cwd(), 'upload/cover.jpg');
    song.coverImgURL = fs.existsSync(defaultCoverPath)? `http://localhost:3000/upload/cover.jpg`: null;

    await this.songRepository.save(song);
    return song;
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  generateURL(fileName: string): string {
    const baseUrl = 'http://localhost:3000';
    // const safeFileName = encodeURIComponent(fileName.trim());
    return `${baseUrl}/uploads/songs/${fileName}`;
  }

  filtername(name: string): string {
    let result = '';  // Initialize an empty string to build the result
    for (let i = 0; i < name.length; i++) {
        if (name[i] === ' ') {
            result += '%20';  // Replace space with hyphen
        } else {
            result += name[i];  // Keep original character
        }
    }
    return result;  // Return the modified string
}

  renameToMp3(filePath: string): string { 
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const newFilePath = path.join(dir, `${baseName}.mp3`);
  
    fs.renameSync(filePath, newFilePath);
    return newFilePath;
  }

  findAll() {
    return this.songRepository.find({relations: ['playlists', 'user'] });
  }

  findById(id: number) {
    const song = this.songRepository.findOne({ where: { id } ,relations: ['playlists', 'user']  });
    if (!song) { 
      throw new BadRequestException('Song not found');
    }
    return song;
  }

  findByName(name: string) {
    const song = this.songRepository.findOne({ where: { name },relations: ['playlists', 'user']  });
    if (!song) { 
      throw new BadRequestException('Song not found');
    }
    return song;
  }

  async update(id: number, updateSongDto: UpdateSongDto) {
    // 1. Find the song (with await)
    const song = await this.songRepository.findOne({ where: { id }, relations: ['playlists', 'user'] }, );
    
    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }
  
    // 2. Update only provided fields
    if (updateSongDto.name !== undefined) {
      song.name = updateSongDto.name;
    }
  
    if (updateSongDto.artist !== undefined) {
      song.artist = updateSongDto.artist;
    }
  
    const currentTime = new Date();
    song.updatedAt = currentTime 

    // 3. Save changes to database
    return await this.songRepository.save(song);
  }

  async removeById(id: number) {
    const song = await this.songRepository.findOne({ where: { id }});

    if (!song) {
      throw new Error('Song not found');
    }

    if (song.audioURL) {
      const filePath = path.join(__dirname, '..', 'uploads', path.basename(song.audioURL));
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (err) {
        console.error(`Error deleting file: ${filePath}`, err);
      }
    }

    await this.songRepository.remove(song);
  }
}