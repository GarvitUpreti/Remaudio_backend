import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('songs')
export class Song {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  audioURL: string; // ✅ This will be Cloudinary URL

  @Column({ nullable: true })
  cloudinary_public_id: string; // ✅ Add this for Cloudinary deletion

  @Column({ nullable: true })
  artist: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn() // ✅ Change to UpdateDateColumn for automatic updates
  updatedAt: Date;

  @Column({ nullable: true })
  coverImgURL: string;

  // ❌ Remove filePath - no more local files
  // @Column()
  // filePath: string;

  @Column({ nullable: true })
  duration: string;

  @ManyToMany(() => Playlist, (playlist) => playlist.songs)
  playlists: Playlist[];
  
  @ManyToOne(() => User, (user) => user.songs, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}