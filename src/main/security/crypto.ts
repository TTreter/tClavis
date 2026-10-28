import { safeStorage } from 'electron';
import * as crypto from 'crypto';
import * as os from 'os';

// Fallback AES-256-GCM key derived from machine properties
const SALT = 'tclavis-mikrotik-hotspot-master-salt-2026';
const MACHINE_SEED = `${os.hostname()}_${os.platform()}_${os.arch()}`;
const MASTER_KEY = crypto.scryptSync(MACHINE_SEED, SALT, 32);
const ALGORITHM = 'aes-256-gcm';

export class CredentialVault {
  /**
   * Encrypts plaintext using Electron's native safeStorage (DPAPI on Windows with TPM),
   * or falls back to AES-256-GCM.
   */
  public static encrypt(plainText: string): string {
    if (!plainText) return '';

    // Prefer native OS-level safeStorage (Windows DPAPI / TPM, macOS Keychain, Linux secret-service)
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encryptedBuf = safeStorage.encryptString(plainText);
        return `dpapi:${encryptedBuf.toString('base64')}`;
      }
    } catch (err) {
      console.warn('[tClavis Vault] safeStorage not available, using AES-256-GCM fallback.');
    }

    // Fallback: AES-256-GCM
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      return `gcm:${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
      console.error('[tClavis Vault] Encryption error:', err);
      return plainText;
    }
  }

  /**
   * Decrypts ciphertext, detecting whether it was encrypted via DPAPI, GCM, or legacy format.
   */
  public static decrypt(cipherText: string): string {
    if (!cipherText) return '';

    // 1. Check for native DPAPI prefix
    if (cipherText.startsWith('dpapi:')) {
      try {
        const base64Data = cipherText.slice(6);
        const buffer = Buffer.from(base64Data, 'base64');
        return safeStorage.decryptString(buffer);
      } catch (err) {
        console.error('[tClavis Vault] DPAPI decryption failed:', err);
        return '';
      }
    }

    // 2. Check for GCM prefix or legacy iv:authTag:encrypted
    let rawGcm = cipherText;
    if (cipherText.startsWith('gcm:')) {
      rawGcm = cipherText.slice(4);
    }

    const parts = rawGcm.split(':');
    if (parts.length === 3) {
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
        console.error('[tClavis Vault] GCM decryption failed:', err);
        return '';
      }
    }

    // Unencrypted legacy fallback
    return cipherText;
  }
}
