/**
 * Mock de `socket.io-client` pour les tests de composants « live ».
 *
 * `createMockSocket()` renvoie un faux socket qui :
 * - enregistre les écouteurs posés par le code (`on`, `once`, `off`, `removeAllListeners`) ;
 * - mémorise tout ce que le client émet (`emit`) pour pouvoir faire des assertions ;
 * - permet au test de simuler le serveur avec `serverEmit(event, ...args)` ;
 * - gère l'état de connexion (`connect()`, `disconnect()`, `connected`), en déclenchant
 *   les événements `connect` / `disconnect` comme le vrai client.
 *
 * Utilisation type (le code de l'app passe par `@/lib/socket`, qui appelle `io()`) :
 *
 * ```ts
 * import { vi } from 'vitest';
 * import { act } from '@testing-library/react';
 * import { createMockSocket, type MockSocket } from '@/test/mockSocket';
 *
 * let socket: MockSocket;
 * vi.mock('socket.io-client', () => ({ io: vi.fn(() => socket) }));
 *
 * beforeEach(() => {
 *   socket = createMockSocket();
 * });
 *
 * it('met à jour le classement', () => {
 *   render(<MonComposant />);
 *   act(() => socket.serverEmit('leaderboard:update', { leaderboard: [] }));
 *   expect(socket.emitted('session:join')).toHaveLength(1);
 * });
 * ```
 *
 * Penser à appeler `disconnectSocket()` de `@/lib/socket` dans un `afterEach` : ce module garde
 * le socket en singleton entre les tests.
 */
import type { Socket } from 'socket.io-client';

type Listener = (...args: any[]) => void;

export interface EmittedEvent {
  event: string;
  args: unknown[];
}

export interface MockSocket {
  id: string | undefined;
  connected: boolean;
  disconnected: boolean;
  on(event: string, listener: Listener): MockSocket;
  once(event: string, listener: Listener): MockSocket;
  off(event?: string, listener?: Listener): MockSocket;
  removeAllListeners(event?: string): MockSocket;
  emit(event: string, ...args: unknown[]): MockSocket;
  connect(): MockSocket;
  disconnect(): MockSocket;
  // --- Aides de test ---
  /** Simule un événement envoyé par le serveur : appelle les écouteurs enregistrés. */
  serverEmit(event: string, ...args: unknown[]): void;
  /** Arguments de chaque `emit` client pour `event` (dans l'ordre). */
  emitted(event: string): unknown[][];
  /** Historique complet des `emit` client. */
  readonly emittedEvents: EmittedEvent[];
  /** Nombre d'écouteurs actuellement enregistrés pour `event`. */
  listenerCount(event: string): number;
  /** Cast pratique vers le type `Socket` de socket.io-client. */
  asSocket(): Socket;
}

export function createMockSocket(options: { connected?: boolean; id?: string } = {}): MockSocket {
  const listeners = new Map<string, Set<Listener>>();
  const onceWrappers = new WeakMap<Listener, Listener>();
  const emittedEvents: EmittedEvent[] = [];

  const add = (event: string, listener: Listener) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(listener);
  };

  const socket: MockSocket = {
    id: options.connected ? options.id ?? 'mock-socket-id' : undefined,
    connected: Boolean(options.connected),
    disconnected: !options.connected,

    on(event, listener) {
      add(event, listener);
      return socket;
    },

    once(event, listener) {
      const wrapper: Listener = (...args) => {
        listeners.get(event)?.delete(wrapper);
        listener(...args);
      };
      onceWrappers.set(listener, wrapper);
      add(event, wrapper);
      return socket;
    },

    off(event, listener) {
      if (event === undefined) {
        listeners.clear();
      } else if (listener === undefined) {
        listeners.delete(event);
      } else {
        const set = listeners.get(event);
        set?.delete(listener);
        const wrapper = onceWrappers.get(listener);
        if (wrapper) set?.delete(wrapper);
      }
      return socket;
    },

    removeAllListeners(event) {
      return socket.off(event);
    },

    emit(event, ...args) {
      emittedEvents.push({ event, args });
      return socket;
    },

    connect() {
      if (!socket.connected) {
        socket.connected = true;
        socket.disconnected = false;
        socket.id = options.id ?? 'mock-socket-id';
        socket.serverEmit('connect');
      }
      return socket;
    },

    disconnect() {
      if (socket.connected) {
        socket.connected = false;
        socket.disconnected = true;
        socket.id = undefined;
        socket.serverEmit('disconnect', 'io client disconnect');
      }
      return socket;
    },

    serverEmit(event, ...args) {
      // Copie : un écouteur peut se retirer pendant l'itération (once, off).
      Array.from(listeners.get(event) ?? []).forEach((listener) => listener(...args));
    },

    emitted(event) {
      return emittedEvents.filter((e) => e.event === event).map((e) => e.args);
    },

    get emittedEvents() {
      return emittedEvents;
    },

    listenerCount(event) {
      return listeners.get(event)?.size ?? 0;
    },

    asSocket() {
      return socket as unknown as Socket;
    },
  };

  return socket;
}
