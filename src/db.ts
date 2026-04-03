import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";

if (!existsSync("storage")) {
  mkdirSync("storage", { recursive: true });
}

const db = new Database("storage/bot.sqlite");

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    role    TEXT    NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT    NOT NULL,
    date    INTEGER NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS llm_cost (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    cost REAL    NOT NULL
  )
`);

export interface MessageEntry {
  id: number;
  role: "user" | "assistant";
  content: string;
  date: number;
}

export function addMessage(role: "user" | "assistant", content: string, date: number): void {
  db.run("INSERT INTO messages (role, content, date) VALUES (?, ?, ?)", [role, content, date]);
}

export function getMessages(): MessageEntry[] {
  return db.query("SELECT id, role, content, date FROM messages ORDER BY id").all() as MessageEntry[];
}

export function getLastMessages(limit: number): MessageEntry[] {
  return db.query("SELECT id, role, content, date FROM messages ORDER BY id DESC LIMIT ?").all(limit).reverse() as MessageEntry[];
}

export function addCost(cost: number): void {
  db.run("INSERT INTO llm_cost (cost) VALUES (?)", [cost]);
}

export function getTotalCost(): number {
  const row = db.query("SELECT SUM(cost) as total FROM llm_cost").get() as { total: number | null };
  return row.total ?? 0;
}
