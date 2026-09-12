import { pool } from "./db.js";

export const TELEGRAM_GROUP_ID =
  process.env.TELEGRAM_GROUP_ID || process.env.Telegram_group_id || "";

export const TELEGRAM_JOIN_URL =
  process.env.TELEGRAM_JOIN_URL || "https://t.me/+4mXj61Q-goYwNWU9";

/**
 * Idempotent Telegram referral/drop tables for the web app and standalone bot.
 */
export async function ensureTelegramReferralSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_members (
      chat_id TEXT PRIMARY KEY,
      telegram_username TEXT,
      name_active BOOLEAN NOT NULL DEFAULT FALSE,
      pending_referrer_chat_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE telegram_chat_members
    ADD COLUMN IF NOT EXISTS pending_referrer_chat_id TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_referrals (
      id BIGSERIAL PRIMARY KEY,
      referrer_chat_id TEXT NOT NULL,
      referred_chat_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_chat_referral_bonuses (
      id BIGSERIAL PRIMARY KEY,
      referrer_chat_id TEXT NOT NULL,
      referral_id BIGINT NOT NULL UNIQUE REFERENCES telegram_chat_referrals(id),
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}