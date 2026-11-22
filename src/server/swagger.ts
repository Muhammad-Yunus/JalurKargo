export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'JalurKargo Fleet & Telemetry API',
    version: '1.0.0',
    description:
      'REST + Real-time WebSocket (Socket.IO) API for JalurKargo fleet management, live GPS telemetry ingestion, and user dispatch operations.\n\n' +
      '**Authentication Separation:**\n' +
      '- **App Endpoints (`/api/shipments`, `/api/keys`, `/api/inbox`)**: Require user-based login (`Authorization: Bearer <token>`).\n' +
      '- **External Ingest Endpoints (`/api/ingest/*`)**: Require machine-to-machine API Key (`X-API-Key: <key>`).\n\n' +
      '**Real-Time WebSocket Events (Socket.IO path `/socket.io`):**\n' +
      '`shipment:upserted`, `shipment:deleted`, `telemetry:updated`, `shipment:event`, `stats:updated`, `inbox:received`, `customer:upserted`',
  },
  servers: [{ url: '/', description: 'Current JalurKargo Server' }],
  tags: [
    { name: 'Ingest API', description: 'External system ingestion endpoints (API Key auth)' },
    { name: 'App Auth', description: 'Operator user registration and login' },
    { name: 'API Keys', description: 'Manage External Ingest API keys (User Bearer auth)' },
    { name: 'Fleet & Tracking', description: 'Dashboard query and operator management endpoints' },
  ],
  components: {
    securitySchemes: {
      IngestApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'External system Ingest API key (env INGEST_API_KEY or generated via /api/keys)',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'HMAC-SHA256 Token',
        description: 'Operator session token returned by /api/auth/login or /api/auth/register',
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Fleet & Tracking'],
        summary: 'Server health, storage mode, and WebSocket status',
        responses: {
          '200': {
            description: 'Healthy',
          },
        },
      },
    },
    '/api/ingest/shipments': {
      post: {
        tags: ['Ingest API'],
        summary: 'Upsert one or multiple shipments from an external ERP/TMS',
        security: [{ IngestApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'orderCode',
                  'trackingRef',
                  'originCode',
                  'originCity',
                  'originTime',
                  'originLat',
                  'originLng',
                  'destCode',
                  'destCity',
                  'destTime',
                  'destLat',
                  'destLng',
                ],
                properties: {
                  orderCode: { type: 'string', example: '2025 - FASLOG - C4N5A45' },
                  trackingRef: { type: 'string', example: '#JAKQHH671' },
                  shipmentId: { type: 'string', example: '#170845-25-800NYK' },
                  status: { type: 'string', enum: ['IN TRANSIT', 'PENDING', 'DELIVERED'] },
                  originCode: { type: 'string', example: 'WDH' },
                  originCity: { type: 'string', example: 'Hosea Kutako, NB' },
                  originTime: { type: 'string', example: 'May 13, 8.00 AM' },
                  originLat: { type: 'number', example: 40.7618 },
                  originLng: { type: 'number', example: -73.9875 },
                  destCode: { type: 'string', example: 'JFK' },
                  destCity: { type: 'string', example: 'New York, USA' },
                  destTime: { type: 'string', example: 'May 20, 9.30 AM' },
                  destLat: { type: 'number', example: 40.7138 },
                  destLng: { type: 'number', example: -73.9455 },
                  currentLat: { type: 'number', example: 40.7385 },
                  currentLng: { type: 'number', example: -73.9635 },
                  progressPct: { type: 'integer', minimum: 0, maximum: 100, example: 48 },
                  dropoffEta: { type: 'string', example: '8:32 AM' },
                  dropoffLocation: { type: 'string', example: 'Park Residence Jensa' },
                  dropoffTag: { type: 'string', example: 'UYT436437RT' },
                  driver: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'Budiyono Siregar' },
                      carrier: { type: 'string', example: 'JNT Express' },
                      phone: { type: 'string', example: '+62 812-8890-4412' },
                      vehiclePlate: { type: 'string', example: 'YZXZ436437RT' },
                    },
                  },
                  events: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        dateLabel: { type: 'string', example: '27 Aug 2025' },
                        statusTitle: { type: 'string', example: 'In Transit' },
                        timeLabel: { type: 'string', example: '09:15 AM' },
                        isCompleted: { type: 'boolean', example: true },
                        isEstimated: { type: 'boolean', example: false },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Shipments upserted and broadcast via Socket.IO' },
          '401': { description: 'Missing API Key' },
          '403': { description: 'Invalid API Key' },
        },
      },
    },
    '/api/ingest/telemetry': {
      post: {
        tags: ['Ingest API'],
        summary: 'Ingest real-time GPS location & route progress for a vehicle',
        security: [{ IngestApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderCode', 'currentLat', 'currentLng', 'progressPct'],
                properties: {
                  orderCode: { type: 'string', example: '2025 - FASLOG - C4N5A45' },
                  currentLat: { type: 'number', example: 40.7341 },
                  currentLng: { type: 'number', example: -73.9598 },
                  progressPct: { type: 'integer', minimum: 0, maximum: 100, example: 60 },
                  status: { type: 'string', enum: ['IN TRANSIT', 'PENDING', 'DELIVERED'] },
                  dropoffEta: { type: 'string', example: '8:28 AM' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Telemetry saved and emitted to connected browsers via Socket.IO' },
          '404': { description: 'Shipment not found' },
        },
      },
    },
    '/api/ingest/events': {
      post: {
        tags: ['Ingest API'],
        summary: 'Append a milestone event to a shipment timeline',
        security: [{ IngestApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderCode', 'dateLabel', 'statusTitle', 'timeLabel'],
                properties: {
                  orderCode: { type: 'string', example: '2025 - FASLOG - C4N5A45' },
                  dateLabel: { type: 'string', example: '28 Aug 2025' },
                  statusTitle: { type: 'string', example: 'Arrived at Local Hub' },
                  timeLabel: { type: 'string', example: '08:05 AM' },
                  isCompleted: { type: 'boolean', example: true },
                  isEstimated: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Milestone event recorded and broadcast' },
        },
      },
    },
    '/api/ingest/stats': {
      post: {
        tags: ['Ingest API'],
        summary: 'Upsert driver time utilization metrics by timeframe (W, M, 6M, Y)',
        security: [{ IngestApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'timeframe',
                  'onTheWayPct',
                  'unloadingPct',
                  'loadingPct',
                  'onTheWayDuration',
                  'unloadingDuration',
                  'loadingDuration',
                ],
                properties: {
                  timeframe: { type: 'string', enum: ['W', 'M', '6M', 'Y'], example: 'W' },
                  onTheWayPct: { type: 'number', example: 39.7 },
                  unloadingPct: { type: 'number', example: 28.3 },
                  loadingPct: { type: 'number', example: 17.4 },
                  onTheWayDuration: { type: 'string', example: '3 hr 10 min' },
                  unloadingDuration: { type: 'string', example: '2 hr 15 min' },
                  loadingDuration: { type: 'string', example: '1 hr 23 min' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Statistics updated and broadcast' } },
      },
    },
    '/api/ingest/customers': {
      post: {
        tags: ['Ingest API'],
        summary: 'Upsert enterprise customer accounts from external CRM',
        security: [{ IngestApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'company', 'email', 'phone', 'city'],
                properties: {
                  name: { type: 'string', example: 'Nadia Kusuma' },
                  company: { type: 'string', example: 'Nusantara Retail Group' },
                  email: { type: 'string', example: 'nadia@nusantararetail.co.id' },
                  phone: { type: 'string', example: '+62 21-555-0192' },
                  city: { type: 'string', example: 'New York, USA' },
                  totalShipments: { type: 'integer', example: 24 },
                  status: { type: 'string', example: 'ACTIVE' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Customer synced and broadcast' } },
      },
    },
    '/api/ingest/inbox': {
      post: {
        tags: ['Ingest API'],
        summary: 'Push a driver or carrier alert message into the Dispatch Inbox',
        security: [{ IngestApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['senderName', 'senderRole', 'shipmentRef', 'subject', 'preview'],
                properties: {
                  senderName: { type: 'string', example: 'Budiyono Siregar' },
                  senderRole: { type: 'string', example: 'Lead Driver · JNT Express' },
                  shipmentRef: { type: 'string', example: '2025 - FASLOG - C4N5A45' },
                  subject: { type: 'string', example: 'Checkpoint cleared' },
                  preview: { type: 'string', example: 'ETA Park Residence Jensa remains 8:32 AM.' },
                  timeLabel: { type: 'string', example: 'Just now' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Inbox alert created and broadcast' } },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['App Auth'],
        summary: 'Register an operator account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string', minLength: 6 },
                  title: { type: 'string' },
                  organization: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Account created with Bearer session token' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['App Auth'],
        summary: 'Authenticate operator and receive Bearer session token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Authenticated' } },
      },
    },
    '/api/keys': {
      get: {
        tags: ['API Keys'],
        summary: 'List active Ingest API keys',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'List of API key prefixes and metadata' } },
      },
      post: {
        tags: ['API Keys'],
        summary: 'Generate a new External Ingest API key',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'ERP Production Webhook' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'API key generated (rawKey returned once)' } },
      },
    },
    '/api/keys/{id}': {
      delete: {
        tags: ['API Keys'],
        summary: 'Revoke an Ingest API key',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Key revoked' } },
      },
    },
    '/api/shipments': {
      get: {
        tags: ['Fleet & Tracking'],
        summary: 'List tracked shipments',
        responses: { '200': { description: 'Shipments array' } },
      },
      post: {
        tags: ['Fleet & Tracking'],
        summary: 'Create shipment from Operator App',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/shipments/{id}': {
      patch: {
        tags: ['Fleet & Tracking'],
        summary: 'Update shipment status or progress',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Fleet & Tracking'],
        summary: 'Delete shipment',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Deleted' } },
      },
    },
  },
};
