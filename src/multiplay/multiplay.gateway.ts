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

@WebSocketGateway({ cors: true })
export class MultiplayGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly multiplayService: MultiplayService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.multiplayService.handleDisconnect(client, this.server);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(@MessageBody() data: any,@ConnectedSocket() client: Socket) {
    const { roomId, role } = data;
    const result = this.multiplayService.createOrJoinRoom(roomId, role, client);
    client.emit('join_status', { message: result });
  }

  @SubscribeMessage('playback_event')
  handlePlaybackEvent(@MessageBody() data: any,@ConnectedSocket() client: Socket) {
    const { roomId } = data;
    this.multiplayService.forwardEvent(roomId, client.id, data, this.server);
  }
}
