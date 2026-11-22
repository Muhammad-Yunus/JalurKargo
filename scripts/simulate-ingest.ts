/**
 * Standalone External System Simulation Script for JalurKargo Ingest API
 *
 * Usage:
 *   INGEST_API_KEY="jk_live_..." npm run simulate
 *   OR:
 *   npx tsx scripts/simulate-ingest.ts --key=jk_live_... --url=http://localhost:3000
 *
 * This script runs purely as an external HTTP client and injects shipments,
 * customers, stats, inbox alerts, and live streaming GPS telemetry via
 * POST /api/ingest/* authenticated with X-API-Key.
 */

import 'dotenv/config';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const BASE_URL = (parseArg('url') || process.env.INGEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_KEY = (parseArg('key') || process.env.INGEST_API_KEY || '').trim();

if (!API_KEY) {
  console.error(
    'Missing INGEST_API_KEY.\n' +
      'Provide it via environment variable or CLI flag:\n' +
      '  INGEST_API_KEY="jk_live_..." npm run simulate\n' +
      '  npx tsx scripts/simulate-ingest.ts --key=jk_live_...\n\n' +
      'Tip: Generate an API key in JalurKargo -> Settings -> External Ingest API Keys.'
  );
  process.exit(1);
}

async function postIngest<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`[${res.status}] ${endpoint}: ${(data as { error?: string }).error || res.statusText}`);
  }
  return data as T;
}

