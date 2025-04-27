import { Song } from 'src/songs/entities/song.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';


@Entity('playlists')
export class Playlist {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({nullable : true})
  updatedAt : Date;

  @ManyToMany(() => Song, (song) => song.playlists ,{onDelete: 'CASCADE'})
  @JoinTable() // This decorator is required on one side of the many-to-many relationship
  songs: Song[] ;

  @ManyToOne(() => User, (user) => user.playlists)
  @JoinColumn({ name: 'user_id' })
  user: User;
}