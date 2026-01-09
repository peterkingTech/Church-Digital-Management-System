
import { type User, type InsertUser } from "@shared/schema";

// Note: This application primarily uses Supabase for data storage.
// This MemStorage is a fallback/placeholder for the server structure.

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.id === username, // simplistic mapping
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = insertUser.id || "uuid-" + Math.random();
    const user: User = { 
        id, 
        email: insertUser.email || null,
        churchId: insertUser.churchId || null, 
        fullName: insertUser.fullName || 'User',
        role: insertUser.role || 'guest',
        department: insertUser.department || null,
        language: insertUser.language || 'en',
        birthdayDay: insertUser.birthdayDay || null,
        birthdayMonth: insertUser.birthdayMonth || null,
        profileImageUrl: insertUser.profileImageUrl || null,
        createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
