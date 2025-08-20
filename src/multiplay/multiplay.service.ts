import { Injectable } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

interface RoomInfo {
  hostSocketId: string;
  followers: Set<string>;
}

@Injectable()
export class MultiplayService {
  private rooms: Map<string, RoomInfo> = new Map();
  private socketToRoom: Map<string, string> = new Map(); // For cleanup on disconnect

  constructor() {}

  createOrJoinRoom(roomId: string, role: 'host' | 'follower', client: Socket): string {
    const socketId = client.id;

    if (role === 'host') {
      // Host creating the room
      if (this.rooms.has(roomId)) {
        return 'Room already exists';
      }

      this.rooms.set(roomId, {
        hostSocketId: socketId,
        followers: new Set(),
      });

    } else {
      // Follower joining
      const room = this.rooms.get(roomId);
      if (!room) {
        return 'Room not found';
      }

      room.followers.add(socketId);
    }

    client.join(roomId);
    this.socketToRoom.set(socketId, roomId);

    return 'joined';
  }

  forwardEvent(roomId: string, senderId: string, data: any, server: Server) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Only host is allowed to forward events
    if (room.hostSocketId !== senderId) return;

    // Forward to all followers
    room.followers.forEach(followerId => {
      server.to(followerId).emit('sync_event', data);
    });
  }

  handleDisconnect(client: Socket, server: Server) {
    const socketId = client.id;
    const roomId = this.socketToRoom.get(socketId);

    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.hostSocketId === socketId) {
      // Host disconnected — destroy the room
      room.followers.forEach(followerId => {
        server.to(followerId).emit('room_closed');
      });

      this.rooms.delete(roomId);
    } else {
      // Follower disconnected
      room.followers.delete(socketId);
    }

    this.socketToRoom.delete(socketId);
  }
}

