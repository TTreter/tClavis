import * as crypto from 'crypto';
import * as os from 'os';

// Derive a consistent, machine-unique key for local credential encryption
const SALT = 'tclavis-mikrotik-hotspot-master-salt-2026';
const MACHINE_SEED = `${os.hostname()}_${os.platform()}_${os.arch()}`;
const MASTER_KEY = crypto.scryptSync(MACHINE_SEED, SALT, 32);
const ALGORITHM = 'aes-256-gcm';

export class CredentialVault {
  public static encrypt(plainText: string): string {
    if (!plainText) return '';
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
      console.error('Encryption error:', err);
      return plainText;
    }
  }

  public static decrypt(cipherText: string): string {
    if (!cipherText) return '';
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // Return as-is if unencrypted or legacy
      return cipherText;
    }

    try {
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];

      const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      // If decryption fails, return empty or fallback
      return '';
    }
  }
}
