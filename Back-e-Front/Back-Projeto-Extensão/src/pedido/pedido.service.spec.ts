import { PedidoService } from './pedido.service';
import { PedidoStatus } from './pedido.entity';

describe('PedidoService', () => {
  let service: PedidoService;
  let repository: any;
  let whatsappService: any;
  let usuarioService: any;

  beforeEach(() => {
    repository = {
      findOneBy: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    whatsappService = {
      sendMessage: jest.fn(),
    };

    usuarioService = {
      findById: jest.fn(),
    };

    service = new PedidoService(repository, whatsappService, usuarioService);
  });

  it('logs pedidoId and reason when whatsapp send fails', async () => {
    repository.findOneBy.mockResolvedValue({ id: 10 });
    repository.update.mockResolvedValue({ affected: 1 });
    repository.findOne.mockResolvedValue({
      id: 10,
      status: PedidoStatus.PREPARANDO,
      notifications_enabled: true,
      usuario: { telefone: '5542999999999' },
      telefone_cliente: '5542999999999',
    });
    whatsappService.sendMessage.mockResolvedValue({
      ok: false,
      reason: 'not_ready',
      error: 'WhatsApp client is not ready',
    });

    const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();

    await service.updateStatus(10, PedidoStatus.PREPARANDO);

    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);

    const joinedWarnLogs = warnSpy.mock.calls.map((call: any[]) => String(call[0])).join('\n');
    expect(joinedWarnLogs).toContain('event=send_failed');
    expect(joinedWarnLogs).toContain('pedidoId=10');
    expect(joinedWarnLogs).toContain('reason=not_ready');
  });

  it('does not call whatsapp send when notifications are disabled', async () => {
    repository.findOneBy.mockResolvedValue({ id: 20 });
    repository.update.mockResolvedValue({ affected: 1 });
    repository.findOne.mockResolvedValue({
      id: 20,
      status: PedidoStatus.PREPARANDO,
      notifications_enabled: 0,
      usuario: { telefone: '5542999999999' },
      telefone_cliente: '5542999999999',
    });

    await service.updateStatus(20, PedidoStatus.PREPARANDO);

    expect(whatsappService.sendMessage).not.toHaveBeenCalled();
  });
});
