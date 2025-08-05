// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Add Cloudflare Workers types for Durable Objects
declare global {
  interface DurableObjectState {
    waitUntil(promise: Promise<any>): void;
    blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
  }

  interface WebSocketPair {
    [0]: WebSocket;
    [1]: WebSocket;
  }

  interface WebSocket {
    accept(): void;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
    send(data: string | ArrayBuffer | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
    readyState: number;
  }

  var WebSocketPair: {
    new(): WebSocketPair;
  };
}

export {};
