import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { createServer as createViteServer } from 'vite';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ensureSchema, getDb, memoryStore } from './src/db/index.ts';
import {
  apiKeys,
  customers,
  drivers,
  driverStats,
  inboxMessages,
  shipmentEvents,
  shipments,
  users,
} from './src/db/schema.ts';
import {
  createSessionToken,
  generateRawApiKey,
  hashPassword,
  requireAuth,
  requireIngestApiKey,
  verifyPassword,
  type AuthenticatedRequest,
} from './src/server/auth.ts';
import { openApiSpec } from './src/server/swagger.ts';
import type {
  AuthUser,
  CustomerItem,
  DriverStatItem,
  InboxMessageItem,
  ShipmentEventItem,
  ShipmentItem,
  TelemetryUpdatePayload,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Zod Schemas ---

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(6).max(128),
  title: z.string().trim().min(2).max(80).optional(),
  organization: z.string().trim().min(2).max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(128),
});

const createApiKeySchema = z.object({
  name: z.string().trim().min(2).max(80),
});

const createShipmentSchema = z.object({
  orderCode: z.string().trim().min(3).max(60),
  trackingRef: z.string().trim().min(3).max(40),
  shipmentId: z.string().trim().min(3).max(40).optional(),
  status: z.enum(['IN TRANSIT', 'PENDING', 'DELIVERED']).default('IN TRANSIT'),
  originCode: z.string().trim().min(2).max(10).toUpperCase(),
  originCity: z.string().trim().min(2).max(80),
  originTime: z.string().trim().min(2).max(40),
  originLat: z.number().min(-90).max(90).default(40.758),
  originLng: z.number().min(-180).max(180).default(-73.9855),
  destCode: z.string().trim().min(2).max(10).toUpperCase(),
  destCity: z.string().trim().min(2).max(80),
  destTime: z.string().trim().min(2).max(40),
  destLat: z.number().min(-90).max(90).default(40.7128),
  destLng: z.number().min(-180).max(180).default(-73.9442),
  progressPct: z.number().int().min(0).max(100).default(25),
  dropoffEta: z.string().trim().min(2).max(30).default('9:45 AM'),
  dropoffLocation: z.string().trim().min(2).max(100).default('Central Freight Terminal'),
  dropoffTag: z.string().trim().min(2).max(30).default('JKG436437RT'),
  driverId: z.number().int().positive().optional(),
});

const updateShipmentSchema = z.object({
  status: z.enum(['IN TRANSIT', 'PENDING', 'DELIVERED']).optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
  dropoffEta: z.string().trim().min(2).max(30).optional(),
  dropoffLocation: z.string().trim().min(2).max(100).optional(),
});

const ingestShipmentItemSchema = z.object({
  orderCode: z.string().trim().min(3).max(60),
  trackingRef: z.string().trim().min(2).max(40),
  shipmentId: z.string().trim().min(3).max(40).optional(),
  status: z.enum(['IN TRANSIT', 'PENDING', 'DELIVERED']).default('IN TRANSIT'),
  originCode: z.string().trim().min(2).max(10).toUpperCase(),
  originCity: z.string().trim().min(2).max(80),
  originTime: z.string().trim().min(2).max(40),
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destCode: z.string().trim().min(2).max(10).toUpperCase(),
  destCity: z.string().trim().min(2).max(80),
  destTime: z.string().trim().min(2).max(40),
  destLat: z.number().min(-90).max(90),
  destLng: z.number().min(-180).max(180),
  currentLat: z.number().min(-90).max(90).optional(),
  currentLng: z.number().min(-180).max(180).optional(),
  progressPct: z.number().int().min(0).max(100).default(0),
  dropoffEta: z.string().trim().min(2).max(30).default('8:32 AM'),
  dropoffLocation: z.string().trim().min(2).max(100).default('Central Hub'),
  dropoffTag: z.string().trim().min(2).max(30).default('JKG000001RT'),
  driver: z
    .object({
      name: z.string().trim().min(2).max(80),
      carrier: z.string().trim().min(2).max(80),
      phone: z.string().trim().min(4).max(40).default('+62 812-0000-0000'),
      avatarUrl: z.string().trim().optional(),
      vehiclePlate: z.string().trim().min(2).max(30),
    })
    .optional(),
  events: z
    .array(
      z.object({
        dateLabel: z.string().trim().min(2).max(60),
        statusTitle: z.string().trim().min(2).max(60),
        timeLabel: z.string().trim().min(2).max(30),
        isCompleted: z.boolean().default(true),
        isEstimated: z.boolean().default(false),
      })
    )
    .optional(),
});

const ingestTelemetrySchema = z.object({
  orderCode: z.string().trim().min(3).max(60),
  currentLat: z.number().min(-90).max(90),
  currentLng: z.number().min(-180).max(180),
  progressPct: z.number().int().min(0).max(100),
  status: z.enum(['IN TRANSIT', 'PENDING', 'DELIVERED']).optional(),
  dropoffEta: z.string().trim().min(2).max(30).optional(),
});

const ingestEventSchema = z.object({
  orderCode: z.string().trim().min(3).max(60),
  dateLabel: z.string().trim().min(2).max(60),
  statusTitle: z.string().trim().min(2).max(60),
  timeLabel: z.string().trim().min(2).max(30),
  isCompleted: z.boolean().default(true),
  isEstimated: z.boolean().default(false),
});

