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
