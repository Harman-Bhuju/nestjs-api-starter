import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';


@WebSocketGateway({
  cors: {
    origin: process.env.WHITELIST
      ?.split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  },

  namespace: 'messaging',  //ws://localhost:80/messaging
  // Socket.IO normally starts with a transport called HTTP long polling and may upgrade to WebSocket.
  transports: ['websocket'] // so telling to use websocket not http long polling

})
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  private readonly logger = new Logger(MessagingGateway.name)

  // When a client emits an event named message, execute handleMessage()
  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {

    this.logger.log(`Received: ${payload} `)

    return 'Hello world!';
  }

  // OnGatewayInit
  afterInit(server: Server) {
    this.logger.log('WebSocket server initialized');
  }

  // OnGatewayConnection
  handleConnection(client: Socket) {
    // Each client gets its own Socket.IO socket so diff client id 
    this.logger.log(`Client connected: ${client.id}`);
  }

  // OnGatewayDisconnect
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

}

// frontend-> socket.emit('event_name', 'message to server');
// socket.emit('message', 'Hello server');



//           NestJS Application
//                  │
//                  ▼
//       MessagingGateway starts
//                  │
//                  ▼
//            afterInit()
//                  │
//         "Server initialized"
//                  │
//                  ▼
//       Frontend connects
//                  │
//                  ▼
//        handleConnection()
//                  │
//         "Client connected"
//                  │
//                  ▼
//  Client emits "message" event
//                  │
//                  ▼
//        @SubscribeMessage()
//                  │
//                  ▼
//           handleMessage()
//                  │
//                  ▼
//         "Hello world!"
//                  │
//                  ▼
//         Client disconnects
//                  │
//                  ▼
//       handleDisconnect()