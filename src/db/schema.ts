import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('dispatcher'),
  title: text('title').notNull().default('Fleet Dispatcher'),
  organization: text('organization').notNull().default('JalurKargo.id'),
  subscriptionPlan: text('subscription_plan').notNull().default('Pro Subscription'),
  avatarUrl: text('avatar_url').notNull().default('/src/assets/images/avatar_manager_1795325384322.jpg'),
  trialDaysLeft: integer('trial_days_left').notNull().default(7),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const drivers = pgTable('drivers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  carrier: text('carrier').notNull(),
  phone: text('phone').notNull(),
  avatarUrl: text('avatar_url').notNull(),
  vehiclePlate: text('vehicle_plate').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  company: text('company').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  city: text('city').notNull(),
  totalShipments: integer('total_shipments').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  orderCode: text('order_code').notNull(),
  trackingRef: text('tracking_ref').notNull(),
  shipmentId: text('shipment_id').notNull(),
  status: text('status').notNull().default('IN TRANSIT'),
  originCode: text('origin_code').notNull(),
  originCity: text('origin_city').notNull(),
  originTime: text('origin_time').notNull(),
  originLat: doublePrecision('origin_lat').notNull(),
  originLng: doublePrecision('origin_lng').notNull(),
  destCode: text('dest_code').notNull(),
  destCity: text('dest_city').notNull(),
  destTime: text('dest_time').notNull(),
  destLat: doublePrecision('dest_lat').notNull(),
  destLng: doublePrecision('dest_lng').notNull(),
  currentLat: doublePrecision('current_lat').notNull(),
  currentLng: doublePrecision('current_lng').notNull(),
  progressPct: integer('progress_pct').notNull().default(50),
  dropoffEta: text('dropoff_eta').notNull(),
  dropoffLocation: text('dropoff_location').notNull(),
  dropoffTag: text('dropoff_tag').notNull(),
  driverId: integer('driver_id').references(() => drivers.id),
  customerId: integer('customer_id').references(() => customers.id),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const shipmentEvents = pgTable('shipment_events', {
  id: serial('id').primaryKey(),
  shipmentRecordId: integer('shipment_record_id')
    .references(() => shipments.id, { onDelete: 'cascade' })
    .notNull(),
  dateLabel: text('date_label').notNull(),
  statusTitle: text('status_title').notNull(),
  timeLabel: text('time_label').notNull(),
  isCompleted: boolean('is_completed').notNull().default(true),
  isEstimated: boolean('is_estimated').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const inboxMessages = pgTable('inbox_messages', {
  id: serial('id').primaryKey(),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull(),
  shipmentRef: text('shipment_ref').notNull(),
  subject: text('subject').notNull(),
  preview: text('preview').notNull(),
  timeLabel: text('time_label').notNull(),
  unread: boolean('unread').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const driverStats = pgTable('driver_stats', {
  id: serial('id').primaryKey(),
  timeframe: text('timeframe').notNull().unique(),
  onTheWayPct: doublePrecision('on_the_way_pct').notNull(),
  unloadingPct: doublePrecision('unloading_pct').notNull(),
  loadingPct: doublePrecision('loading_pct').notNull(),
  onTheWayDuration: text('on_the_way_duration').notNull(),
  unloadingDuration: text('unloading_duration').notNull(),
  loadingDuration: text('loading_duration').notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  prefix: text('prefix').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  createdByUserId: integer('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

