import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { VerificacaoService } from '../verificacao/verificacao.service';

export type WhatsappSendReason =
  | 'sent'
  | 'not_ready'
  | 'invalid_phone'
  | 'send_exception'
  | 'initializing_stuck'
  | 'auth_failure'
  | 'disconnected';

export interface WhatsappSendResult {
  ok: boolean;
  reason: WhatsappSendReason;
  error?: string;
}

export interface WhatsappLastSendFailure {
  reason: Exclude<WhatsappSendReason, 'sent'>;
  error?: string;
  at: string;
}

export interface WhatsappStatus {
  ready: boolean;
  hasClient: boolean;
  hasQR: boolean;
  autoConnect: boolean;
  clientId: string;
  authPath: string;
  webVersion: string | null;
  webCacheType: 'local' | 'remote' | 'none';
  safeProfileEnabled: boolean;
  isInitializing: boolean;
  reconnectAttempts: number;
  lastInitAt: string | null;
  lastReadyAt: string | null;
  lastDisconnectReason: string | null;
  lastClientState: string | null;
  lastAuthenticatedAt: string | null;
  lastAuthFailure: string | null;
  lastSendFailure: WhatsappLastSendFailure | null;
}

@Injectable()
export class WhatsappService implements OnModuleInit, OnApplicationShutdown {
  private static readonly MAX_RECONNECT_DELAY_MS = 60_000;
  private static readonly DEFAULT_COMPAT_WEB_VERSION = '2.3000.1017054665';

  private readonly logger = new Logger(WhatsappService.name);
  private client: Client | null = null;
  private isReady = false;
  private currentQR: string | null = null;
  private autoConnect = false;
  private isInitializing = false;
  private lastInitStartedAt: string | null = null;
  private lastInitFinishedAt: string | null = null;
  private lastReadyAt: string | null = null;
  private lastAuthenticatedAt: string | null = null;
  private lastAuthFailure: string | null = null;
  private lastDisconnectReason: string | null = null;
  private lastClientState: string | null = null;
  private lastSendFailure: WhatsappLastSendFailure | null = null;
  private readonly authPath: string;
  private readonly clientId: string;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly initializationStuckTimeoutMs: number;
  private readonly postAuthReadyTimeoutMs: number;
  private readonly authTimeoutMs: number;
  private readonly takeoverTimeoutMs: number;
  private readonly qrMaxRetries: number;
  private webCacheType: 'local' | 'remote' | 'none';
  private webCacheStrict: boolean;
  private readonly webCachePath: string;
  private webVersion: string | null;
  private readonly requireShimEnabled: boolean;
  private safeProfileEnabled = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private initializationWatchdog: NodeJS.Timeout | null = null;
  private manualDisconnectRequested = false;

  constructor(private readonly verificacaoService?: VerificacaoService) {
    this.autoConnect = process.env.WHATSAPP_AUTO_CONNECT === 'true';
    this.clientId = process.env.WHATSAPP_CLIENT_ID || 'floricultura-session';
    this.authPath = resolve(process.env.WHATSAPP_AUTH_DIR || '.wwebjs_auth');
    this.maxReconnectAttempts = Number(process.env.WHATSAPP_MAX_RECONNECT_ATTEMPTS || 8);
    this.reconnectBaseDelayMs = Number(process.env.WHATSAPP_RECONNECT_BASE_DELAY_MS || 5_000);
    this.initializationStuckTimeoutMs = Number(process.env.WHATSAPP_INIT_TIMEOUT_MS || 300_000);
    this.postAuthReadyTimeoutMs = Number(process.env.WHATSAPP_POST_AUTH_READY_TIMEOUT_MS || 900_000);
    this.authTimeoutMs = Number(process.env.WHATSAPP_AUTH_TIMEOUT_MS || 120_000);
    this.takeoverTimeoutMs = Number(process.env.WHATSAPP_TAKEOVER_TIMEOUT_MS || 0);
    this.qrMaxRetries = Number(process.env.WHATSAPP_QR_MAX_RETRIES || 0);
    this.webCacheType = this.parseWebCacheType(process.env.WHATSAPP_WEB_CACHE_TYPE);
    this.webCacheStrict = process.env.WHATSAPP_WEB_CACHE_STRICT === 'true';
    this.webCachePath = resolve(process.env.WHATSAPP_WEB_CACHE_PATH || '.wwebjs_cache');
    this.webVersion =
      (process.env.WHATSAPP_WEB_VERSION || '').trim() || WhatsappService.DEFAULT_COMPAT_WEB_VERSION;
    this.requireShimEnabled = process.env.WHATSAPP_REQUIRE_SHIM === 'true';
    this.ensureAuthPath();
  }

