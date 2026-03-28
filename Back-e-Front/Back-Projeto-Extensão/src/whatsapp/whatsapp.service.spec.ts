import { Client, LocalAuth } from 'whatsapp-web.js';
import { WhatsappService } from './whatsapp.service';

jest.mock('qrcode-terminal', () => ({
  generate: jest.fn(),
}));

jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn(),
  LocalAuth: jest.fn(),
  Message: class {},
}));

describe('WhatsappService', () => {
  const ClientMock = Client as unknown as jest.Mock;
  const LocalAuthMock = LocalAuth as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WHATSAPP_AUTO_CONNECT = 'false';
    LocalAuthMock.mockImplementation(() => ({}));
  });

  it('returns not_ready when sendMessage is called and client is not ready', async () => {
    const service = new WhatsappService(undefined as any);

    const result = await service.sendMessage('5542999999999', 'teste');

    expect(result).toEqual({
      ok: false,
      reason: 'not_ready',
      error: 'WhatsApp client is not ready',
    });
    expect(service.getStatus().lastSendFailure?.reason).toBe('not_ready');
  });

  it('clears state on auth_failure and allows re-initialize', async () => {
    const handlers: Record<string, (...args: any[]) => unknown> = {};
    const mockClient = {
      on: jest.fn((event: string, cb: (...args: any[]) => unknown) => {
        handlers[event] = cb;
        return mockClient;
      }),
      initialize: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      getNumberId: jest.fn().mockResolvedValue(null),
    };

    ClientMock.mockImplementation(() => mockClient);

    const service = new WhatsappService(undefined as any);
    await service.initialize();

    expect(typeof handlers.auth_failure).toBe('function');
    await handlers.auth_failure?.('session expired');

    const status = service.getStatus();
    expect(status.ready).toBe(false);
    expect(status.hasClient).toBe(false);
    expect(status.isInitializing).toBe(false);
    expect(status.lastAuthFailure).toContain('session expired');

    await service.initialize();
    expect(ClientMock).toHaveBeenCalledTimes(2);
  });

  it('recovers when initialization is stuck for more than configured timeout', async () => {
    const stuckClient = {
      destroy: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      initialize: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      getNumberId: jest.fn().mockResolvedValue(null),
    };

    const freshHandlers: Record<string, (...args: any[]) => unknown> = {};
    const freshClient = {
      on: jest.fn((event: string, cb: (...args: any[]) => unknown) => {
        freshHandlers[event] = cb;
        return freshClient;
      }),
      initialize: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      getNumberId: jest.fn().mockResolvedValue(null),
    };

    ClientMock.mockImplementation(() => freshClient);

    const service = new WhatsappService(undefined as any);
    (service as any).client = stuckClient;
    (service as any).isReady = false;
    (service as any).isInitializing = true;
    (service as any).lastInitStartedAt = new Date(Date.now() - 301_000).toISOString();

    const result = await service.initialize();

    expect(result.success).toBe(true);
    expect(stuckClient.destroy).toHaveBeenCalledTimes(1);
    expect(ClientMock).toHaveBeenCalledTimes(1);
  });

  it('returns send_exception when client.sendMessage throws', async () => {
    const service = new WhatsappService(undefined as any);
    (service as any).client = {
      sendMessage: jest.fn().mockRejectedValue(new Error('boom')),
    };
    (service as any).isReady = true;

    const result = await service.sendMessage('5542999999999', 'teste');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('send_exception');
    expect(result.error).toContain('boom');
    expect(service.getStatus().lastSendFailure?.reason).toBe('send_exception');
  });
});
