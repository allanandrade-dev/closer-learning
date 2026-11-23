import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  vector,
} from "drizzle-orm/pg-core";

// Better Auth core tables (Drizzle adapter, provider pg, email + password).
// Column shape matches `auth generate` for the pg dialect.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Sign-in looks up a user by email, and one address maps to one user.
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    // The session cookie stores this token, so it must identify one session.
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Sessions are removed with the user.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    // List and revoke every session for a user.
    index("session_userId_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    // Linked providers are removed with the user.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // List the providers linked to one user.
    index("account_userId_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Look up a pending email or password-reset verification by its identifier.
    index("verification_identifier_idx").on(table.identifier),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const levels = pgTable(
  "levels",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    order: integer("order").notNull(),
    title: text("title").notNull(),
    challengeType: text("challenge_type").notNull(),
    xpReward: integer("xp_reward").notNull(),
    passMark: integer("pass_mark").notNull(),
  },
  (table) => [
    // Seed upsert key and the stable public id for a level.
    unique("levels_slug_unique").on(table.slug),
    // One level occupies each position on the path.
    unique("levels_order_unique").on(table.order),
    // Only the three playable challenge kinds.
    check(
      "levels_challenge_type_check",
      sql`${table.challengeType} in ('vectors', 'embeddings', 'search')`,
    ),
  ],
);

export const progress = pgTable(
  "progress",
  {
    id: serial("id").primaryKey(),
    // Progress is removed with the user.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The level this progress row records.
    levelId: integer("level_id")
      .notNull()
      .references(() => levels.id),
    passed: boolean("passed").notNull().default(false),
    bestScore: integer("best_score").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    passedAt: timestamp("passed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One row per user and level. Leading user_id also serves per-user lookups.
    unique("progress_user_id_level_id_unique").on(table.userId, table.levelId),
  ],
);

export const words = pgTable(
  "words",
  {
    id: serial("id").primaryKey(),
    roundId: integer("round_id").notNull(),
    role: text("role").notNull(),
    text: text("text").notNull(),
    // Nullable until VDB-8 seeds embeddings.
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (table) => [
    // Unique (round_id, text). Leftmost round_id covers lookups by round.
    // No ANN index: the table is tiny and an exact scan is correct.
    unique("words_round_id_text_unique").on(table.roundId, table.text),
    // A word is either the target or a candidate in its round.
    check("words_role_check", sql`${table.role} in ('target', 'candidate')`),
  ],
);

export const docs = pgTable(
  "docs",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (table) => [
    // Title identifies a document for seeding and lookup.
    unique("docs_title_unique").on(table.title),
  ],
);
