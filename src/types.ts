export type NavTab =
  | 'dashboard'
  | 'tracking'
  | 'inbox'
  | 'orders'
  | 'customers'
  | 'help'
  | 'settings';

export type ShipmentStatus = 'IN TRANSIT' | 'PENDING' | 'DELIVERED';
export type TimeframeKey = 'W' | 'M' | '6M' | 'Y';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  title: string;
  organization: string;
  subscriptionPlan: string;
  avatarUrl: string;
  trialDaysLeft: number;
}

export interface DriverInfo {
  id: number;
  name: string;
  carrier: string;
  phone: string;
  avatarUrl: string;
  vehiclePlate: string;
}

export interface ShipmentEventItem {
  id: number;
  shipmentRecordId: number;
  dateLabel: string;
  statusTitle: string;
  timeLabel: string;
  isCompleted: boolean;
  isEstimated: boolean;
  sortOrder: number;
}

export interface ShipmentItem {
  id: number;
  orderCode: string;
  trackingRef: string;
  shipmentId: string;
  status: ShipmentStatus;
  originCode: string;
  originCity: string;
  originTime: string;
  originLat: number;
  originLng: number;
  destCode: string;
  destCity: string;
  destTime: string;
  destLat: number;
  destLng: number;
  currentLat: number;
  currentLng: number;
  progressPct: number;
  dropoffEta: string;
  dropoffLocation: string;
  dropoffTag: string;
  driverId: number | null;
  customerId: number | null;
  driver: DriverInfo | null;
  events: ShipmentEventItem[];
}

export interface DriverStatItem {
  id: number;
  timeframe: TimeframeKey;
  onTheWayPct: number;
  unloadingPct: number;
  loadingPct: number;
  onTheWayDuration: string;
  unloadingDuration: string;
  loadingDuration: string;
}

export interface CustomerItem {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  totalShipments: number;
  status: string;
}

export interface InboxMessageItem {
  id: number;
  senderName: string;
  senderRole: string;
  shipmentRef: string;
  subject: string;
  preview: string;
  timeLabel: string;
  unread: boolean;
}

export interface ApiKeyItem {
  id: number;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface TelemetryUpdatePayload {
  id: number;
  orderCode: string;
  shipmentId: string;
  currentLat: number;
  currentLng: number;
  progressPct: number;
  status: ShipmentStatus;
  dropoffEta: string;
}

