import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Database } from 'bun:sqlite';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod';

export interface User {
  id: string;
  username: string;
  role: string;
}

export class AuthService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async registerUser(username: string, passwordPlain: string, role: string = 'user'): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordPlain, salt);
    const id = crypto.randomUUID();

    try {
      this.db.query(`INSERT INTO Users (id, username, password_hash, role) VALUES (?, ?, ?, ?)`).run(
        id, username, hash, role
      );
      return id;
    } catch (err) {
      throw new Error(`Failed to register user: ${err}`);
    }
  }

  async authenticate(username: string, passwordPlain: string): Promise<{ token: string; user: User } | null> {
    const userRow = this.db.query(`SELECT id, username, password_hash, role FROM Users WHERE username = ?`).get(username) as any;
    
    if (!userRow) {
      return null;
    }

    const isValid = await bcrypt.compare(passwordPlain, userRow.password_hash);
    if (!isValid) {
      return null;
    }

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      role: userRow.role
    };

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Log the successful login
    this.logAction(user.id, 'login', user.id, 'User authenticated successfully');

    return { token, user };
  }

  verifyToken(token: string): User | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as User;
      return decoded;
    } catch (err) {
      return null;
    }
  }

  hasRole(user: User, allowedRoles: string[]): boolean {
    return allowedRoles.includes(user.role);
  }

  private logAction(userId: string, action: string, targetId: string, details: string) {
    try {
      this.db.query(`INSERT INTO AuditLogs (user_id, action, target_id, details) VALUES (?, ?, ?, ?)`).run(
        userId, action, targetId, details
      );
    } catch (err) {
      console.error('Failed to log action', err);
    }
  }
}
