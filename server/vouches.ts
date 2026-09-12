import { createHash, randomBytes } from "crypto";
import { db, pool } from "./db.js";
import { orders, transactions, users, vouchTokens, vouches } from "../shared/schema.js";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

export const VOUCH_REWARD_CENTS = 50;
export const VOUCH_TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const imageSignatures = [
  (data: Buffer) => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  (data: Buffer) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
  (data: Buffer) => data.length >= 12 && data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP",
];
let telegramBotUsername: string | null | undefined;

export type VouchStatus = "pending" | "approved" | "rejected";

export class VouchError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "VouchError";
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashImageBuffer(data: Buffer): string {
  if (data.length === 0 || data.length > MAX_IMAGE_BYTES || !imageSignatures.some((matches) => matches(data))) {
    throw new VouchError("INVALID_IMAGE", "Only valid JPG, JPEG, PNG, or WEBP images up to 4 MB are accepted.");
  }
  return createHash("sha256").update(data).digest("hex");
}

function isEligibleOrder(status: string) {
  return ["fulfilled", "delivering", "replaced"].includes(status);
}

async function ensureVouchSchemaWithPool() {
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS vouch_id INTEGER`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_id INTEGER`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vouch_tokens (
      id SERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      telegram_chat_id TEXT,
      telegram_user_id TEXT,
      telegram_username TEXT,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vouches (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      telegram_chat_id TEXT NOT NULL,
      telegram_user_id TEXT NOT NULL,
      telegram_username TEXT,
      telegram_file_id TEXT NOT NULL,
      image_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      reward_amount INTEGER NOT NULL DEFAULT 50,
      credit_transaction_id INTEGER REFERENCES transactions(id),
      admin_chat_id TEXT,
      admin_message_id INTEGER,
      reviewed_by TEXT,
      rejection_reason TEXT,
      balance_before INTEGER,
      balance_after INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS vouch_tokens_order_idx ON vouch_tokens(order_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS vouch_tokens_chat_idx ON vouch_tokens(telegram_chat_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS vouches_order_idx ON vouches(order_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS vouches_chat_idx ON vouches(telegram_chat_id)`);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS vouches_credit_transaction_idx
    ON vouches(credit_transaction_id) WHERE credit_transaction_id IS NOT NULL
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS transactions_vouch_unique_idx
    ON transactions(vouch_id) WHERE vouch_id IS NOT NULL
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS vouches_one_approved_order_idx
    ON vouches(order_id) WHERE status = 'approved'
  `);
}

export async function ensureVouchSchema() {
  await ensureVouchSchemaWithPool();
}

export async function getTelegramBotUrl() {
  const configuredUsername = process.env.TELEGRAM_BOT_USERNAME ?? process.env.BOT_USERNAME;
  if (configuredUsername) return `https://t.me/${configuredUsername.replace(/^@/, "")}`;
  if (telegramBotUsername) return `https://t.me/${telegramBotUsername}`;
  if (telegramBotUsername === null) throw new VouchError("BOT_NOT_CONFIGURED", "Telegram vouch bot is not configured.");

  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? process.env.BOT_TOKEN;
  if (!botToken) {
    telegramBotUsername = null;
    throw new VouchError("BOT_NOT_CONFIGURED", "Telegram vouch bot is not configured.");
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const payload = await response.json() as { ok?: boolean; result?: { username?: string } };
    if (!response.ok || !payload.ok || !payload.result?.username) throw new Error("Telegram bot username unavailable");
    telegramBotUsername = payload.result.username;
    return `https://t.me/${telegramBotUsername}`;
  } catch {
    throw new VouchError("BOT_NOT_CONFIGURED", "Telegram vouch bot is not available right now.");
  }
}

export async function createVouchToken(userId: number, orderId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const orderResult = await client.query(
      `SELECT id, order_id, user_id, status FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [orderId, userId],
    );
    const order = orderResult.rows[0];
    if (!order) throw new VouchError("NOT_FOUND", "Order not found.");
    if (!isEligibleOrder(order.status)) throw new VouchError("INELIGIBLE", "This order is not eligible for a vouch.");

    const existing = await client.query(
      `SELECT id, status FROM vouches WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [orderId],
    );
    if (existing.rows[0]) {
      const status = existing.rows[0].status as VouchStatus;
      throw new VouchError("ALREADY_SUBMITTED", `This order already has a ${status} vouch.`);
    }

    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + VOUCH_TOKEN_TTL_MS);
    await client.query(
      `INSERT INTO vouch_tokens (token_hash, order_id, user_id, expires_at) VALUES ($1, $2, $3, $4)`,
      [hashToken(rawToken), orderId, userId, expiresAt],
    );
    await client.query("COMMIT");
    return { token: rawToken, orderId, orderNumber: order.order_id, expiresAt };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function bindVouchToken(
  token: string,
  telegramChatId: string,
  telegramUserId: string,
  telegramUsername: string | null,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT vt.*, o.order_id AS order_number, o.status AS order_status
       FROM vouch_tokens vt
       JOIN orders o ON o.id = vt.order_id
       WHERE vt.token_hash = $1
       FOR UPDATE`,
      [hashToken(token)],
    );
    const row = result.rows[0];
    if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
      throw new VouchError("INVALID_TOKEN", "This vouch link is invalid or expired.");
    }
    if (
      (row.telegram_chat_id && row.telegram_chat_id !== telegramChatId) ||
      (row.telegram_user_id && row.telegram_user_id !== telegramUserId)
    ) {
      throw new VouchError("INVALID_TOKEN", "This vouch link belongs to a different Telegram user.");
    }
    await client.query(
      `UPDATE vouch_tokens
       SET telegram_chat_id = $1, telegram_user_id = $2, telegram_username = $3
       WHERE id = $4`,
      [telegramChatId, telegramUserId, telegramUsername, row.id],
    );
    await client.query("COMMIT");
    return {
      tokenId: row.id as number,
      orderId: row.order_id as number,
      orderNumber: row.order_number as string,
      userId: row.user_id as number,
      rewardAmount: VOUCH_REWARD_CENTS,
      expiresAt: new Date(row.expires_at),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getActiveVouchToken(telegramChatId: string, telegramUserId: string) {
  const rows = await db
    .select({
      tokenId: vouchTokens.id,
      orderId: vouchTokens.orderId,
      userId: vouchTokens.userId,
      orderNumber: orders.orderId,
      expiresAt: vouchTokens.expiresAt,
    })
    .from(vouchTokens)
    .innerJoin(orders, eq(vouchTokens.orderId, orders.id))
    .where(and(
      eq(vouchTokens.telegramChatId, telegramChatId),
      eq(vouchTokens.telegramUserId, telegramUserId),
      isNull(vouchTokens.usedAt),
      sql`${vouchTokens.expiresAt} > NOW()`,
    ))
    .orderBy(desc(vouchTokens.createdAt))
    .limit(1);
  return rows[0];
}

export async function submitTelegramVouch(input: {
  telegramChatId: string;
  telegramUserId: string;
  telegramUsername: string | null;
  telegramFileId: string;
  imageHash: string;
}) {
  if (!input.telegramChatId || !input.telegramUserId || !input.telegramFileId || !/^[a-f0-9]{64}$/.test(input.imageHash)) {
    throw new VouchError("INVALID_SUBMISSION", "The vouch submission is incomplete.");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tokenResult = await client.query(
      `SELECT vt.*, o.order_id AS order_number, o.status AS order_status
       FROM vouch_tokens vt
       JOIN orders o ON o.id = vt.order_id
       WHERE vt.telegram_chat_id = $1 AND vt.telegram_user_id = $2
       ORDER BY vt.created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [input.telegramChatId, input.telegramUserId],
    );
    const token = tokenResult.rows[0];
    if (!token || token.used_at || new Date(token.expires_at).getTime() <= Date.now()) {
      throw new VouchError("INVALID_TOKEN", "This vouch link is invalid or expired. Return to Orders and generate a new one.");
    }
    if (!isEligibleOrder(token.order_status)) {
      throw new VouchError("INELIGIBLE", "This order is no longer eligible for a vouch.");
    }

    const duplicate = await client.query(`SELECT id FROM vouches WHERE image_hash = $1 LIMIT 1`, [input.imageHash]);
    if (duplicate.rows[0]) {
      await client.query(`UPDATE vouch_tokens SET used_at = NOW() WHERE id = $1`, [token.id]);
      await client.query("COMMIT");
      throw new VouchError("DUPLICATE_IMAGE", "This image has already been submitted.");
    }
    const existing = await client.query(`SELECT id, status FROM vouches WHERE order_id = $1 LIMIT 1`, [token.order_id]);
    if (existing.rows[0]) {
      throw new VouchError("ALREADY_SUBMITTED", "This order already has a vouch under review.");
    }

    const inserted = await client.query(
      `INSERT INTO vouches
       (order_id, user_id, telegram_chat_id, telegram_user_id, telegram_username, telegram_file_id, image_hash, reward_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        token.order_id,
        token.user_id,
        input.telegramChatId,
        input.telegramUserId,
        input.telegramUsername,
        input.telegramFileId,
        input.imageHash,
        VOUCH_REWARD_CENTS,
      ],
    );
    await client.query(`UPDATE vouch_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`, [token.id]);
    await client.query("COMMIT");
    return inserted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function approveVouch(vouchId: number, adminId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const vouchResult = await client.query(`SELECT * FROM vouches WHERE id = $1 FOR UPDATE`, [vouchId]);
    const vouch = vouchResult.rows[0];
    if (!vouch) throw new VouchError("NOT_FOUND", "Vouch not found.");
    if (vouch.status !== "pending") throw new VouchError("ALREADY_REVIEWED", `This vouch is already ${vouch.status}.`);

    const orderResult = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [vouch.order_id]);
    const order = orderResult.rows[0];
    const userResult = await client.query(`SELECT id, balance FROM users WHERE id = $1 FOR UPDATE`, [vouch.user_id]);
    const user = userResult.rows[0];
    if (!order || !user) throw new VouchError("NOT_FOUND", "The order or user no longer exists.");

    const alreadyRewarded = await client.query(
      `SELECT id FROM vouches WHERE order_id = $1 AND status = 'approved' LIMIT 1`,
      [vouch.order_id],
    );
    if (alreadyRewarded.rows[0]) throw new VouchError("ORDER_REWARDED", "This order has already received a vouch reward.");
    if (vouch.credit_transaction_id) throw new VouchError("ALREADY_REWARDED", "This vouch has already generated credit.");

    const balanceBefore = Number(user.balance);
    const balanceAfter = balanceBefore + VOUCH_REWARD_CENTS;
    const updatedUser = await client.query(
      `UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance`,
      [VOUCH_REWARD_CENTS, user.id],
    );
    const transaction = await client.query(
      `INSERT INTO transactions (user_id, amount, type, description, vouch_id, order_id)
       VALUES ($1, $2, 'vouch_reward', $3, $4, $5)
       RETURNING id, created_at`,
      [user.id, VOUCH_REWARD_CENTS, `Approved Telegram vouch for order #${order.order_id}`, vouch.id, order.id],
    );
    const updated = await client.query(
      `UPDATE vouches
       SET status = 'approved', credit_transaction_id = $1, reviewed_by = $2,
           reviewed_at = NOW(), balance_before = $3, balance_after = $4
       WHERE id = $5
       RETURNING *`,
      [transaction.rows[0].id, adminId, balanceBefore, updatedUser.rows[0].balance, vouch.id],
    );
    await client.query("COMMIT");
    return {
      vouch: updated.rows[0],
      chatId: vouch.telegram_chat_id as string,
      rewardAmount: VOUCH_REWARD_CENTS,
      orderNumber: order.order_id as string,
      transactionId: transaction.rows[0].id as number,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectVouch(vouchId: number, adminId: string, reason?: string) {
  const updated = await db
    .update(vouches)
    .set({
      status: "rejected",
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectionReason: reason?.trim().slice(0, 500) || null,
    })
    .where(and(eq(vouches.id, vouchId), eq(vouches.status, "pending")))
    .returning();
  const vouch = updated[0];
  if (!vouch) {
    const existing = await db.select().from(vouches).where(eq(vouches.id, vouchId)).limit(1);
    if (!existing[0]) throw new VouchError("NOT_FOUND", "Vouch not found.");
    throw new VouchError("ALREADY_REVIEWED", `This vouch is already ${existing[0].status}.`);
  }
  return { vouch, chatId: vouch.telegramChatId, orderNumber: (await db.select({ orderNumber: orders.orderId }).from(orders).where(eq(orders.id, vouch.orderId)).limit(1))[0]?.orderNumber ?? "unknown" };
}

export async function getVouchStatusesForOrders(userId: number) {
  return db.select({
    orderId: vouches.orderId,
    status: vouches.status,
    rewardAmount: vouches.rewardAmount,
    reviewedAt: vouches.reviewedAt,
  }).from(vouches).where(eq(vouches.userId, userId)).orderBy(desc(vouches.createdAt));
}

export async function getVouchStats() {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total_submissions,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      COALESCE(SUM(reward_amount) FILTER (WHERE status = 'approved'), 0)::int AS total_credit
    FROM vouches
  `);
  const row = result.rows[0] as any;
  return {
    totalSubmissions: Number(row?.total_submissions ?? 0),
    pending: Number(row?.pending ?? 0),
    approved: Number(row?.approved ?? 0),
    rejected: Number(row?.rejected ?? 0),
    totalCredit: Number(row?.total_credit ?? 0),
  };
}

export async function getRecentVouches(limit = 10) {
  return db.select({
    id: vouches.id,
    orderId: vouches.orderId,
    status: vouches.status,
    rewardAmount: vouches.rewardAmount,
    createdAt: vouches.createdAt,
  }).from(vouches).orderBy(desc(vouches.createdAt)).limit(Math.min(Math.max(limit, 1), 25));
}