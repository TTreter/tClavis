export class SecurityValidator {
  /**
   * Validates and sanitizes a username according to MikroTik Hotspot standards.
   * Disallows control characters, null bytes, and non-printable characters.
   */
  public static sanitizeUsername(username: string): string {
    if (!username) throw new Error('Nome de usuário é obrigatório.');
    // Remove control characters (0x00 - 0x1F) and trim
    const sanitized = username.replace(/[\x00-\x1F\x7F]/g, '').trim();
    if (sanitized.length < 2 || sanitized.length > 64) {
      throw new Error('Nome de usuário deve ter entre 2 e 64 caracteres.');
    }
    // Allow safe characters: alphanumeric, dots, hyphens, underscores, @, +
    if (!/^[a-zA-Z0-9._@+-]+$/.test(sanitized)) {
      throw new Error('Nome de usuário contém caracteres inválidos. Permitidos: letras, números, . _ - @ +');
    }
    return sanitized;
  }

  /**
   * Sanitizes passwords, rejecting null bytes which would corrupt length-prefixed protocol words.
   */
  public static sanitizePassword(password: string): string {
    if (password === undefined || password === null) return '';
    if (password.includes('\x00')) {
      throw new Error('Senha contém caracteres nulos inválidos.');
    }
    return password;
  }

  /**
   * Sanitizes comments to prevent protocol desync.
   */
  public static sanitizeComment(comment?: string): string {
    if (!comment) return '';
    return comment.replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, 128);
  }

  /**
   * Validates MAC addresses strictly: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF.
   */
  public static validateMacAddress(mac: string): string {
    const cleaned = mac.trim().toUpperCase();
    const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
    if (!macRegex.test(cleaned)) {
      throw new Error('Endereço MAC inválido. Formato esperado: AA:BB:CC:DD:EE:FF');
    }
    return cleaned.replace(/-/g, ':');
  }

  /**
   * Validates RouterOS uptime limits (e.g. "1d", "4h30m", "15m").
   */
  public static validateUptimeLimit(limit?: string): string {
    if (!limit) return '';
    const cleaned = limit.trim().toLowerCase();
    const uptimeRegex = /^(\d+[wdhms])+$/;
    if (!uptimeRegex.test(cleaned)) {
      throw new Error('Formato de tempo de uptime inválido. Exemplos válidos: 2h, 1d, 30m, 1d12h');
    }
    return cleaned;
  }
}