const SIMULATED_SHIPMENTS = [
  {
    orderCode: '2025 - FASLOG - C4N5A45',
    trackingRef: '#JAKQHH671',
    shipmentId: '#170845-25-800NYK',
    status: 'IN TRANSIT',
    originCode: 'WDH',
    originCity: 'Hosea Kutako, NB',
    originTime: 'May 13, 8.00 AM',
    originLat: 40.7618,
    originLng: -73.9875,
    destCode: 'JFK',
    destCity: 'New York, USA',
    destTime: 'May 20, 9.30 AM',
    destLat: 40.7138,
    destLng: -73.9455,
    currentLat: 40.7385,
    currentLng: -73.9635,
    progressPct: 48,
    dropoffEta: '8:32 AM',
    dropoffLocation: 'Park Residence Jensa',
    dropoffTag: 'UYT436437RT',
    driver: {
      name: 'Budiyono Siregar',
      carrier: 'JNT Express',
      phone: '+62 812-8890-4412',
      vehiclePlate: 'YZXZ436437RT',
    },
    events: [
      {
        dateLabel: 'Estimated 28 Aug 2025',
        statusTitle: 'Delivered',
        timeLabel: '10:20 AM',
        isCompleted: false,
        isEstimated: true,
      },
      {
        dateLabel: '27 Aug 2025',
        statusTitle: 'In Transit',
        timeLabel: '09:15 AM',
        isCompleted: true,
        isEstimated: false,
      },
      {
        dateLabel: '26 Aug 2025',
        statusTitle: 'In Sorting Centre',
        timeLabel: '06:21 AM',
        isCompleted: true,
        isEstimated: false,
      },
      {
        dateLabel: '25 Aug 2025',
        statusTitle: 'Order Confirmed',
        timeLabel: '06:21 AM',
        isCompleted: true,
        isEstimated: false,
      },
    ],
  },
  {
    orderCode: '2025 - FASLOG - KAJA764D',
    trackingRef: '#JKAU87AD',
    shipmentId: '#192044-25-410ORD',
    status: 'PENDING',
    originCode: 'WMS',
    originCity: 'Newark, NJ',
    originTime: 'April 17, 7.40 AM',
    originLat: 40.7357,
    originLng: -74.1724,
    destCode: 'ORD',
    destCity: 'Chicago, IL',
    destTime: 'April 29, 11.15 AM',
    destLat: 40.7428,
    destLng: -73.9912,
    currentLat: 40.7372,
    currentLng: -74.1225,
    progressPct: 31,
    dropoffEta: '11:15 AM',
    dropoffLocation: 'Midwest Logistics Hub',
    dropoffTag: 'Y436437RT',
    driver: {
      name: 'Rendra Wijaya',
      carrier: 'JalurKargo Linehaul',
      phone: '+62 811-7720-3109',
      vehiclePlate: 'Y436437RT',
    },
    events: [
      {
        dateLabel: 'Estimated 30 Aug 2025',
        statusTitle: 'Delivered',
        timeLabel: '02:00 PM',
        isCompleted: false,
        isEstimated: true,
      },
      {
        dateLabel: '27 Aug 2025',
        statusTitle: 'Awaiting Dispatch',
        timeLabel: '08:40 AM',
        isCompleted: false,
        isEstimated: false,
      },
      {
        dateLabel: '25 Aug 2025',
        statusTitle: 'Order Confirmed',
        timeLabel: '07:10 AM',
        isCompleted: true,
        isEstimated: false,
      },
    ],
  },
  {
    orderCode: '2025 - FASLOG - YAUG78AS',
    trackingRef: '#67HJAKOA',
    shipmentId: '#318920-25-920ORD',
    status: 'IN TRANSIT',
    originCode: 'NYC',
    originCity: 'New York, USA',
    originTime: 'May 13, 8.00 AM',
    originLat: 40.7527,
    originLng: -73.9772,
    destCode: 'ORD',
    destCity: 'Chicago, IL',
    destTime: 'May 29, 11.15 AM',
    destLat: 40.7195,
    destLng: -73.9512,
    currentLat: 40.7245,
    currentLng: -73.9558,
    progressPct: 86,
    dropoffEta: '4:45 PM',
    dropoffLocation: 'Terminal Freight Dock B',
    dropoffTag: 'YZ436437RT',
    driver: {
      name: 'Dimas Prasetyo',
      carrier: 'SiCepat Cargo',
      phone: '+62 813-5541-9021',
      vehiclePlate: 'YZ436437RT',
    },
    events: [
      {
        dateLabel: 'Estimated 29 May 2025',
        statusTitle: 'Delivered',
        timeLabel: '11:15 AM',
        isCompleted: false,
        isEstimated: true,
      },
      {
        dateLabel: '27 May 2025',
        statusTitle: 'In Transit',
        timeLabel: '09:30 AM',
        isCompleted: true,
        isEstimated: false,
      },
      {
        dateLabel: '13 May 2025',
        statusTitle: 'Order Confirmed',
        timeLabel: '08:00 AM',
        isCompleted: true,
        isEstimated: false,
      },
    ],
  },
  {
    orderCode: '2026 - FASLOG - GRT34YT',
    trackingRef: '#67HJAKOA',
    shipmentId: '#441209-26-205CGK',
    status: 'IN TRANSIT',
    originCode: 'CGK',
    originCity: 'Jakarta, ID',
    originTime: 'June 02, 6.15 AM',
    originLat: 40.7681,
    originLng: -73.9619,
    destCode: 'SUB',
    destCity: 'Surabaya, ID',
    destTime: 'June 05, 2.30 PM',
    destLat: 40.7282,
    destLng: -73.9295,
    currentLat: 40.7495,
    currentLng: -73.9465,
    progressPct: 62,
    dropoffEta: '2:30 PM',
    dropoffLocation: 'Tanjung Perak Hub',
    dropoffTag: 'JFK43689RT',
    driver: {
      name: 'Budiyono Siregar',
      carrier: 'JNT Express',
      phone: '+62 812-8890-4412',
      vehiclePlate: 'YZXZ436437RT',
    },
    events: [
      {
        dateLabel: 'Estimated 05 Jun 2026',
        statusTitle: 'Delivered',
        timeLabel: '02:30 PM',
        isCompleted: false,
        isEstimated: true,
      },
      {
        dateLabel: '03 Jun 2026',
        statusTitle: 'In Transit',
        timeLabel: '11:05 AM',
        isCompleted: true,
        isEstimated: false,
      },
    ],
  },
];

const SIMULATED_STATS = [
  {
    timeframe: 'W',
    onTheWayPct: 39.7,
    unloadingPct: 28.3,
    loadingPct: 17.4,
    onTheWayDuration: '3 hr 10 min',
    unloadingDuration: '2 hr 15 min',
    loadingDuration: '1 hr 23 min',
  },
  {
    timeframe: 'M',
    onTheWayPct: 44.2,
    unloadingPct: 24.8,
    loadingPct: 19.5,
    onTheWayDuration: '4 hr 05 min',
    unloadingDuration: '2 hr 02 min',
    loadingDuration: '1 hr 35 min',
  },
  {
    timeframe: '6M',
    onTheWayPct: 41.5,
    unloadingPct: 27.1,
    loadingPct: 18.2,
    onTheWayDuration: '3 hr 42 min',
    unloadingDuration: '2 hr 10 min',
    loadingDuration: '1 hr 28 min',
  },
  {
    timeframe: 'Y',
    onTheWayPct: 46.0,
    unloadingPct: 25.4,
    loadingPct: 16.8,
    onTheWayDuration: '4 hr 18 min',
    unloadingDuration: '1 hr 58 min',
    loadingDuration: '1 hr 19 min',
  },
];