const ingestStatsSchema = z.object({
  timeframe: z.enum(['W', 'M', '6M', 'Y']),
  onTheWayPct: z.number().min(0).max(100),
  unloadingPct: z.number().min(0).max(100),
  loadingPct: z.number().min(0).max(100),
  onTheWayDuration: z.string().trim().min(2).max(40),
  unloadingDuration: z.string().trim().min(2).max(40),
  loadingDuration: z.string().trim().min(2).max(40),
});

const ingestCustomerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  company: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(4).max(40),
  city: z.string().trim().min(2).max(80),
  totalShipments: z.number().int().min(0).default(1),
  status: z.string().trim().min(2).max(30).default('ACTIVE'),
});

const ingestInboxSchema = z.object({
  senderName: z.string().trim().min(2).max(80),
  senderRole: z.string().trim().min(2).max(80),
  shipmentRef: z.string().trim().min(2).max(60),
  subject: z.string().trim().min(2).max(140),
  preview: z.string().trim().min(2).max(300),
  timeLabel: z.string().trim().min(1).max(30).default('Just now'),
});

function sanitizeUser(u: typeof users.$inferSelect | (AuthUser & { passwordHash?: string })): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title,
    organization: u.organization,
    subscriptionPlan: u.subscriptionPlan,
    avatarUrl: u.avatarUrl,
    trialDaysLeft: u.trialDaysLeft,
  };
}

async function fetchFullShipments(): Promise<ShipmentItem[]> {
  const db = getDb();
  if (!db) {
    return memoryStore.shipments;
  }

  const allShipments = await db.select().from(shipments).orderBy(asc(shipments.id));
  const allDrivers = await db.select().from(drivers);
  const allEvents = await db.select().from(shipmentEvents).orderBy(asc(shipmentEvents.sortOrder));

  const driverMap: Record<number, typeof drivers.$inferSelect> = {};
  for (const d of allDrivers) {
    driverMap[d.id] = d;
  }

  const eventsByShipment: Record<number, typeof shipmentEvents.$inferSelect[]> = {};
  for (const ev of allEvents) {
    if (!eventsByShipment[ev.shipmentRecordId]) {
      eventsByShipment[ev.shipmentRecordId] = [];
    }
    eventsByShipment[ev.shipmentRecordId].push(ev);
  }

  return allShipments.map((s) => ({
    id: s.id,
    orderCode: s.orderCode,
    trackingRef: s.trackingRef,
    shipmentId: s.shipmentId,
    status: s.status as ShipmentItem['status'],
    originCode: s.originCode,
    originCity: s.originCity,
    originTime: s.originTime,
    originLat: s.originLat,
    originLng: s.originLng,
    destCode: s.destCode,
    destCity: s.destCity,
    destTime: s.destTime,
    destLat: s.destLat,
    destLng: s.destLng,
    currentLat: s.currentLat,
    currentLng: s.currentLng,
    progressPct: s.progressPct,
    dropoffEta: s.dropoffEta,
    dropoffLocation: s.dropoffLocation,
    dropoffTag: s.dropoffTag,
    driverId: s.driverId,
    customerId: s.customerId,
    driver: s.driverId && driverMap[s.driverId] ? driverMap[s.driverId] : null,
    events: eventsByShipment[s.id] ?? [],
  }));
}

