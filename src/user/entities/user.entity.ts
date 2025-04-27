import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Song } from 'src/songs/entities/song.entity';

@Entity() // ✅ Missing @Entity() decorator added
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({nullable : true})
    refreshToken: string
    
    @Column()
    name: string;
    
    @Column({ unique: true }) // ✅ Ensure unique emails
    email: string;
    
    @Column({nullable : true})
    updatedAt : Date;

    @Column()
    password: string;

    @CreateDateColumn()
    createdAt: Date;
    
    @OneToMany(() => Playlist, playlist => playlist.user)
    playlists: Playlist[];
    
    @OneToMany(() => Song, song => song.user)
    songs: Song[];
}
