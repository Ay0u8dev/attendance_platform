declare module 'stompjs/lib/stomp' {
  import type { Client } from 'stompjs';

  export const Stomp: {
    client(url: string, protocols?: string | string[]): Client;
    over(ws: WebSocket): Client;
  };
}
