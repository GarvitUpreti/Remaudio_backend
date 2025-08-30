// multiplay.service.ts
import { Injectable } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

interface RoomInfo {
  hostSocketId: string;
  followers: Set<string>;
  createdAt: Date;
  lastActivity: Date;
}

interface NetworkStats {
  connectionTime: Date;
  lastPingTime: number;
  avgRtt: number;
  rttHistory: number[];
  messageCount: number;
}

@Injectable()
export class MultiplayService {
  private rooms: Map<string, RoomInfo> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private networkStats: Map<string, NetworkStats> = new Map(); // ⭐ NEW

  constructor() {
    // Clean up inactive rooms every 5 minutes
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000);
  }

  // ⭐ NEW: Track connection for network analysis
  trackConnection(socketId: string) {
    this.networkStats.set(socketId, {
      connectionTime: new Date(),
      lastPingTime: 0,
      avgRtt: 0,
      rttHistory: [],
      messageCount: 0
    });
  }

  // ⭐ NEW: Update network statistics
  updateNetworkStats(socketId: string, clientTimestamp: number) {
    const stats = this.networkStats.get(socketId);
    if (!stats) return;

    const now = Date.now();
    stats.lastPingTime = now;
    stats.messageCount++;
    
    // Don't calculate RTT here - that's done on client side
    // This is just for server-side monitoring
  }

  // ⭐ NEW: Get network statistics
  getNetworkStats(socketId: string): NetworkStats | null {
    return this.networkStats.get(socketId) || null;
  }

  createOrJoinRoom(roomId: string, role: 'host' | 'follower', client: Socket): string {
    const socketId = client.id;

    if (role === 'host') {
      // Host creating the room
      if (this.rooms.has(roomId)) {
        return 'Room already exists with different host';
      }

      this.rooms.set(roomId, {
        hostSocketId: socketId,
        followers: new Set(),
        createdAt: new Date(),
        lastActivity: new Date(),
      });

      console.log(`✅ Room ${roomId} created by host ${socketId}`);

    } else {
      // Follower joining
      const room = this.rooms.get(roomId);
      if (!room) {
        return 'Room not found - check room ID or wait for host to create it';
      }

      // Check room capacity (optional)
      if (room.followers.size >= 10) { // Max 10 followers per room
        return 'Room is full - maximum 10 followers allowed';
      }

      room.followers.add(socketId);
      room.lastActivity = new Date();
      console.log(`✅ Follower ${socketId} joined room ${roomId} (${room.followers.size} total followers)`);
    }

    client.join(roomId);
    this.socketToRoom.set(socketId, roomId);

    return 'joined';
  }

  forwardEvent(roomId: string, senderId: string, data: any, server: Server): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`❌ Room ${roomId} not found for forwarding event`);
      return false;
    }

    // Only host is allowed to forward events
    if (room.hostSocketId !== senderId) {
      console.log(`❌ Non-host ${senderId} tried to send event to room ${roomId}`);
      return false;
    }

    // Update room activity
    room.lastActivity = new Date();

    console.log(`📤 Forwarding event [${data.action}] from host ${senderId} to ${room.followers.size} followers in room ${roomId}`);

    // Forward to all followers with high-precision timestamp
    const forwardTimestamp = Date.now();
    room.followers.forEach(followerId => {
      server.to(followerId).emit('sync_event', {
        ...data,
        serverForwardTime: forwardTimestamp
      });
    });

    return true;
  }

  handleDisconnect(client: Socket, server: Server) {
    const socketId = client.id;
    const roomId = this.socketToRoom.get(socketId);

    // Clean up network stats
    this.networkStats.delete(socketId);

    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.hostSocketId === socketId) {
      // Host disconnected — destroy the room
      console.log(`💥 Host ${socketId} disconnected, destroying room ${roomId}`);
      
      room.followers.forEach(followerId => {
        server.to(followerId).emit('room_closed', { 
          reason: 'Host disconnected',
          timestamp: Date.now()
        });
      });

      // Clean up all followers from tracking
      room.followers.forEach(followerId => {
        this.socketToRoom.delete(followerId);
        this.networkStats.delete(followerId);
      });

      this.rooms.delete(roomId);
    } else {
      // Follower disconnected
      console.log(`👋 Follower ${socketId} disconnected from room ${roomId}`);
      room.followers.delete(socketId);
    }

    this.socketToRoom.delete(socketId);
  }

  // ⭐ NEW: Clean up inactive rooms
  private cleanupInactiveRooms() {
    const now = new Date();
    const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    this.rooms.forEach((room, roomId) => {
      if (now.getTime() - room.lastActivity.getTime() > INACTIVE_THRESHOLD) {
        console.log(`🧹 Cleaning up inactive room ${roomId}`);
        this.rooms.delete(roomId);
        
        // Clean up associated sockets
        this.socketToRoom.forEach((mappedRoomId, socketId) => {
          if (mappedRoomId === roomId) {
            this.socketToRoom.delete(socketId);
            this.networkStats.delete(socketId);
          }
        });
      }
    });
  }

  // Enhanced room info with more details
  getRoomInfo(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      roomId,
      hostSocketId: room.hostSocketId,
      followerCount: room.followers.size,
      maxFollowers: 10,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
      isActive: true
    };
  }

  // Get server statistics for monitoring
  getServerStats() {
    return {
      totalRooms: this.rooms.size,
      totalConnections: this.socketToRoom.size,
      rooms: Array.from(this.rooms.entries()).map(([roomId, room]) => ({
        roomId,
        followers: room.followers.size,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity
      }))
    };
  }
}