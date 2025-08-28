// multiplay.service.ts
import { Injectable } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

interface RoomInfo {
  hostSocketId: string;
  followers: Set<string>;
  createdAt: Date;
}

@Injectable()
export class MultiplayService {
  private rooms: Map<string, RoomInfo> = new Map();
  private socketToRoom: Map<string, string> = new Map();

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
        createdAt: new Date(),
      });

      console.log(`Room ${roomId} created by host ${socketId}`);

    } else {
      // Follower joining
      const room = this.rooms.get(roomId);
      if (!room) {
        return 'Room not found';
      }

      room.followers.add(socketId);
      console.log(`Follower ${socketId} joined room ${roomId}`);
    }

    client.join(roomId);
    this.socketToRoom.set(socketId, roomId);

    return 'joined';
  }

  forwardEvent(roomId: string, senderId: string, data: any, server: Server) {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found for forwarding event`);
      return;
    }

    // Only host is allowed to forward events
    if (room.hostSocketId !== senderId) {
      console.log(`Non-host ${senderId} tried to send event to room ${roomId}`);
      return;
    }

    console.log(`Forwarding event from host ${senderId} to ${room.followers.size} followers in room ${roomId}`);

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
      console.log(`Host ${socketId} disconnected, destroying room ${roomId}`);
      
      room.followers.forEach(followerId => {
        server.to(followerId).emit('room_closed', { reason: 'Host disconnected' });
      });

      this.rooms.delete(roomId);
    } else {
      // Follower disconnected
      console.log(`Follower ${socketId} disconnected from room ${roomId}`);
      room.followers.delete(socketId);
    }

    this.socketToRoom.delete(socketId);
  }

  // Helper method to get room info
  getRoomInfo(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      roomId,
      hostSocketId: room.hostSocketId,
      followerCount: room.followers.size,
      createdAt: room.createdAt,
    };
  }

  // Helper method to get all rooms (for debugging)
  getAllRooms() {
    const rooms = [];
    this.rooms.forEach((room, roomId) => {
      rooms.push({
        roomId,
        hostSocketId: room.hostSocketId,
        followerCount: room.followers.size,
        createdAt: room.createdAt,
      });
    });
    return rooms;
  }
}