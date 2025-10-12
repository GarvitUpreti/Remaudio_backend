import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Song } from 'src/songs/entities/song.entity';

@Entity() // ✅ Missing @Entity() decorator added
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    refreshToken: string

    @Column()
    name: string;

    @Column({ unique: true }) // ✅ Ensure unique emails
    email: string;

    @Column({ default: false })
    isEmailVerified: boolean;  // Field to track email verification status

    @Column({ nullable: true })
    updatedAt: Date;

    @Column()
    password: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ nullable: true })
    googleId: string;

    @Column({ default: false })
    isGoogleUser: boolean;

    @Column({ nullable: true })
    profilePic: string = "D:\remaudio v2\remaudio\src\default_user.png";

    @OneToMany(() => Playlist, playlist => playlist.user,{
        cascade: ['remove'], // Add cascade remove
        onDelete: 'CASCADE'  // Add onDelete CASCADE
    })
    playlists: Playlist[];

    @OneToMany(() => Song, song => song.user, {
        cascade: ['remove'], // Add cascade remove
        onDelete: 'CASCADE'  // Add onDelete CASCADE
    })
    songs: Song[];
}