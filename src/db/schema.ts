import {
  sqliteTable,
  text,
  primaryKey,
  integer,
} from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "@auth/core/adapters";

export const users = sqliteTable("User", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const accounts = sqliteTable(
  "Account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = sqliteTable("Session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "VerificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => [
    primaryKey({ columns: [vt.identifier, vt.token] }),
  ]
);

export const movies = sqliteTable("Movie", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  meta: text("meta").notNull(),
  tagline: text("tagline").notNull(),
  posterUrl: text("posterUrl").notNull(),
  trailerUrl: text("trailerUrl"),
  tmdbId: integer("tmdbId"),
  order: integer("order").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const votes = sqliteTable("Vote", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  movieId: text("movieId")
    .notNull()
    .references(() => movies.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const pollSettings = sqliteTable("PollSettings", {
  id: text("id").primaryKey().default("singleton"),
  isOpen: integer("isOpen", { mode: "boolean" }).default(true).notNull(),
  closesAt: integer("closesAt", { mode: "timestamp_ms" }),
});

export const recommendations = sqliteTable("Recommendation", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  movieName: text("movieName").notNull(),
  tmdbId: integer("tmdbId"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const emailLogs = sqliteTable("EmailLog", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  errorMsg: text("errorMsg"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});