async function upsertIngestedShipment(
  item: z.infer<typeof ingestShipmentItemSchema>
): Promise<ShipmentItem> {
  const db = getDb();
  const normalizedRef = item.trackingRef.startsWith('#') ? item.trackingRef : `#${item.trackingRef}`;
  const generatedShipmentId =
    item.shipmentId || `#${Math.floor(100000 + Math.random() * 899999)}-25-800${item.destCode}`;
  const currentLat =
    item.currentLat ??
    item.originLat + ((item.destLat - item.originLat) * item.progressPct) / 100;
  const currentLng =
    item.currentLng ??
    item.originLng + ((item.destLng - item.originLng) * item.progressPct) / 100;

  if (!db) {
    let driverObj = item.driver
      ? memoryStore.drivers.find((d) => d.vehiclePlate === item.driver!.vehiclePlate)
      : memoryStore.drivers[0];

    if (item.driver && !driverObj) {
      driverObj = {
        id: memoryStore.nextId++,
        name: item.driver.name,
        carrier: item.driver.carrier,
        phone: item.driver.phone,
        avatarUrl: item.driver.avatarUrl || '/src/assets/images/avatar_driver_1795325383900.jpg',
        vehiclePlate: item.driver.vehiclePlate,
      };
      memoryStore.drivers.push(driverObj);
    }

    const existingIdx = memoryStore.shipments.findIndex((s) => s.orderCode === item.orderCode);
    const recordId = existingIdx >= 0 ? memoryStore.shipments[existingIdx].id : memoryStore.nextId++;

    const events: ShipmentEventItem[] = (item.events ?? []).map((ev, idx) => ({
      id: memoryStore.nextId++,
      shipmentRecordId: recordId,
      dateLabel: ev.dateLabel,
      statusTitle: ev.statusTitle,
      timeLabel: ev.timeLabel,
      isCompleted: ev.isCompleted,
      isEstimated: ev.isEstimated,
      sortOrder: idx,
    }));

    const full: ShipmentItem = {
      id: recordId,
      orderCode: item.orderCode,
      trackingRef: normalizedRef,
      shipmentId: generatedShipmentId,
      status: item.status,
      originCode: item.originCode,
      originCity: item.originCity,
      originTime: item.originTime,
      originLat: item.originLat,
      originLng: item.originLng,
      destCode: item.destCode,
      destCity: item.destCity,
      destTime: item.destTime,
      destLat: item.destLat,
      destLng: item.destLng,
      currentLat,
      currentLng,
      progressPct: item.progressPct,
      dropoffEta: item.dropoffEta,
      dropoffLocation: item.dropoffLocation,
      dropoffTag: item.dropoffTag,
      driverId: driverObj?.id ?? null,
      customerId: null,
      driver: driverObj ?? null,
      events:
        events.length > 0
          ? events
          : existingIdx >= 0
            ? memoryStore.shipments[existingIdx].events
            : [],
    };

    if (existingIdx >= 0) {
      memoryStore.shipments[existingIdx] = full;
    } else {
      memoryStore.shipments.push(full);
    }
    return full;
  }

  // PostgreSQL Drizzle path
  let driverId: number | null = null;
  if (item.driver) {
    const [existingDriver] = await db
      .select()
      .from(drivers)
      .where(eq(drivers.vehiclePlate, item.driver.vehiclePlate))
      .limit(1);

    if (existingDriver) {
      driverId = existingDriver.id;
    } else {
      const [createdDriver] = await db
        .insert(drivers)
        .values({
          name: item.driver.name,
          carrier: item.driver.carrier,
          phone: item.driver.phone,
          avatarUrl:
            item.driver.avatarUrl || '/src/assets/images/avatar_driver_1795325383900.jpg',
          vehiclePlate: item.driver.vehiclePlate,
        })
        .returning();
      driverId = createdDriver.id;
    }
  }

  const [existingShipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.orderCode, item.orderCode))
    .limit(1);

  let shipmentRecordId: number;
  if (existingShipment) {
    await db
      .update(shipments)
      .set({
        trackingRef: normalizedRef,
        shipmentId: generatedShipmentId,
        status: item.status,
        originCode: item.originCode,
        originCity: item.originCity,
        originTime: item.originTime,
        originLat: item.originLat,
        originLng: item.originLng,
        destCode: item.destCode,
        destCity: item.destCity,
        destTime: item.destTime,
        destLat: item.destLat,
        destLng: item.destLng,
        currentLat,
        currentLng,
        progressPct: item.progressPct,
        dropoffEta: item.dropoffEta,
        dropoffLocation: item.dropoffLocation,
        dropoffTag: item.dropoffTag,
        driverId: driverId ?? existingShipment.driverId,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, existingShipment.id));
    shipmentRecordId = existingShipment.id;
  } else {
    const [created] = await db
      .insert(shipments)
      .values({
        orderCode: item.orderCode,
        trackingRef: normalizedRef,
        shipmentId: generatedShipmentId,
        status: item.status,
        originCode: item.originCode,
        originCity: item.originCity,
        originTime: item.originTime,
        originLat: item.originLat,
        originLng: item.originLng,
        destCode: item.destCode,
        destCity: item.destCity,
        destTime: item.destTime,
        destLat: item.destLat,
        destLng: item.destLng,
        currentLat,
        currentLng,
        progressPct: item.progressPct,
        dropoffEta: item.dropoffEta,
        dropoffLocation: item.dropoffLocation,
        dropoffTag: item.dropoffTag,
        driverId,
      })
      .returning();
    shipmentRecordId = created.id;
  }

  if (item.events && item.events.length > 0) {
    await db.delete(shipmentEvents).where(eq(shipmentEvents.shipmentRecordId, shipmentRecordId));
    await db.insert(shipmentEvents).values(
      item.events.map((ev, idx) => ({
        shipmentRecordId,
        dateLabel: ev.dateLabel,
        statusTitle: ev.statusTitle,
        timeLabel: ev.timeLabel,
        isCompleted: ev.isCompleted,
        isEstimated: ev.isEstimated,
        sortOrder: idx,
      }))
    );
  }

  const all = await fetchFullShipments();
  return all.find((s) => s.id === shipmentRecordId)!;
}

