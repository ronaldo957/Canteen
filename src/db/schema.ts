import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const roleEnum = pgEnum("role", [
  "customer",
  "admin",
  "kitchen",
  "cashier",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);

export const orderTypeEnum = pgEnum("order_type", ["online", "walk_in"]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "razorpay",
  "cash",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const inventoryTxnTypeEnum = pgEnum("inventory_txn_type", [
  "restock",
  "deduction",
  "adjustment",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "order_status",
  "low_stock",
  "system",
]);

// ---------------------------------------------------------------------------
// roles (reference / metadata table for RBAC, in addition to the enum)
// ---------------------------------------------------------------------------
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: roleEnum("name").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// profiles (application users)
// ---------------------------------------------------------------------------
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    role: roleEnum("role").notNull().default("customer"),
    isActive: boolean("is_active").notNull().default(true),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("profiles_email_idx").on(table.email)],
);

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: text("description").default(""),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// menu_items
// ---------------------------------------------------------------------------
export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description").default(""),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    imageUrl: text("image_url"),
    isVeg: boolean("is_veg").notNull().default(true),
    isAvailable: boolean("is_available").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isSpecialToday: boolean("is_special_today").notNull().default(false),
    prepTimeMinutes: integer("prep_time_minutes").notNull().default(15),
    calories: integer("calories"),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("4.5"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("menu_items_category_idx").on(table.categoryId)],
);

// ---------------------------------------------------------------------------
// carts / cart_items
// ---------------------------------------------------------------------------
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("carts_user_idx").on(table.userId)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    specialInstructions: text("special_instructions").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("cart_items_cart_menu_idx").on(table.cartId, table.menuItemId)],
);

// ---------------------------------------------------------------------------
// orders / order_items
// ---------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    orderType: orderTypeEnum("order_type").notNull().default("online"),
    status: orderStatusEnum("status").notNull().default("placed"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    pickupTime: timestamp("pickup_time", { withTimezone: true }),
    specialInstructions: text("special_instructions").default(""),
    customerName: varchar("customer_name", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 20 }),
    estimatedReadyAt: timestamp("estimated_ready_at", { withTimezone: true }),
    pickupToken: varchar("pickup_token", { length: 64 }),
    pickupVerifiedAt: timestamp("pickup_verified_at", { withTimezone: true }),
    inventoryDeducted: boolean("inventory_deducted").notNull().default(false),
    cancelReason: text("cancel_reason"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    index("orders_user_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    itemName: varchar("item_name", { length: 180 }).notNull(),
    itemPrice: numeric("item_price", { precision: 10, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
    specialInstructions: text("special_instructions").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

// ---------------------------------------------------------------------------
// payments
// ---------------------------------------------------------------------------
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    razorpayOrderId: varchar("razorpay_order_id", { length: 120 }),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 120 }),
    razorpaySignature: text("razorpay_signature"),
    receivedBy: uuid("received_by").references(() => profiles.id, { onDelete: "set null" }),
    idempotencyKey: varchar("idempotency_key", { length: 120 }),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("payments_order_idx").on(table.orderId),
    uniqueIndex("payments_razorpay_order_idx").on(table.razorpayOrderId),
    uniqueIndex("payments_idempotency_idx").on(table.idempotencyKey),
  ],
);

// ---------------------------------------------------------------------------
// inventory_items / recipes / inventory_transactions
// ---------------------------------------------------------------------------
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 180 }).notNull().unique(),
  unit: varchar("unit", { length: 32 }).notNull().default("units"),
  quantityOnHand: numeric("quantity_on_hand", { precision: 12, scale: 2 }).notNull().default("0"),
  minThreshold: numeric("min_threshold", { precision: 12, scale: 2 }).notNull().default("0"),
  costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    quantityRequired: numeric("quantity_required", { precision: 12, scale: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("recipes_menu_inventory_idx").on(table.menuItemId, table.inventoryItemId),
  ],
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    type: inventoryTxnTypeEnum("type").notNull(),
    quantityChange: numeric("quantity_change", { precision: 12, scale: 3 }).notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    note: text("note").default(""),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("inventory_txn_item_idx").on(table.inventoryItemId)],
);

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull().default("system"),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("notifications_user_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// canteen_settings
// ---------------------------------------------------------------------------
export const canteenSettings = pgTable("canteen_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const profilesRelations = relations(profiles, ({ many, one }) => ({
  cart: one(carts, { fields: [profiles.id], references: [carts.userId] }),
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, { fields: [menuItems.categoryId], references: [categories.id] }),
  recipes: many(recipes),
}));

export const cartsRelations = relations(carts, ({ many, one }) => ({
  items: many(cartItems),
  user: one(profiles, { fields: [carts.userId], references: [profiles.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  menuItem: one(menuItems, { fields: [cartItems.menuItemId], references: [menuItems.id] }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  payments: many(payments),
  user: one(profiles, { fields: [orders.userId], references: [profiles.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  recipes: many(recipes),
  transactions: many(inventoryTransactions),
}));

export const recipesRelations = relations(recipes, ({ one }) => ({
  menuItem: one(menuItems, { fields: [recipes.menuItemId], references: [menuItems.id] }),
  inventoryItem: one(inventoryItems, { fields: [recipes.inventoryItemId], references: [inventoryItems.id] }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  inventoryItem: one(inventoryItems, { fields: [inventoryTransactions.inventoryItemId], references: [inventoryItems.id] }),
  order: one(orders, { fields: [inventoryTransactions.orderId], references: [orders.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, { fields: [notifications.userId], references: [profiles.id] }),
}));

export const sqlNow = sql`now()`;