const SIMULATED_CUSTOMERS = [
  {
    name: 'Nadia Kusuma',
    company: 'Nusantara Retail Group',
    email: 'nadia@nusantararetail.co.id',
    phone: '+62 21-555-0192',
    city: 'New York, USA',
    totalShipments: 24,
    status: 'ACTIVE',
  },
  {
    name: 'Arif Hidayat',
    company: 'Samudra Electronics',
    email: 'arif@samudra-elec.id',
    phone: '+62 31-555-0148',
    city: 'Chicago, IL',
    totalShipments: 18,
    status: 'ACTIVE',
  },
  {
    name: 'Clara Santoso',
    company: 'Prima ColdChain',
    email: 'clara@primacold.com',
    phone: '+62 22-555-0183',
    city: 'Jakarta, ID',
    totalShipments: 31,
    status: 'ACTIVE',
  },
];

const SIMULATED_MESSAGES = [
  {
    senderName: 'Budiyono Siregar',
    senderRole: 'Lead Driver · JNT Express',
    shipmentRef: '2025 - FASLOG - C4N5A45',
    subject: 'Crossing Queensboro bridge checkpoint',
    preview: 'Cleared sorting gate ahead of schedule. ETA Park Residence Jensa remains 8:32 AM.',
    timeLabel: '6m ago',
  },
  {
    senderName: 'Nadia Kusuma',
    senderRole: 'Nusantara Retail Group',
    shipmentRef: '2025 - FASLOG - KAJA764D',
    subject: 'Dock bay 4 confirmation for ORD drop-off',
    preview: 'Please instruct the driver to use Gate B upon arrival at Chicago hub.',
    timeLabel: '28m ago',
  },
  {
    senderName: 'Dimas Prasetyo',
    senderRole: 'Fleet Captain · SiCepat Cargo',
    shipmentRef: '2025 - FASLOG - YAUG78AS',
    subject: 'Manifest verified & temperature normal',
    preview: 'Cold storage seals intact at 4.2°C. Entering final 15km corridor.',
    timeLabel: '1h ago',
  },
];

async function runSimulation() {
  console.log(`[Simulator] Target: ${BASE_URL}`);
  console.log('[Simulator] 1/4 Pushing fleet shipments to POST /api/ingest/shipments...');
  await postIngest('/api/ingest/shipments', { shipments: SIMULATED_SHIPMENTS });

  console.log('[Simulator] 2/4 Pushing driver statistics to POST /api/ingest/stats...');
  for (const stat of SIMULATED_STATS) {
    await postIngest('/api/ingest/stats', stat);
  }

  console.log('[Simulator] 3/4 Pushing customer accounts to POST /api/ingest/customers...');
  for (const cust of SIMULATED_CUSTOMERS) {
    await postIngest('/api/ingest/customers', cust);
  }

  console.log('[Simulator] 4/4 Pushing dispatch alerts to POST /api/ingest/inbox...');
  for (const msg of SIMULATED_MESSAGES) {
    await postIngest('/api/ingest/inbox', msg);
  }

  console.log('[Simulator] Initial payload ingested! Streaming live GPS telemetry every 3s (Ctrl+C to stop)...');

  let tick = 0;
  const primary = SIMULATED_SHIPMENTS[0];
  setInterval(async () => {
    tick += 1;
    const progressPct = 48 + ((tick * 3) % 45);
    const currentLat =
      primary.originLat + ((primary.destLat - primary.originLat) * progressPct) / 100;
    const currentLng =
      primary.originLng + ((primary.destLng - primary.originLng) * progressPct) / 100;

    try {
      await postIngest('/api/ingest/telemetry', {
        orderCode: primary.orderCode,
        currentLat: Number(currentLat.toFixed(6)),
        currentLng: Number(currentLng.toFixed(6)),
        progressPct,
        status: progressPct >= 99 ? 'DELIVERED' : 'IN TRANSIT',
        dropoffEta: `8:${String(32 - (tick % 10)).padStart(2, '0')} AM`,
      });
      console.log(
        `[Simulator] Telemetry tick #${tick}: ${primary.orderCode} -> ${progressPct}% (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)})`
      );
    } catch (err) {
      console.error('[Simulator] Telemetry error:', err instanceof Error ? err.message : err);
    }
  }, 3000);
}

runSimulation().catch((err) => {
  console.error('[Simulator] Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