async function startServer() {
  const dbStatus = await ensureSchema();
  console.log(`[JalurKargo] Storage mode: ${dbStatus.mode}`);

  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: false,
    },
  });

  io.on('connection', (socket) => {
    socket.emit('system:connected', {
      storage: getDb() ? 'postgres' : 'memory',
      timestamp: new Date().toISOString(),
    });
  });

  app.use(express.json({ limit: '2mb' }));

  // Swagger OpenAPI Documentation
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'JalurKargo API Documentation',
    })
  );

  // Health & status
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      storage: getDb() ? 'postgres' : 'memory',
      mapsConfigured: Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY),
      realtime: 'socket.io',
      docsUrl: '/api/docs',
    });
  });

  // =========================================================
  // 1. APP USER AUTHENTICATION (User-based Login)
  // =========================================================

  app.get('/api/auth/status', async (_req, res) => {
    try {
      const db = getDb();
      if (!db) {
        res.json({ hasUsers: memoryStore.users.length > 0, storage: 'memory' });
        return;
      }
      const existing = await db.select({ id: users.id }).from(users).limit(1);
      res.json({ hasUsers: existing.length > 0, storage: 'postgres' });
    } catch {
      res.status(500).json({ error: 'Failed to check auth status' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid registration data' });
      return;
    }

    const { name, email, password, title, organization } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const passwordHash = hashPassword(password);

    try {
      const db = getDb();
      if (!db) {
        if (memoryStore.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          res.status(409).json({ error: 'An account with this email already exists.' });
          return;
        }
        const isFirst = memoryStore.users.length === 0;
        const newUser = {
          id: memoryStore.nextId++,
          name,
          email: normalizedEmail,
          passwordHash,
          role: isFirst ? 'founder' : 'dispatcher',
          title: title || (isFirst ? 'Founder of JalurKargo' : 'Fleet Dispatcher'),
          organization: organization || 'JalurKargo.id',
          subscriptionPlan: 'Pro Subscription',
          avatarUrl: '/src/assets/images/avatar_manager_1795325384322.jpg',
          trialDaysLeft: 7,
        };
        memoryStore.users.push(newUser);
        const safeUser = sanitizeUser(newUser);
        const token = createSessionToken(safeUser);
        res.status(201).json({ user: safeUser, token });
        return;
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existing.length > 0) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }

      const allExisting = await db.select({ id: users.id }).from(users).limit(1);
      const isFirst = allExisting.length === 0;

      const [created] = await db
        .insert(users)
        .values({
          name,
          email: normalizedEmail,
          passwordHash,
          role: isFirst ? 'founder' : 'dispatcher',
          title: title || (isFirst ? 'Founder of JalurKargo' : 'Fleet Dispatcher'),
          organization: organization || 'JalurKargo.id',
          subscriptionPlan: 'Pro Subscription',
        })
        .returning();

      const safeUser = sanitizeUser(created);
      const token = createSessionToken(safeUser);
      res.status(201).json({ user: safeUser, token });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Failed to create account.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Valid email and password are required.' });
      return;
    }
    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    try {
      const db = getDb();
      if (!db) {
        const found = memoryStore.users.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (!found || !verifyPassword(password, found.passwordHash)) {
          res.status(401).json({ error: 'Invalid email or password.' });
          return;
        }
        const safeUser = sanitizeUser(found);
        const token = createSessionToken(safeUser);
        res.json({ user: safeUser, token });
        return;
      }

      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (!found || !verifyPassword(password, found.passwordHash)) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const safeUser = sanitizeUser(found);
      const token = createSessionToken(safeUser);
      res.json({ user: safeUser, token });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Failed to sign in.' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    const uid = req.auth!.uid;
    try {
      const db = getDb();
      if (!db) {
        const found = memoryStore.users.find((u) => u.id === uid);
        if (!found) {
          res.status(404).json({ error: 'User not found.' });
          return;
        }
        res.json({ user: sanitizeUser(found) });
        return;
      }

      const [found] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
      if (!found) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      res.json({ user: sanitizeUser(found) });
    } catch {
      res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
  });

  // =========================================================
  // 2. INGEST API KEY MANAGEMENT (Protected by User Auth)
  // =========================================================

  app.get('/api/keys', requireAuth, async (_req: AuthenticatedRequest, res) => {
    try {
      const db = getDb();
      if (!db) {
        res.json({
          keys: memoryStore.apiKeys.map((k) => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            lastUsedAt: k.lastUsedAt,
            createdAt: k.createdAt,
          })),
          envKeyConfigured: Boolean(process.env.INGEST_API_KEY?.trim()),
        });
        return;
      }

      const rows = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          prefix: apiKeys.prefix,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .orderBy(desc(apiKeys.createdAt));

      res.json({
        keys: rows.map((r) => ({
          ...r,
          lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        })),
        envKeyConfigured: Boolean(process.env.INGEST_API_KEY?.trim()),
      });
    } catch {
      res.status(500).json({ error: 'Failed to list API keys.' });
    }
  });

  app.post('/api/keys', requireAuth, async (req: AuthenticatedRequest, res) => {
    const parsed = createApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid API key name.' });
      return;
    }

    const { rawKey, prefix, keyHash } = generateRawApiKey();
    try {
      const db = getDb();
      if (!db) {
        const record = {
          id: memoryStore.nextId++,
          name: parsed.data.name,
          prefix,
          keyHash,
          createdByUserId: req.auth!.uid,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        };
        memoryStore.apiKeys.unshift(record);
        res.status(201).json({
          apiKey: {
            id: record.id,
            name: record.name,
            prefix: record.prefix,
            lastUsedAt: record.lastUsedAt,
            createdAt: record.createdAt,
          },
          rawKey,
        });
        return;
      }

      const [created] = await db
        .insert(apiKeys)
        .values({
          name: parsed.data.name,
          prefix,
          keyHash,
          createdByUserId: req.auth!.uid,
        })
        .returning();

      res.status(201).json({
        apiKey: {
          id: created.id,
          name: created.name,
          prefix: created.prefix,
          lastUsedAt: null,
          createdAt: created.createdAt.toISOString(),
        },
        rawKey,
      });
    } catch {
      res.status(500).json({ error: 'Failed to generate API key.' });
    }
  });

  app.delete('/api/keys/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid API key ID.' });
      return;
    }

    try {
      const db = getDb();
      if (!db) {
        const idx = memoryStore.apiKeys.findIndex((k) => k.id === id);
        if (idx === -1) {
          res.status(404).json({ error: 'API key not found.' });
          return;
        }
        memoryStore.apiKeys.splice(idx, 1);
        res.json({ ok: true });
        return;
      }

      const deleted = await db
        .delete(apiKeys)
        .where(eq(apiKeys.id, id))
        .returning({ id: apiKeys.id });
      if (deleted.length === 0) {
        res.status(404).json({ error: 'API key not found.' });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to revoke API key.' });
    }
  });

  // =========================================================
  // 3. EXTERNAL INGEST API (Protected Strictly by API Key)
  // =========================================================

  app.post('/api/ingest/shipments', requireIngestApiKey, async (req, res) => {
    const payloadArray = Array.isArray(req.body?.shipments)
      ? req.body.shipments
      : Array.isArray(req.body)
        ? req.body
        : [req.body];

    const parsed = z.array(ingestShipmentItemSchema).min(1).max(100).safeParse(payloadArray);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid shipment ingest payload' });
      return;
    }

    try {
      const results: ShipmentItem[] = [];
      for (const item of parsed.data) {
        const upserted = await upsertIngestedShipment(item);
        results.push(upserted);
        io.emit('shipment:upserted', upserted);
      }
      res.status(200).json({ ingested: results.length, shipments: results });
    } catch (err) {
      console.error('Ingest shipments error:', err);
      res.status(500).json({ error: 'Failed to ingest shipments.' });
    }
  });

  app.post('/api/ingest/telemetry', requireIngestApiKey, async (req, res) => {
    const parsed = ingestTelemetrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid telemetry payload' });
      return;
    }
    const { orderCode, currentLat, currentLng, progressPct, status, dropoffEta } = parsed.data;

    try {
      const db = getDb();
      let payload: TelemetryUpdatePayload;

      if (!db) {
        const found = memoryStore.shipments.find((s) => s.orderCode === orderCode);
        if (!found) {
          res.status(404).json({ error: `Shipment ${orderCode} not found.` });
          return;
        }
        found.currentLat = currentLat;
        found.currentLng = currentLng;
        found.progressPct = progressPct;
        if (status) found.status = status;
        if (dropoffEta) found.dropoffEta = dropoffEta;

        payload = {
          id: found.id,
          orderCode: found.orderCode,
          shipmentId: found.shipmentId,
          currentLat: found.currentLat,
          currentLng: found.currentLng,
          progressPct: found.progressPct,
          status: found.status,
          dropoffEta: found.dropoffEta,
        };
      } else {
        const [existing] = await db
          .select()
          .from(shipments)
          .where(eq(shipments.orderCode, orderCode))
          .limit(1);

        if (!existing) {
          res.status(404).json({ error: `Shipment ${orderCode} not found.` });
          return;
        }

        const nextStatus = (status ?? existing.status) as TelemetryUpdatePayload['status'];
        const nextEta = dropoffEta ?? existing.dropoffEta;

        await db
          .update(shipments)
          .set({
            currentLat,
            currentLng,
            progressPct,
            status: nextStatus,
            dropoffEta: nextEta,
            updatedAt: new Date(),
          })
          .where(eq(shipments.id, existing.id));

        payload = {
          id: existing.id,
          orderCode: existing.orderCode,
          shipmentId: existing.shipmentId,
          currentLat,
          currentLng,
          progressPct,
          status: nextStatus,
          dropoffEta: nextEta,
        };
      }

      io.emit('telemetry:updated', payload);
      res.json({ ok: true, telemetry: payload });
    } catch (err) {
      console.error('Ingest telemetry error:', err);
      res.status(500).json({ error: 'Failed to ingest telemetry.' });
    }
  });

  app.post('/api/ingest/events', requireIngestApiKey, async (req, res) => {
    const parsed = ingestEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid event payload' });
      return;
    }
    const data = parsed.data;

    try {
      const db = getDb();
      if (!db) {
        const found = memoryStore.shipments.find((s) => s.orderCode === data.orderCode);
        if (!found) {
          res.status(404).json({ error: `Shipment ${data.orderCode} not found.` });
          return;
        }
        const ev: ShipmentEventItem = {
          id: memoryStore.nextId++,
          shipmentRecordId: found.id,
          dateLabel: data.dateLabel,
          statusTitle: data.statusTitle,
          timeLabel: data.timeLabel,
          isCompleted: data.isCompleted,
          isEstimated: data.isEstimated,
          sortOrder: found.events.length,
        };
        found.events.unshift(ev);
        io.emit('shipment:upserted', found);
        res.status(201).json({ event: ev });
        return;
      }

      const [found] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.orderCode, data.orderCode))
        .limit(1);

      if (!found) {
        res.status(404).json({ error: `Shipment ${data.orderCode} not found.` });
        return;
      }

      const [ev] = await db
        .insert(shipmentEvents)
        .values({
          shipmentRecordId: found.id,
          dateLabel: data.dateLabel,
          statusTitle: data.statusTitle,
          timeLabel: data.timeLabel,
          isCompleted: data.isCompleted,
          isEstimated: data.isEstimated,
          sortOrder: 0,
        })
        .returning();

      const all = await fetchFullShipments();
      const updated = all.find((s) => s.id === found.id);
      if (updated) {
        io.emit('shipment:upserted', updated);
      }
      res.status(201).json({ event: ev });
    } catch (err) {
      console.error('Ingest event error:', err);
      res.status(500).json({ error: 'Failed to ingest shipment event.' });
    }
  });

  app.post('/api/ingest/stats', requireIngestApiKey, async (req, res) => {
    const parsed = ingestStatsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid stats payload' });
      return;
    }
    const data = parsed.data;

    try {
      const db = getDb();
      let statItem: DriverStatItem;

      if (!db) {
        const idx = memoryStore.driverStats.findIndex((s) => s.timeframe === data.timeframe);
        if (idx >= 0) {
          memoryStore.driverStats[idx] = { ...memoryStore.driverStats[idx], ...data };
          statItem = memoryStore.driverStats[idx];
        } else {
          statItem = { id: memoryStore.nextId++, ...data };
          memoryStore.driverStats.push(statItem);
        }
      } else {
        const [existing] = await db
          .select()
          .from(driverStats)
          .where(eq(driverStats.timeframe, data.timeframe))
          .limit(1);

        if (existing) {
          const [updated] = await db
            .update(driverStats)
            .set(data)
            .where(eq(driverStats.id, existing.id))
            .returning();
          statItem = updated as DriverStatItem;
        } else {
          const [created] = await db.insert(driverStats).values(data).returning();
          statItem = created as DriverStatItem;
        }
      }

      io.emit('stats:updated', statItem);
      res.json({ stat: statItem });
    } catch (err) {
      console.error('Ingest stats error:', err);
      res.status(500).json({ error: 'Failed to ingest driver stats.' });
    }
  });

  app.post('/api/ingest/customers', requireIngestApiKey, async (req, res) => {
    const parsed = ingestCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid customer payload' });
      return;
    }
    const data = parsed.data;

    try {
      const db = getDb();
      let customerItem: CustomerItem;

      if (!db) {
        const idx = memoryStore.customers.findIndex((c) => c.email === data.email);
        if (idx >= 0) {
          memoryStore.customers[idx] = { ...memoryStore.customers[idx], ...data };
          customerItem = memoryStore.customers[idx];
        } else {
          customerItem = { id: memoryStore.nextId++, ...data };
          memoryStore.customers.push(customerItem);
        }
      } else {
        const [existing] = await db
          .select()
          .from(customers)
          .where(eq(customers.email, data.email))
          .limit(1);

        if (existing) {
          const [updated] = await db
            .update(customers)
            .set(data)
            .where(eq(customers.id, existing.id))
            .returning();
          customerItem = updated;
        } else {
          const [created] = await db.insert(customers).values(data).returning();
          customerItem = created;
        }
      }

      io.emit('customer:upserted', customerItem);
      res.json({ customer: customerItem });
    } catch (err) {
      console.error('Ingest customer error:', err);
      res.status(500).json({ error: 'Failed to ingest customer.' });
    }
  });

  app.post('/api/ingest/inbox', requireIngestApiKey, async (req, res) => {
    const parsed = ingestInboxSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid inbox payload' });
      return;
    }
    const data = parsed.data;

    try {
      const db = getDb();
      let messageItem: InboxMessageItem;

      if (!db) {
        messageItem = {
          id: memoryStore.nextId++,
          ...data,
          unread: true,
        };
        memoryStore.inboxMessages.unshift(messageItem);
      } else {
        const [created] = await db
          .insert(inboxMessages)
          .values({
            ...data,
            unread: true,
          })
          .returning();
        messageItem = created;
      }

      io.emit('inbox:received', messageItem);
      res.status(201).json({ message: messageItem });
    } catch (err) {
      console.error('Ingest inbox error:', err);
      res.status(500).json({ error: 'Failed to ingest inbox message.' });
    }
  });

  // =========================================================
  // 4. APPLICATION DASHBOARD ROUTES (Read + User Auth CRUD)
  // =========================================================

  app.get('/api/shipments', async (req, res) => {
    try {
      const list = await fetchFullShipments();
      const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
      const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';

      const filtered = list.filter((s) => {
        const matchesStatus = !status || status === 'ALL' || s.status === status;
        const matchesQuery =
          !q ||
          s.orderCode.toLowerCase().includes(q) ||
          s.trackingRef.toLowerCase().includes(q) ||
          s.originCity.toLowerCase().includes(q) ||
          s.destCity.toLowerCase().includes(q) ||
          s.originCode.toLowerCase().includes(q) ||
          s.destCode.toLowerCase().includes(q);
        return matchesStatus && matchesQuery;
      });

      res.json({ shipments: filtered });
    } catch (err) {
      console.error('Fetch shipments error:', err);
      res.status(500).json({ error: 'Failed to load shipments.' });
    }
  });

  app.post('/api/shipments', requireAuth, async (req: AuthenticatedRequest, res) => {
    const parsed = createShipmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid shipment payload' });
      return;
    }
    const data = parsed.data;
    const progress = data.progressPct;
    const currentLat = data.originLat + ((data.destLat - data.originLat) * progress) / 100;
    const currentLng = data.originLng + ((data.destLng - data.originLng) * progress) / 100;
    const generatedShipmentId =
      data.shipmentId || `#${Math.floor(100000 + Math.random() * 899999)}-25-800${data.destCode}`;

    try {
      const db = getDb();
      if (!db) {
        const driver = memoryStore.drivers.find((d) => d.id === data.driverId) ?? null;
        const newId = memoryStore.nextId++;
        const newShipment: ShipmentItem = {
          id: newId,
          orderCode: data.orderCode,
          trackingRef: data.trackingRef.startsWith('#') ? data.trackingRef : `#${data.trackingRef}`,
          shipmentId: generatedShipmentId,
          status: data.status,
          originCode: data.originCode,
          originCity: data.originCity,
          originTime: data.originTime,
          originLat: data.originLat,
          originLng: data.originLng,
          destCode: data.destCode,
          destCity: data.destCity,
          destTime: data.destTime,
          destLat: data.destLat,
          destLng: data.destLng,
          currentLat,
          currentLng,
          progressPct: progress,
          dropoffEta: data.dropoffEta,
          dropoffLocation: data.dropoffLocation,
          dropoffTag: data.dropoffTag,
          driverId: driver?.id ?? null,
          customerId: null,
          driver,
          events: [
            {
              id: memoryStore.nextId++,
              shipmentRecordId: newId,
              dateLabel: 'Estimated Drop-off',
              statusTitle: 'Delivered',
              timeLabel: data.dropoffEta,
              isCompleted: data.status === 'DELIVERED',
              isEstimated: true,
              sortOrder: 0,
            },
            {
              id: memoryStore.nextId++,
              shipmentRecordId: newId,
              dateLabel: 'Today',
              statusTitle: data.status === 'PENDING' ? 'Order Confirmed' : 'In Transit',
              timeLabel: '09:15 AM',
              isCompleted: true,
              isEstimated: false,
              sortOrder: 1,
            },
          ],
        };
        memoryStore.shipments.unshift(newShipment);
        io.emit('shipment:upserted', newShipment);
        res.status(201).json({ shipment: newShipment });
        return;
      }

      const [driverRow] = await db.select().from(drivers).limit(1);
      const driverId = data.driverId ?? driverRow?.id ?? null;

      const [created] = await db
        .insert(shipments)
        .values({
          orderCode: data.orderCode,
          trackingRef: data.trackingRef.startsWith('#') ? data.trackingRef : `#${data.trackingRef}`,
          shipmentId: generatedShipmentId,
          status: data.status,
          originCode: data.originCode,
          originCity: data.originCity,
          originTime: data.originTime,
          originLat: data.originLat,
          originLng: data.originLng,
          destCode: data.destCode,
          destCity: data.destCity,
          destTime: data.destTime,
          destLat: data.destLat,
          destLng: data.destLng,
          currentLat,
          currentLng,
          progressPct: progress,
          dropoffEta: data.dropoffEta,
          dropoffLocation: data.dropoffLocation,
          dropoffTag: data.dropoffTag,
          driverId,
          userId: req.auth!.uid,
        })
        .returning();

      await db.insert(shipmentEvents).values([
        {
          shipmentRecordId: created.id,
          dateLabel: 'Estimated Drop-off',
          statusTitle: 'Delivered',
          timeLabel: data.dropoffEta,
          isCompleted: data.status === 'DELIVERED',
          isEstimated: true,
          sortOrder: 0,
        },
        {
          shipmentRecordId: created.id,
          dateLabel: 'Today',
          statusTitle: data.status === 'PENDING' ? 'Order Confirmed' : 'In Transit',
          timeLabel: '09:15 AM',
          isCompleted: true,
          isEstimated: false,
          sortOrder: 1,
        },
      ]);

      const all = await fetchFullShipments();
      const createdFull = all.find((s) => s.id === created.id)!;
      io.emit('shipment:upserted', createdFull);
      res.status(201).json({ shipment: createdFull });
    } catch (err) {
      console.error('Create shipment error:', err);
      res.status(500).json({ error: 'Failed to create shipment.' });
    }
  });

  app.patch('/api/shipments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid shipment ID.' });
      return;
    }

    const parsed = updateShipmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid update payload' });
      return;
    }

    const updates = parsed.data;
    try {
      const db = getDb();
      if (!db) {
        const idx = memoryStore.shipments.findIndex((s) => s.id === id);
        if (idx === -1) {
          res.status(404).json({ error: 'Shipment not found.' });
          return;
        }
        const current = memoryStore.shipments[idx];
        const nextProgress = updates.progressPct ?? current.progressPct;
        const nextLat =
          current.originLat + ((current.destLat - current.originLat) * nextProgress) / 100;
        const nextLng =
          current.originLng + ((current.destLng - current.originLng) * nextProgress) / 100;

        memoryStore.shipments[idx] = {
          ...current,
          ...updates,
          progressPct: nextProgress,
          currentLat: nextLat,
          currentLng: nextLng,
        };
        io.emit('shipment:upserted', memoryStore.shipments[idx]);
        res.json({ shipment: memoryStore.shipments[idx] });
        return;
      }

      const [existing] = await db.select().from(shipments).where(eq(shipments.id, id)).limit(1);
      if (!existing) {
        res.status(404).json({ error: 'Shipment not found.' });
        return;
      }

      const nextProgress = updates.progressPct ?? existing.progressPct;
      const nextLat =
        existing.originLat + ((existing.destLat - existing.originLat) * nextProgress) / 100;
      const nextLng =
        existing.originLng + ((existing.destLng - existing.originLng) * nextProgress) / 100;

      await db
        .update(shipments)
        .set({
          ...(updates.status ? { status: updates.status } : {}),
          ...(updates.dropoffEta ? { dropoffEta: updates.dropoffEta } : {}),
          ...(updates.dropoffLocation ? { dropoffLocation: updates.dropoffLocation } : {}),
          progressPct: nextProgress,
          currentLat: nextLat,
          currentLng: nextLng,
          updatedAt: new Date(),
        })
        .where(eq(shipments.id, id));

      const all = await fetchFullShipments();
      const updated = all.find((s) => s.id === id)!;
      io.emit('shipment:upserted', updated);
      res.json({ shipment: updated });
    } catch (err) {
      console.error('Update shipment error:', err);
      res.status(500).json({ error: 'Failed to update shipment.' });
    }
  });

  app.delete('/api/shipments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid shipment ID.' });
      return;
    }

    try {
      const db = getDb();
      if (!db) {
        const idx = memoryStore.shipments.findIndex((s) => s.id === id);
        if (idx === -1) {
          res.status(404).json({ error: 'Shipment not found.' });
          return;
        }
        memoryStore.shipments.splice(idx, 1);
        io.emit('shipment:deleted', { id });
        res.json({ ok: true });
        return;
      }

      const deleted = await db
        .delete(shipments)
        .where(eq(shipments.id, id))
        .returning({ id: shipments.id });
      if (deleted.length === 0) {
        res.status(404).json({ error: 'Shipment not found.' });
        return;
      }
      io.emit('shipment:deleted', { id });
      res.json({ ok: true });
    } catch (err) {
      console.error('Delete shipment error:', err);
      res.status(500).json({ error: 'Failed to delete shipment.' });
    }
  });

  app.get('/api/stats', async (_req, res) => {
    try {
      const db = getDb();
      if (!db) {
        res.json({ stats: memoryStore.driverStats });
        return;
      }
      const rows = await db.select().from(driverStats).orderBy(asc(driverStats.id));
      res.json({ stats: rows });
    } catch {
      res.status(500).json({ error: 'Failed to load driver statistics.' });
    }
  });

  app.get('/api/drivers', async (_req, res) => {
    try {
      const db = getDb();
      if (!db) {
        res.json({ drivers: memoryStore.drivers });
        return;
      }
      const rows = await db.select().from(drivers).orderBy(asc(drivers.id));
      res.json({ drivers: rows });
    } catch {
      res.status(500).json({ error: 'Failed to load drivers.' });
    }
  });

  app.get('/api/customers', async (_req, res) => {
    try {
      const db = getDb();
      if (!db) {
        res.json({ customers: memoryStore.customers });
        return;
      }
      const rows = await db.select().from(customers).orderBy(desc(customers.totalShipments));
      res.json({ customers: rows });
    } catch {
      res.status(500).json({ error: 'Failed to load customers.' });
    }
  });

  app.get('/api/inbox', async (_req, res) => {
    try {
      const db = getDb();
      if (!db) {
        res.json({ messages: memoryStore.inboxMessages });
        return;
      }
      const rows = await db.select().from(inboxMessages).orderBy(desc(inboxMessages.id));
      res.json({ messages: rows });
    } catch {
      res.status(500).json({ error: 'Failed to load inbox.' });
    }
  });

  app.patch('/api/inbox/:id/read', requireAuth, async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid message ID.' });
      return;
    }

    try {
      const db = getDb();
      if (!db) {
        const msg = memoryStore.inboxMessages.find((m) => m.id === id);
        if (!msg) {
          res.status(404).json({ error: 'Message not found.' });
          return;
        }
        msg.unread = false;
        io.emit('inbox:updated', msg);
        res.json({ message: msg });
        return;
      }
      const [updated] = await db
        .update(inboxMessages)
        .set({ unread: false })
        .where(eq(inboxMessages.id, id))
        .returning();
      if (!updated) {
        res.status(404).json({ error: 'Message not found.' });
        return;
      }
      io.emit('inbox:updated', updated);
      res.json({ message: updated });
    } catch {
      res.status(500).json({ error: 'Failed to mark message as read.' });
    }
  });

  // Vite middleware in development, static serve in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[JalurKargo] HTTP + Socket.IO Server listening on http://localhost:${port}`);
    console.log(`[JalurKargo] Swagger API Docs available at http://localhost:${port}/api/docs`);
  });
}

startServer().catch((err) => {
  console.error('[JalurKargo] Fatal startup error:', err);
  process.exit(1);
});