  async onModuleInit() {
    this.logger.log(
      `[wa_state] event=service_boot autoConnect=${this.autoConnect} clientId=${this.clientId} authPath="${this.authPath}" initTimeoutMs=${this.initializationStuckTimeoutMs} postAuthReadyTimeoutMs=${this.postAuthReadyTimeoutMs} authTimeoutMs=${this.authTimeoutMs} takeoverOnConflict=true webCacheType=${this.webCacheType} webCacheStrict=${this.webCacheStrict} webCachePath="${this.webCachePath}" webVersion=${this.webVersion || 'default'} safeProfile=${this.safeProfileEnabled} requireShim=${this.requireShimEnabled}`,
    );
    if (this.autoConnect) {
      this.logger.log('[wa_state] event=initialize_start source=module_init');
      await this.initialize();
      return;
    }
    this.logger.log('[wa_state] event=manual_mode message="use POST /whatsapp/connect"');
  }

  async initialize(): Promise<{ success: boolean; message: string }> {
    this.manualDisconnectRequested = false;

    if (this.client) {
      if (this.isReady) {
        return { success: true, message: 'Cliente ja esta conectado' };
      }

      if (this.isInitializationStuck()) {
        this.logger.warn('[wa_state] event=initialize_timeout_recovery');
        await this.destroyClientSafely('initialize_timeout_recovery');
        this.resetConnectionState();
      } else {
        if (!this.isInitializing) {
          this.isInitializing = true;
          this.startInitializationWatchdog(this.initializationStuckTimeoutMs);
        }
        if (this.currentQR) {
          return { success: false, message: 'Aguardando leitura do QR Code' };
        }
        return { success: false, message: 'Cliente ja esta inicializando' };
      }
    }

    this.isInitializing = true;
    this.lastInitStartedAt = new Date().toISOString();
    this.lastInitFinishedAt = null;
    this.clearReconnectTimer();
    this.startInitializationWatchdog(this.initializationStuckTimeoutMs);
    this.logger.log('[wa_state] event=initialize_start source=api');

    try {
      const effectiveWebCacheType = this.safeProfileEnabled ? 'remote' : this.webCacheType;
      const effectiveWebVersion =
        this.safeProfileEnabled && !this.webVersion
          ? WhatsappService.DEFAULT_COMPAT_WEB_VERSION
          : this.webVersion;
      this.logger.log(
        `[wa_state] event=initialize_profile safeProfile=${this.safeProfileEnabled} webCacheType=${effectiveWebCacheType} webVersion=${effectiveWebVersion || 'default'}`,
      );

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.clientId,
          dataPath: this.authPath,
        }),
        ...(effectiveWebVersion ? { webVersion: effectiveWebVersion } : {}),
        authTimeoutMs: this.authTimeoutMs,
        qrMaxRetries: this.qrMaxRetries,
        takeoverOnConflict: true,
        takeoverTimeoutMs: this.takeoverTimeoutMs,
        ...(this.requireShimEnabled ? { evalOnNewDoc: this.buildRequireShim() } : {}),
        webVersionCache:
          effectiveWebCacheType === 'remote'
            ? {
                type: 'remote',
                remotePath:
                  process.env.WHATSAPP_WEB_REMOTE_PATH ||
                  'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html',
                strict: this.webCacheStrict,
              }
            : effectiveWebCacheType === 'local'
              ? {
                  type: 'local',
                  path: this.webCachePath,
                  strict: this.webCacheStrict,
                }
              : { type: 'none' },
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      });

      this.setupEventHandlers();
      await this.client.initialize();
      this.attachBrowserDiagnostics();

      return { success: true, message: 'Cliente inicializando. Aguarde o QR Code...' };
    } catch (error) {
      const errorText = this.formatError(error);
      if (this.shouldRelaxWebCacheStrict(errorText)) {
        this.logger.warn(
          `[wa_state] event=web_version_resolve_fallback action=relax_strict previousStrict=${this.webCacheStrict}`,
        );
        this.webCacheStrict = false;
        await this.destroyClientSafely('web_version_resolve_fallback');
        this.resetConnectionState();
        this.lastInitFinishedAt = new Date().toISOString();
        return this.initialize();
      }
      this.logger.error(`[wa_state] event=initialize_error error="${errorText}"`);
      await this.destroyClientSafely('initialize_error');
      this.resetConnectionState();
      this.lastInitFinishedAt = new Date().toISOString();
      return { success: false, message: `Erro: ${errorText}` };
    }
  }

  private setupEventHandlers() {
    if (!this.client) {
      this.logger.error('[wa_state] event=setup_handlers_failed reason=client_null');
      return;
    }

    this.client.on('qr', (qr: string) => {
      this.currentQR = qr;
      this.clearInitializationWatchdog();
      this.logger.log('[wa_state] event=qr_received');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.isInitializing = false;
      this.currentQR = null;
      this.lastReadyAt = new Date().toISOString();
      this.lastAuthenticatedAt = this.lastReadyAt;
      this.lastInitFinishedAt = this.lastReadyAt;
      this.lastDisconnectReason = null;
      this.lastAuthFailure = null;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.clearInitializationWatchdog();
      this.logger.log('[wa_state] event=ready');
    });

    this.client.on('authenticated', () => {
      this.lastAuthenticatedAt = new Date().toISOString();
      this.startInitializationWatchdog(this.postAuthReadyTimeoutMs);
      this.logger.log('[wa_state] event=authenticated');
    });

    this.client.on('change_state', (state) => {
      this.lastClientState = String(state || 'unknown');
      this.logger.log(`[wa_state] event=change_state state=${this.lastClientState}`);
    });

    this.client.on('auth_failure', async (msg) => {
      this.lastAuthFailure = String(msg || 'unknown');
      this.lastDisconnectReason = 'auth_failure';
      this.lastInitFinishedAt = new Date().toISOString();
      this.logger.error(`[wa_state] event=auth_failure reason="${this.lastAuthFailure}"`);
      this.resetConnectionState();
      this.scheduleReconnect('auth_failure');
    });

    this.client.on('disconnected', async (reason) => {
      this.lastDisconnectReason = String(reason || 'unknown');
      this.lastInitFinishedAt = new Date().toISOString();
      this.logger.warn(`[wa_state] event=disconnected reason="${this.lastDisconnectReason}"`);
      this.resetConnectionState();
      this.scheduleReconnect('disconnected');
    });

    this.client.on('message', async (msg: Message) => {
      await this.handleIncomingMessage(msg);
    });

    this.client.on('loading_screen', (percent, message) => {
      this.logger.log(`[wa_state] event=loading_screen percent=${percent} message="${message}"`);
    });
  }

  private async handleIncomingMessage(msg: Message) {
    try {
      if (!msg || !msg.body) return;

      const body = msg.body.trim();
      const tokenMatch = body.match(/\b(\d{6})\b/);
      if (!tokenMatch || !this.verificacaoService) return;

      const token = tokenMatch[1];
      let from = msg.from;
      this.logger.log(`[wa_token] event=token_received token=${token} from="${from}"`);

      try {
        if (from.includes('@lid')) {
          this.logger.warn(`[wa_token] event=lid_detected from="${from}"`);
          const contact = await msg.getContact();

          if (!contact || !contact.number) {
            this.logger.warn('[wa_token] event=contact_number_not_found');
            if (this.client) {
              await this.client.sendMessage(
                msg.from,
                'Atencao!\n\n' +
                  'Para completar seu cadastro, voce precisa:\n\n' +
                  '1) Salvar nosso numero nos seus contatos: +55 42 3524-2223\n' +
                  '2) Enviar o codigo novamente\n',
              );
            }
            return;
          }

          try {
            const contactDigits = String(contact.number || '').replace(/\D/g, '');
            const fallbackJid = contactDigits ? `${contactDigits}@c.us` : from;
            if (this.client) {
              const numberId = await this.client.getNumberId(contact.number);
              if (numberId && numberId._serialized && !String(numberId._serialized).includes('@lid')) {
                from = numberId._serialized;
              } else {
                from = fallbackJid;
              }
            } else {
              from = fallbackJid;
            }
          } catch {
            const contactDigits = String(contact.number || '').replace(/\D/g, '');
            from = contactDigits ? `${contactDigits}@c.us` : from;
          }
        }

        await this.verificacaoService.consumeToken(token, from);
        if (this.client) {
          await this.client.sendMessage(
            from,
            'Seu telefone foi verificado com sucesso! Retorne ao site para concluir o cadastro.',
          );
        }
        this.logger.log(`[wa_token] event=token_verified token=${token} from="${from}"`);
      } catch (error) {
        this.logger.warn(`[wa_token] event=token_verify_failed error="${this.formatError(error)}"`);
      }
    } catch (error) {
      this.logger.error(`[wa_token] event=message_processing_error error="${this.formatError(error)}"`);
    }
  }

  async sendMessage(to: string, message: string): Promise<WhatsappSendResult> {
    if (!this.isValidPhone(to)) {
      return this.failSend('invalid_phone', 'Destination phone is invalid', to);
    }
    if (!message || !message.trim()) {
      return this.failSend('send_exception', 'Message is required', to);
    }

    if (!this.isReady || !this.client) {
      if (this.isInitializationStuck()) {
        this.logger.warn('[wa_state] event=initialize_timeout_recovery source=send_message');
        const recovery = await this.initialize();
        if (!recovery.success) {
          return this.failSend('initializing_stuck', recovery.message, to);
        }
      } else if (this.autoConnect && !this.isInitializing) {
        this.logger.warn('[wa_state] event=auto_recovery_attempt source=send_message');
        await this.initialize();
      }
    }

    if (!this.isReady || !this.client) {
      const reason = this.deriveNotReadyReason();
      return this.failSend(reason, 'WhatsApp client is not ready', to);
    }

    try {
      const chatId = this.formatPhoneToWhatsAppId(to);
      await this.client.sendMessage(chatId, message);
      this.lastSendFailure = null;
      this.logger.log(`[wa_send] event=sent to=${this.maskPhone(to)}`);
      return { ok: true, reason: 'sent' };
    } catch (error) {
      return this.failSend('send_exception', this.formatError(error), to);
    }
  }

  private deriveNotReadyReason(): Exclude<
    WhatsappSendReason,
    'sent' | 'invalid_phone' | 'send_exception'
  > {
    if (this.isInitializationStuck()) return 'initializing_stuck';
    if (this.lastAuthFailure) return 'auth_failure';
    if (this.lastDisconnectReason) return 'disconnected';
    return 'not_ready';
  }

  private failSend(
    reason: Exclude<WhatsappSendReason, 'sent'>,
    error?: string,
    to?: string,
  ): WhatsappSendResult {
    this.lastSendFailure = {
      reason,
      error,
      at: new Date().toISOString(),
    };
    const target = to ? ` to=${this.maskPhone(to)}` : '';
    const errorPart = error ? ` error="${error}"` : '';
    this.logger.warn(`[wa_send] event=failed reason=${reason}${target}${errorPart}`);
    return { ok: false, reason, error };
  }

  private isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    if (phone.includes('@')) {
      const digitsWithJid = phone.split('@')[0].replace(/\D/g, '');
      return digitsWithJid.length >= 8;
    }
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8;
  }

  private formatPhoneToWhatsAppId(phone: string): string {
    if (phone.includes('@')) return phone;
    const digits = phone.replace(/\D/g, '');
    return `${digits}@c.us`;
  }

  private isInitializationStuck(): boolean {
    const ageMs = this.getInitializationAgeMs();
    if (!this.client || this.isReady || this.currentQR || ageMs === null) return false;
    const timeoutMs = this.lastAuthenticatedAt
      ? this.postAuthReadyTimeoutMs
      : this.initializationStuckTimeoutMs;
    return ageMs > timeoutMs;
  }

  private getInitializationAgeMs(): number | null {
    if (!this.lastInitStartedAt) return null;
    const start = new Date(this.lastInitStartedAt).getTime();
    if (Number.isNaN(start)) return null;
    return Date.now() - start;
  }

  private ensureAuthPath() {
    try {
      mkdirSync(this.authPath, { recursive: true });
    } catch (error) {
      this.logger.error(`[wa_state] event=auth_path_create_failed path="${this.authPath}" error="${this.formatError(error)}"`);
    }
  }

  private parseWebCacheType(value?: string): 'local' | 'remote' | 'none' {
    const raw = (value || 'remote').toLowerCase();
    if (raw === 'local' || raw === 'remote' || raw === 'none') {
      return raw;
    }
    this.logger.warn(`[wa_state] event=invalid_web_cache_type value="${value}" fallback=remote`);
    return 'remote';
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private startInitializationWatchdog(timeoutMs: number) {
    this.clearInitializationWatchdog();
    this.initializationWatchdog = setTimeout(async () => {
      this.initializationWatchdog = null;
      if (this.isReady || !this.client || this.currentQR) return;
      this.logger.warn('[wa_state] event=initialize_watchdog_timeout');
      if (this.lastAuthenticatedAt && !this.safeProfileEnabled) {
        this.safeProfileEnabled = true;
        this.webVersion = this.webVersion || WhatsappService.DEFAULT_COMPAT_WEB_VERSION;
        this.webCacheType = 'remote';
        this.logger.warn(
          `[wa_state] event=safe_profile_enabled reason=post_auth_no_ready webVersion=${this.webVersion}`,
        );
      }
      await this.destroyClientSafely('initialize_watchdog_timeout');
      this.lastDisconnectReason = 'initialize_watchdog_timeout';
      this.lastInitFinishedAt = new Date().toISOString();
      this.resetConnectionState();
      this.scheduleReconnect('disconnected');
    }, timeoutMs);
    this.initializationWatchdog.unref?.();
  }

  private clearInitializationWatchdog() {
    if (!this.initializationWatchdog) return;
    clearTimeout(this.initializationWatchdog);
    this.initializationWatchdog = null;
  }

  private scheduleReconnect(trigger: 'auth_failure' | 'disconnected') {
    if (!this.autoConnect) return;
    if (this.manualDisconnectRequested) {
      this.logger.log(`[wa_state] event=reconnect_skipped trigger=${trigger} reason=manual_disconnect`);
      return;
    }
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.warn(
        `[wa_state] event=reconnect_aborted trigger=${trigger} attempts=${this.reconnectAttempts} maxAttempts=${this.maxReconnectAttempts}`,
      );
      return;
    }

    this.reconnectAttempts += 1;
    const delayMs = Math.min(
      this.reconnectBaseDelayMs * 2 ** (this.reconnectAttempts - 1),
      WhatsappService.MAX_RECONNECT_DELAY_MS,
    );
    this.logger.warn(
      `[wa_state] event=reconnect_scheduled trigger=${trigger} attempt=${this.reconnectAttempts} delayMs=${delayMs}`,
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      const result = await this.initialize();
      if (!result.success && !this.isReady) {
        this.logger.warn(`[wa_state] event=reconnect_failed attempt=${this.reconnectAttempts} error="${result.message}"`);
        this.scheduleReconnect(trigger);
      }
    }, delayMs);
    this.reconnectTimer.unref?.();
  }

  private attachBrowserDiagnostics() {
    const page: any = (this.client as any)?.pupPage;
    if (!page || page.__waDiagnosticsAttached) return;
    page.__waDiagnosticsAttached = true;

    try {
      page.on('pageerror', (err: unknown) => {
        this.logger.error(`[wa_page] event=pageerror error="${this.formatError(err)}"`);
      });
      page.on('error', (err: unknown) => {
        this.logger.error(`[wa_page] event=error error="${this.formatError(err)}"`);
      });
      page.on('console', (msg: any) => {
        if (!msg) return;
        const text = String(msg.text?.() || '');
        if (!text) return;
        if (/Requiring unknown module/i.test(text)) {
          this.logger.warn(`[wa_page] event=unknown_module_detected text="${text.slice(0, 500)}"`);
          return;
        }
        if (/error|exception|failed|wwebjs/i.test(text)) {
          this.logger.warn(`[wa_page] event=console type=${msg.type?.() || 'log'} text="${text.slice(0, 500)}"`);
        }
      });
    } catch (error) {
      this.logger.warn(`[wa_page] event=diagnostics_attach_failed error="${this.formatError(error)}"`);
    }
  }

  private async destroyClientSafely(context: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.destroy();
      this.logger.log(`[wa_state] event=client_destroyed context=${context}`);
    } catch (error) {
      this.logger.warn(
        `[wa_state] event=client_destroy_failed context=${context} error="${this.formatError(error)}"`,
      );
    }
  }

  private resetConnectionState() {
    this.clearInitializationWatchdog();
    this.client = null;
    this.isReady = false;
    this.isInitializing = false;
    this.currentQR = null;
    this.lastClientState = null;
    this.lastAuthenticatedAt = null;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return String(error);
  }

  private shouldRelaxWebCacheStrict(errorText: string): boolean {
    if (!this.webCacheStrict) return false;
    return /Couldn't load version .* from the (archive|cache)/i.test(errorText);
  }

  private buildRequireShim(): () => void {
    return function () {
      const fallbackModules: Record<string, Record<string, unknown>> = {
        WAWebSetPushnameConnAction: {
          setPushname: () => false,
        },
        WAPhoneUtils: {},
        WAWebNewsletterToggleMuteStateJob: {},
      };

      const fallbackNames = Object.keys(fallbackModules);

      const applyShim = () => {
        try {
          const win = window as any;
          const original = win.require;
          if (typeof original !== 'function' || original.__wwebjsRequireShim) return;

          const wrapped = function (moduleName: string, ...args: unknown[]) {
            try {
              return original.call(this, moduleName, ...args);
            } catch (error) {
              if (
                typeof moduleName === 'string' &&
                Object.prototype.hasOwnProperty.call(fallbackModules, moduleName)
              ) {
                const fallback = fallbackModules[moduleName];
                console.warn(
                  `[wwebjs_shim] event=require_fallback module=${moduleName} error=${
                    error instanceof Error ? error.message : String(error)
                  }`,
                );
                return fallback;
              }
              throw error;
            }
          };

          wrapped.__wwebjsRequireShim = true;
          win.require = wrapped;
        } catch {
          // swallow: shim will retry briefly
        }
      };

      try {
        const win = window as any;
        if (!win.__wwebjsRequireShimDescriptorInstalled) {
          const descriptor = Object.getOwnPropertyDescriptor(win, 'require');
          if (!descriptor || descriptor.configurable) {
            let currentRequire = win.require;
            Object.defineProperty(win, 'require', {
              configurable: true,
              enumerable: false,
              get() {
                return currentRequire;
              },
              set(value) {
                currentRequire = value;
                applyShim();
              },
            });
            win.__wwebjsRequireShimDescriptorInstalled = true;
          }
        }
      } catch {
        // ignore descriptor failures and rely on polling
      }

      applyShim();

      const start = Date.now();
      const timer = setInterval(() => {
        applyShim();
        if (Date.now() - start > 60_000) {
          clearInterval(timer);
        }
      }, 50);

      (timer as any).unref?.();
      console.info(`[wwebjs_shim] event=enabled modules=${fallbackNames.join(',')}`);
    };
  }

  private maskPhone(phone?: string): string {
    if (!phone) return 'unknown';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length <= 4) return digits || 'unknown';
    return `***${digits.slice(-4)}`;
  }

  getStatus(): WhatsappStatus {
    return {
      ready: this.isReady,
      hasClient: !!this.client,
      hasQR: !!this.currentQR,
      autoConnect: this.autoConnect,
      clientId: this.clientId,
      authPath: this.authPath,
      webVersion: this.webVersion,
      webCacheType: this.webCacheType,
      safeProfileEnabled: this.safeProfileEnabled,
      isInitializing: this.isInitializing,
      reconnectAttempts: this.reconnectAttempts,
      lastInitAt: this.lastInitStartedAt,
      lastReadyAt: this.lastReadyAt,
      lastDisconnectReason: this.lastDisconnectReason,
      lastClientState: this.lastClientState,
      lastAuthenticatedAt: this.lastAuthenticatedAt,
      lastAuthFailure: this.lastAuthFailure,
      lastSendFailure: this.lastSendFailure,
    };
  }

  getQRCode(): string | null {
    return this.currentQR;
  }

  async disconnect() {
    this.manualDisconnectRequested = true;
    this.clearReconnectTimer();
    this.lastDisconnectReason = 'manual_disconnect';
    this.lastInitFinishedAt = new Date().toISOString();
    await this.destroyClientSafely('manual_disconnect');
    this.resetConnectionState();
  }

  async restart() {
    this.logger.log('[wa_state] event=restart_requested');
    await this.disconnect();
    this.manualDisconnectRequested = false;
    this.reconnectAttempts = 0;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    return this.initialize();
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`[wa_state] event=app_shutdown signal=${signal || 'unknown'}`);
    this.clearReconnectTimer();
    this.clearInitializationWatchdog();
    await this.destroyClientSafely('app_shutdown');
    this.resetConnectionState();
  }
}
