// multiplay.gateway.ts
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
    origin: ["http://localhost:5173", "http://localhost:3000"], // ✅ Add both origins
    methods: ["GET", "POST"],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'], // ✅ Support both transports
})
export class MultiplayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly multiplayService: MultiplayService) {}

  handleConnection(client: Socket) {
    console.log(`✅ Client connected: ${client.id}`);
    
    // Send connection confirmation
    client.emit('connection_status', { 
      connected: true, 
      socketId: client.id,
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
    this.multiplayService.handleDisconnect(client, this.server);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log(`🚪 Join room request from ${client.id}:`, data);
    
    const { roomId, role } = data;
    
    if (!roomId || !role) {
      client.emit('join_status', { message: 'Invalid room data' });
      return;
    }

    const result = this.multiplayService.createOrJoinRoom(roomId, role, client);
    client.emit('join_status', { 
      message: result, 
      roomId, 
      role,
      success: result === 'joined'
    });
    
    console.log(`📝 Join result for ${client.id}: ${result}`);
  }

  @SubscribeMessage('playback_event')
  handlePlaybackEvent(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log(`🎵 Playback event from ${client.id} for room ${data.roomId}`);
    
    const { roomId } = data;
    
    if (!roomId) {
      console.log('⚠️ Playback event missing roomId');
      return;
    }

    this.multiplayService.forwardEvent(roomId, client.id, data, this.server);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log(`🚪 Leave room request from ${client.id}:`, data);
    
    const { roomId } = data;
    if (roomId) {
      client.leave(roomId);
    }
    
    this.multiplayService.handleDisconnect(client, this.server);
    client.emit('leave_status', { message: 'Left room successfully' });
  }
}