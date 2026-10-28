import * as net from 'net';
import * as tls from 'tls';
import * as crypto from 'crypto';

export interface RosSentence {
  type: '!re' | '!done' | '!trap' | '!fatal' | string;
  attributes: Record<string, string>;
  words: string[];
}

export interface RosConnectOptions {
  host: string;
  port?: number;
  useSsl?: boolean;
  username: string;
  password?: string;
  timeoutMs?: number;
}

export class RosClient {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer: Buffer = Buffer.alloc(0);
  private connected = false;
  private currentPromise: {
    resolve: (sentences: RosSentence[]) => void;
    reject: (err: Error) => void;
  } | null = null;
  private receivedSentences: RosSentence[] = [];
  private commandQueue: Array<{
    words: string[];
    resolve: (sentences: RosSentence[]) => void;
    reject: (err: Error) => void;
  }> = [];

  constructor(private options: RosConnectOptions) {
    this.options.port = this.options.port || (this.options.useSsl ? 8729 : 8728);
    this.options.timeoutMs = this.options.timeoutMs || 8000;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const onError = (err: Error) => {
        if (!settled) {
          settled = true;
          this.close();
          reject(err);
        }
      };

      const socketOpts = {
        host: this.options.host,
        port: this.options.port!,
        rejectUnauthorized: false, // Self-signed RouterOS certificates are common
      };

      const timer = setTimeout(() => {
        onError(new Error(`Timeout ao conectar a ${this.options.host}:${this.options.port}`));
      }, this.options.timeoutMs);

      const onConnect = async () => {
        clearTimeout(timer);
        this.connected = true;
        try {
          await this.authenticate();
          settled = true;
          resolve();
        } catch (authErr: any) {
          onError(authErr);
        }
      };

      if (this.options.useSsl) {
        this.socket = tls.connect(socketOpts, onConnect);
      } else {
        this.socket = net.connect(socketOpts, onConnect);
      }

      this.socket.on('data', (data) => this.onData(data));
      this.socket.on('error', (err) => {
        this.rejectAllPending(err);
        onError(err);
      });
      this.socket.on('close', () => {
        this.connected = false;
        this.rejectAllPending(new Error('Conexão encerrada pelo MikroTik.'));
      });
    });
  }

  private async authenticate(): Promise<void> {
    // Attempt modern post-6.43 and v7 login first (single step)
    const initial = await this.talk([
      '/login',
      `=name=${this.options.username}`,
      `=password=${this.options.password || ''}`,
    ]);

    const doneSentence = initial.find((s) => s.type === '!done');
    const trapSentence = initial.find((s) => s.type === '!trap');

    if (trapSentence) {
      throw new Error(`Falha de autenticação: ${trapSentence.attributes.message || 'Credenciais inválidas'}`);
    }

    // Check if challenge is required (legacy RouterOS <= 6.42)
    if (doneSentence && doneSentence.attributes.ret) {
      const challenge = Buffer.from(doneSentence.attributes.ret, 'hex');
      const md5 = crypto.createHash('md5');
      md5.update(Buffer.concat([Buffer.from([0]), Buffer.from(this.options.password || '', 'utf-8'), challenge]));
      const response = '00' + md5.digest('hex');

      const challengeReply = await this.talk([
        '/login',
        `=name=${this.options.username}`,
        `=response=${response}`,
      ]);

      const challengeDone = challengeReply.find((s) => s.type === '!done');
      if (!challengeDone) {
        const error = challengeReply.find((s) => s.type === '!trap');
        throw new Error(`Falha no login legado: ${error?.attributes.message || 'Erro de autenticação'}`);
      }
    }
  }

  public async talk(words: string[]): Promise<RosSentence[]> {
    if (!this.socket || !this.connected) {
      throw new Error('Socket não está conectado ao MikroTik.');
    }

    return new Promise((resolve, reject) => {
      this.commandQueue.push({ words, resolve, reject });
      if (!this.currentPromise) {
        this.processNextCommand();
      }
    });
  }

  private processNextCommand(): void {
    if (this.currentPromise || this.commandQueue.length === 0) return;
    if (!this.socket || !this.connected) {
      this.rejectAllPending(new Error('Socket não está conectado ao MikroTik.'));
      return;
    }

    const next = this.commandQueue.shift()!;
    this.currentPromise = { resolve: next.resolve, reject: next.reject };
    this.receivedSentences = [];

    const buffers: Buffer[] = [];
    for (const word of next.words) {
      buffers.push(this.encodeWord(word));
    }
    buffers.push(Buffer.from([0])); // End of sentence (zero byte)

    const fullPayload = Buffer.concat(buffers);
    this.socket.write(fullPayload, (err) => {
      if (err) {
        const resolver = this.currentPromise;
        this.currentPromise = null;
        if (resolver) resolver.reject(err);
        this.processNextCommand();
      }
    });
  }

  private rejectAllPending(err: Error): void {
    if (this.currentPromise) {
      this.currentPromise.reject(err);
      this.currentPromise = null;
    }
    while (this.commandQueue.length > 0) {
      const cmd = this.commandQueue.shift();
      cmd?.reject(err);
    }
  }

  private onData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length > 0) {
      const sentence = this.tryReadSentence();
      if (!sentence) break;

      this.receivedSentences.push(sentence);

      // Sentence '!done', '!trap', or '!fatal' signifies completion of current command
      if (sentence.type === '!done' || sentence.type === '!trap' || sentence.type === '!fatal') {
        if (this.currentPromise) {
          const sentences = [...this.receivedSentences];
          const resolver = this.currentPromise.resolve;
          this.currentPromise = null;
          resolver(sentences);
          this.processNextCommand();
        }
      }
    }
  }

  private tryReadSentence(): RosSentence | null {
    let offset = 0;
    const words: string[] = [];

    while (true) {
      if (this.buffer.length <= offset) {
        return null; // Not enough data yet
      }

      // Check length prefix
      const lenInfo = this.decodeLength(this.buffer, offset);
      if (!lenInfo) {
        return null;
      }

      offset += lenInfo.headerBytes;

      if (lenInfo.length === 0) {
        // End of sentence!
        this.buffer = this.buffer.subarray(offset);
        return this.parseSentenceWords(words);
      }

      if (this.buffer.length < offset + lenInfo.length) {
        return null; // Word not fully received yet
      }

      const wordBuf = this.buffer.subarray(offset, offset + lenInfo.length);
      words.push(wordBuf.toString('utf-8'));
      offset += lenInfo.length;
    }
  }

  private parseSentenceWords(words: string[]): RosSentence {
    const type = words[0] || '!done';
    const attributes: Record<string, string> = {};

    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      if (w.startsWith('=')) {
        const eqIdx = w.indexOf('=', 1);
        if (eqIdx !== -1) {
          const key = w.slice(1, eqIdx);
          const val = w.slice(eqIdx + 1);
          attributes[key] = val;
        } else {
          attributes[w.slice(1)] = '';
        }
      }
    }

    return { type, attributes, words };
  }

  private encodeWord(word: string): Buffer {
    const wordBuf = Buffer.from(word, 'utf-8');
    const len = wordBuf.length;
    let header: Buffer;

    if (len < 0x80) {
      header = Buffer.from([len]);
    } else if (len < 0x4000) {
      header = Buffer.from([0x80 | (len >> 8), len & 0xff]);
    } else if (len < 0x200000) {
      header = Buffer.from([0xc0 | (len >> 16), (len >> 8) & 0xff, len & 0xff]);
    } else if (len < 0x10000000) {
      header = Buffer.from([0xe0 | (len >> 24), (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
    } else {
      header = Buffer.from([0xf0, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
    }

    return Buffer.concat([header, wordBuf]);
  }

  private decodeLength(buf: Buffer, offset: number): { length: number; headerBytes: number } | null {
    if (buf.length <= offset) return null;
    const b1 = buf[offset];

    if ((b1 & 0x80) === 0x00) {
      return { length: b1, headerBytes: 1 };
    } else if ((b1 & 0xc0) === 0x80) {
      if (buf.length < offset + 2) return null;
      const b2 = buf[offset + 1];
      return { length: ((b1 & 0x3f) << 8) | b2, headerBytes: 2 };
    } else if ((b1 & 0xe0) === 0xc0) {
      if (buf.length < offset + 3) return null;
      const b2 = buf[offset + 1];
      const b3 = buf[offset + 2];
      return { length: ((b1 & 0x1f) << 16) | (b2 << 8) | b3, headerBytes: 3 };
    } else if ((b1 & 0xf0) === 0xe0) {
      if (buf.length < offset + 4) return null;
      const b2 = buf[offset + 1];
      const b3 = buf[offset + 2];
      const b4 = buf[offset + 3];
      return { length: ((b1 & 0x0f) << 24) | (b2 << 16) | (b3 << 8) | b4, headerBytes: 4 };
    } else if (b1 === 0xf0) {
      if (buf.length < offset + 5) return null;
      return {
        length: (buf[offset + 1] << 24) | (buf[offset + 2] << 16) | (buf[offset + 3] << 8) | buf[offset + 4],
        headerBytes: 5,
      };
    }
    return null;
  }

  public close(): void {
    this.rejectAllPending(new Error('Conexão encerrada pelo cliente.'));
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
  }
}
