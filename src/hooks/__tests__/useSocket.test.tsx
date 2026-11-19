import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { SocketProvider, useSocket } from '@/hooks/useSocket';
import { disconnectSocket } from '@/lib/socket';
import { createMockSocket, type MockSocket } from '@/test/mockSocket';

let socket: MockSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socket),
}));

function Status() {
  const { isConnected, socket: s } = useSocket();
  return (
    <div>
      <span data-testid="status">{isConnected ? 'connecté' : 'déconnecté'}</span>
      <button onClick={() => s?.emit('ping', { at: 1 })}>ping</button>
    </div>
  );
}

describe('SocketProvider (avec le mock socket.io-client)', () => {
  beforeEach(() => {
    socket = createMockSocket();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup(); // démonter avant de couper le socket, pour éviter des setState hors act()
    disconnectSocket();
    vi.restoreAllMocks();
  });

  it('se connecte au montage et reflète les événements connect / disconnect', () => {
    render(
      <SocketProvider>
        <Status />
      </SocketProvider>
    );

    // connectSocket() appelle socket.connect(), qui émet « connect » via le mock.
    expect(screen.getByTestId('status')).toHaveTextContent('connecté');
    expect(socket.connected).toBe(true);

    act(() => socket.serverEmit('disconnect', 'transport close'));
    expect(screen.getByTestId('status')).toHaveTextContent('déconnecté');
  });

  it('enregistre les émissions du client', () => {
    render(
      <SocketProvider>
        <Status />
      </SocketProvider>
    );

    act(() => screen.getByRole('button', { name: 'ping' }).click());
    expect(socket.emitted('ping')).toEqual([[{ at: 1 }]]);
  });

  it('gère once / off', () => {
    const handler = vi.fn();
    socket.once('question:started', handler);
    socket.serverEmit('question:started', { id: 'q1' });
    socket.serverEmit('question:started', { id: 'q2' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: 'q1' });

    const other = vi.fn();
    socket.on('leaderboard:update', other);
    socket.off('leaderboard:update', other);
    socket.serverEmit('leaderboard:update', {});
    expect(other).not.toHaveBeenCalled();
    expect(socket.listenerCount('leaderboard:update')).toBe(0);
  });
});
