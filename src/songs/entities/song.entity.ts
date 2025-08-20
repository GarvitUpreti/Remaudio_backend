import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('songs') // Optional, you can specify the table name here
export class Song {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  audioURL: string;

  @Column({ nullable: true })
  artist: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({nullable : true})
  updatedAt : Date;

  @Column({ nullable: true })
  coverImgURL: string;

  @Column()
  filePath: string; // Path to the stored file

  @Column({nullable:true})
  duration: string;

  @ManyToMany(() => Playlist, (playlist) => playlist.songs,{onDelete: 'CASCADE'})
  playlists: Playlist[];
  
  @ManyToOne(() => User, (user) => user.songs)
  @JoinColumn({ name: 'user_id' })
  user: User;
}