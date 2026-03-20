import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = 'aes-256-gcm';

export class EncryptionService {
  private key: Buffer;

  constructor(secretKey?: string) {
    // In production, this should be derived securely (e.g., PBKDF2 from a user password)
    this.key = secretKey ? Buffer.from(secretKey, 'hex') : randomBytes(32);
  }

  encrypt(text: string): { iv: string, content: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      content: encrypted
    };
  }

  decrypt(hash: { iv: string, content: string }): string {
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(hash.iv, 'hex'));
    let decrypted = decipher.update(hash.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
