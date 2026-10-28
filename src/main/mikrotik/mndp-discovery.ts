import * as dgram from 'dgram';

export interface DiscoveredNeighbor {
  identity: string;
  ip: string;
  mac: string;
  version: string;
  board: string;
  interface?: string;
}

export class MndpDiscovery {
  /**
   * Scans local network for MikroTik routers via MNDP (UDP 5678).
   * Listens for incoming neighbor discovery broadcasts for the specified timeout.
   */
  public static async scan(timeoutMs = 2500): Promise<DiscoveredNeighbor[]> {
    return new Promise((resolve) => {
      const discoveredMap = new Map<string, DiscoveredNeighbor>();
      let socket: dgram.Socket | null = null;

      try {
        socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      } catch (err) {
        console.warn('[tClavis MNDP] Failed to create UDP socket:', err);
        return resolve([]);
      }

      const timer = setTimeout(() => {
        cleanup();
        resolve(Array.from(discoveredMap.values()));
      }, timeoutMs);

      const cleanup = () => {
        if (socket) {
          try {
            socket.close();
          } catch (_) {}
          socket = null;
        }
      };

      socket.on('error', (err) => {
        console.warn('[tClavis MNDP] Socket error:', err.message);
        clearTimeout(timer);
        cleanup();
        resolve(Array.from(discoveredMap.values()));
      });

      socket.on('message', (msg, rinfo) => {
        try {
          const neighbor = MndpDiscovery.parsePacket(msg, rinfo.address);
          if (neighbor && neighbor.ip) {
            discoveredMap.set(`${neighbor.ip}_${neighbor.mac}`, neighbor);
          }
        } catch (_) {}
      });

      try {
        socket.bind(5678, () => {
          try {
            socket?.setBroadcast(true);
            // Send trigger ping packet to 255.255.255.255
            const pingBuf = Buffer.from([0, 0, 0, 0]);
            socket?.send(pingBuf, 0, 4, 5678, '255.255.255.255');
          } catch (_) {}
        });
      } catch (bindErr) {
        // Fallback: Bind on random ephemeral port and send broadcast
        try {
          socket.bind(0, () => {
            try {
              socket?.setBroadcast(true);
              const pingBuf = Buffer.from([0, 0, 0, 0]);
              socket?.send(pingBuf, 0, 4, 5678, '255.255.255.255');
            } catch (_) {}
          });
        } catch (_) {
          clearTimeout(timer);
          cleanup();
          resolve([]);
        }
      }
    });
  }

  private static parsePacket(buf: Buffer, sourceIp: string): DiscoveredNeighbor | null {
    if (buf.length < 8) return null;

    let offset = 4; // Skip MNDP 4-byte header
    let mac = '';
    let identity = '';
    let version = '';
    let board = '';
    let ip = sourceIp;
    let iface = '';

    while (offset + 4 <= buf.length) {
      const type = buf.readUInt16BE(offset);
      const len = buf.readUInt16BE(offset + 2);
      offset += 4;

      if (offset + len > buf.length) break;

      const valBuf = buf.subarray(offset, offset + len);

      switch (type) {
        case 1: {
          // MAC address
          mac = Array.from(valBuf)
            .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
            .join(':');
          break;
        }
        case 5: {
          // Identity
          identity = valBuf.toString('utf-8');
          break;
        }
        case 7: {
          // Version
          version = valBuf.toString('utf-8');
          break;
        }
        case 12: {
          // Board name
          board = valBuf.toString('utf-8');
          break;
        }
        case 16: {
          // IPv4
          if (valBuf.length >= 4) {
            ip = `${valBuf[0]}.${valBuf[1]}.${valBuf[2]}.${valBuf[3]}`;
          }
          break;
        }
        case 19: {
          // Interface
          iface = valBuf.toString('utf-8');
          break;
        }
      }

      offset += len;
    }

    if (!identity && !mac) return null;

    return {
      identity: identity || 'MikroTik RouterOS',
      ip: ip || sourceIp,
      mac: mac || '00:00:00:00:00:00',
      version: version || 'RouterOS',
      board: board || 'RouterBOARD',
      interface: iface || undefined,
    };
  }
}
