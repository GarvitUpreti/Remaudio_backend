// multiplay.gateway.ts - Fix the BigInt serialization issue
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MultiplayService } from './multiplay.service';

@WebSocketGateway({ 
  cors: {
    origin: ['http://localhost:5173', // Development
      process.env.FRONTEND_URL], // ✅ Add your IP
    methods: ["GET", "POST"],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class MultiplayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly multiplayService: MultiplayService) {}

  handleConnection(client: Socket) {
    console.log(`✅ Client connected: ${client.id}`);
    
    // Track connection time for network quality analysis
    this.multiplayService.trackConnection(client.id);
    
    // ✅ FIX: Convert BigInt to number to avoid serialization error
    client.emit('connection_status', { 
      connected: true, 
      socketId: client.id,
      timestamp: Date.now(),
      serverTime: Number(process.hrtime.bigint() / BigInt(1000000)) // Convert to milliseconds
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
    this.multiplayService.handleDisconnect(client, this.server);
  }

  // ⭐ RTT Ping Handler - Fixed BigInt issue
  @SubscribeMessage('rtt_ping')
  handleRttPing(@MessageBody() data: { timestamp: number }, @ConnectedSocket() client: Socket) {
    // Immediately respond with the exact timestamp - no processing delay
    client.emit('rtt_pong', { 
      timestamp: data.timestamp,
      serverTime: Date.now() // ✅ Use Date.now() instead of BigInt
    });
    
    // Optional: Track RTT patterns for network quality analysis
    this.multiplayService.updateNetworkStats(client.id, data.timestamp);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log(`🚪 Join room request from ${client.id}:`, data);
    
    const { roomId, role } = data;
    
    if (!roomId || !role) {
      client.emit('join_status', { 
        success: false,
        message: 'Invalid room data - missing roomId or role' 
      });
      return;
    }

    if (!['host', 'follower'].includes(role)) {
      client.emit('join_status', { 
        success: false,
        message: 'Invalid role - must be "host" or "follower"' 
      });
      return;
    }

    const result = this.multiplayService.createOrJoinRoom(roomId, role, client);
    const success = result === 'joined';
    
    client.emit('join_status', { 
      success,
      message: result, 
      roomId, 
      role,
      timestamp: Date.now()
    });
    
    if (success) {
      const roomInfo = this.multiplayService.getRoomInfo(roomId);
      client.emit('room_info', roomInfo);
    }
    
    console.log(`📝 Join result for ${client.id}: ${result}`);
  }

  @SubscribeMessage('playback_event')
  handlePlaybackEvent(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    // ✅ FIX: Use Date.now() instead of BigInt
    const serverReceiveTime = Date.now();
    
    console.log(`🎵 Playback event [${data.action}] from ${client.id} for room ${data.roomId}`);
    
    const { roomId } = data;
    
    if (!roomId) {
      console.log('⚠️ Playback event missing roomId');
      client.emit('playback_error', { message: 'Missing roomId' });
      return;
    }

    // Add server timing data
    const enhancedData = {
      ...data,
      serverReceiveTime, // ✅ Regular number instead of BigInt
      serverForwardTime: Date.now()
    };

    const success = this.multiplayService.forwardEvent(roomId, client.id, enhancedData, this.server);
    
    if (!success) {
      client.emit('playback_error', { 
        message: 'Failed to forward event - check room status and permissions' 
      });
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log(`🚪 Leave room request from ${client.id}:`, data);
    
    const { roomId } = data;
    if (roomId) {
      client.leave(roomId);
    }
    
    this.multiplayService.handleDisconnect(client, this.server);
    client.emit('leave_status', { 
      success: true,
      message: 'Left room successfully',
      timestamp: Date.now()
    });
  }

  @SubscribeMessage('network_check')
  handleNetworkCheck(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const stats = this.multiplayService.getNetworkStats(client.id);
    client.emit('network_stats', stats);
  }

  @SubscribeMessage('room_status')
  handleRoomStatus(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const roomInfo = this.multiplayService.getRoomInfo(data.roomId);
    client.emit('room_status_response', {
      exists: !!roomInfo,
      info: roomInfo
    });
  }
}