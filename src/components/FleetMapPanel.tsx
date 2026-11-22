import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  ExternalLink,
  LocateFixed,
  MessageCircle,
  Minus,
  Phone,
  Plus,
} from 'lucide-react';
import type { ShipmentItem } from '../types';

interface FleetMapPanelProps {
  shipments: ShipmentItem[];
  selectedShipment: ShipmentItem | null;
  onSelectShipment: (shipment: ShipmentItem) => void;
  onOpenShipmentDetail: (shipment: ShipmentItem) => void;
  onOpenInbox: () => void;
  isDark: boolean;
}

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || '';

function TopDownTruckSvg({ angleDeg = 0, highlighted = false }: { angleDeg?: number; highlighted?: boolean }) {
  return (
    <div
      style={{ transform: `rotate(${angleDeg}deg)` }}
      className={`transition-transform duration-300 ${
        highlighted ? 'drop-shadow-[0_0_10px_rgba(196,232,84,0.65)]' : 'drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]'
      }`}
    >
      <svg width="24" height="44" viewBox="0 0 24 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Trailer */}
        <rect x="3" y="10" width="18" height="31" rx="2.5" fill="#F8FAFC" stroke="#181A1F" strokeWidth="1.4" />
        <line x1="6" y1="14" x2="6" y2="37" stroke="#CBD5E1" strokeWidth="1" />
        <line x1="12" y1="14" x2="12" y2="37" stroke="#CBD5E1" strokeWidth="1" />
        <line x1="18" y1="14" x2="18" y2="37" stroke="#CBD5E1" strokeWidth="1" />
        {/* Cab */}
        <rect x="4" y="2" width="16" height="9" rx="2.5" fill="#FFFFFF" stroke="#181A1F" strokeWidth="1.4" />
        {/* Windshield */}
        <rect x="6" y="3.5" width="12" height="3.2" rx="1" fill="#1F2937" />
      </svg>
    </div>
  );
}

type LatLngLiteral = { lat: number; lng: number };

// Polyline & Route SDK renderer inside <GoogleMap>
const ActiveRouteLayer: React.FC<{
  shipment: ShipmentItem;
  allShipments: ShipmentItem[];
}> = ({ shipment, allShipments }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const mapsLib = useMapsLibrary('maps');
  const [routePath, setRoutePath] = useState<LatLngLiteral[]>([]);

  // Compute route via modern google.maps.routes.Route.computeRoutes (never legacy DirectionsService)
  useEffect(() => {
    let cancelled = false;

    const fallbackPath: LatLngLiteral[] = [
      { lat: shipment.originLat, lng: shipment.originLng },
      { lat: shipment.currentLat, lng: shipment.currentLng },
      { lat: shipment.destLat, lng: shipment.destLng },
    ];

    if (!routesLib || !map) {
      setRoutePath(fallbackPath);
      return;
    }

    const compute = async () => {
      try {
        const RouteCtor = routesLib.Route as unknown as {
          computeRoutes?: (req: unknown) => Promise<{
            routes?: Array<{
              path?: Array<{ lat: number | (() => number); lng: number | (() => number) }>;
            }>;
          }>;
        };

        if (typeof RouteCtor?.computeRoutes === 'function') {
          const response = await RouteCtor.computeRoutes({
            origin: { lat: shipment.originLat, lng: shipment.originLng },
            destination: { lat: shipment.destLat, lng: shipment.destLng },
            travelMode: 'DRIVING',
            fields: ['path', 'viewport'],
          });
          const firstRoute = response?.routes?.[0];
          if (!cancelled && firstRoute?.path && firstRoute.path.length > 1) {
            setRoutePath(
              firstRoute.path.map((pt) => ({
                lat: typeof pt.lat === 'function' ? pt.lat() : pt.lat,
                lng: typeof pt.lng === 'function' ? pt.lng() : pt.lng,
              }))
            );
            return;
          }
        }
      } catch {
        // Fallback smoothly to curved waypoint polyline if Routes API SKU isn't enabled on user's key
      }
      if (!cancelled) {
        setRoutePath(fallbackPath);
      }
    };

    compute();
    return () => {
      cancelled = true;
    };
  }, [
    routesLib,
    map,
    shipment.id,
    shipment.originLat,
    shipment.originLng,
    shipment.destLat,
    shipment.destLng,
    shipment.currentLat,
    shipment.currentLng,
  ]);

  // Render polylines on Google Map
  useEffect(() => {
    if (!map || !mapsLib) return;

    const splitIdx = Math.max(
      1,
      Math.min(routePath.length - 1, Math.round((shipment.progressPct / 100) * (routePath.length - 1)))
    );
    const completedCoords =
      routePath.length >= 2
        ? routePath.slice(0, splitIdx + 1)
        : [
            { lat: shipment.originLat, lng: shipment.originLng },
            { lat: shipment.currentLat, lng: shipment.currentLng },
          ];
    const remainingCoords =
      routePath.length >= 2
        ? routePath.slice(splitIdx)
        : [
            { lat: shipment.currentLat, lng: shipment.currentLng },
            { lat: shipment.destLat, lng: shipment.destLng },
          ];

    const PolylineCtor = mapsLib.Polyline;
    const completedLine = new PolylineCtor({
      path: completedCoords,
      geodesic: true,
      strokeColor: '#C4E854',
      strokeOpacity: 0.95,
      strokeWeight: 4,
      map,
    });

    const remainingLine = new PolylineCtor({
      path: remainingCoords,
      geodesic: true,
      strokeColor: '#6B7280',
      strokeOpacity: 0,
      icons: [
        {
          icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.7, scale: 3 },
          offset: '0',
          repeat: '14px',
        },
      ],
      map,
    });

    const secondaryLines = allShipments
      .filter((s) => s.id !== shipment.id)
      .map(
        (s) =>
          new PolylineCtor({
            path: [
              { lat: s.originLat, lng: s.originLng },
              { lat: s.currentLat, lng: s.currentLng },
            ],
            geodesic: true,
            strokeColor: '#98B838',
            strokeOpacity: 0.45,
            strokeWeight: 2.5,
            map,
          })
      );

    return () => {
      completedLine.setMap(null);
      remainingLine.setMap(null);
      secondaryLines.forEach((l) => l.setMap(null));
    };
  }, [map, mapsLib, routePath, shipment, allShipments]);

  return null;
};

const GoogleMapControls: React.FC<{
  center: LatLngLiteral;
}> = ({ center }) => {
  const map = useMap();

  const handleZoomIn = useCallback(() => {
    if (!map) return;
    map.setZoom((map.getZoom() ?? 13) + 1);
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    map.setZoom(Math.max(3, (map.getZoom() ?? 13) - 1));
  }, [map]);

  const handleRecenter = useCallback(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(13);
  }, [map, center]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleZoomIn}
        aria-label="Zoom in"
        className="w-10 h-10 rounded-xl bg-white/90 dark:bg-[#14161A]/90 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white flex items-center justify-center hover:border-[#C4E854]/60 transition-colors shadow-lg cursor-pointer"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={handleZoomOut}
        aria-label="Zoom out"
        className="w-10 h-10 rounded-xl bg-white/90 dark:bg-[#14161A]/90 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white flex items-center justify-center hover:border-[#C4E854]/60 transition-colors shadow-lg cursor-pointer"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={handleRecenter}
        aria-label="Center map on active truck"
        className="w-10 h-10 rounded-xl bg-white/90 dark:bg-[#14161A]/90 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white flex items-center justify-center hover:border-[#C4E854]/60 transition-colors shadow-lg cursor-pointer"
      >
        <LocateFixed className="w-4 h-4" />
      </button>
    </div>
  );
};

// High-precision dark urban vector fallback when VITE_GOOGLE_MAPS_API_KEY is not yet configured in Secrets
const InteractiveVectorFallbackMap: React.FC<{
  shipments: ShipmentItem[];
  selectedShipment: ShipmentItem;
  onSelectShipment: (s: ShipmentItem) => void;
  isDark: boolean;
}> = ({ shipments, selectedShipment, onSelectShipment, isDark }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    setDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setPan({
      x: Math.max(-180, Math.min(180, e.clientX - dragOrigin.x)),
      y: Math.max(-140, Math.min(140, e.clientY - dragOrigin.y)),
    });
  };

  const handlePointerUp = () => setDragging(false);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`w-full h-full ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${
          isDark ? 'bg-[#090B0E]' : 'bg-[#E8ECEF]'
        }`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          className="w-full h-full transition-transform duration-150 relative"
        >
          {/* Dark City Grid & Urban Road Network SVG */}
          <svg
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
            aria-label="Interactive fleet tracking route map"
          >
            <defs>
              <filter id="limeGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="destHalo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#C4E854" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#C4E854" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* City blocks & waterways */}
            <rect width="800" height="500" fill={isDark ? '#0B0D10' : '#E5E9EE'} />
            <path
              d="M0 120 L180 90 L310 210 L260 360 L0 390 Z"
              fill={isDark ? '#111419' : '#DCE1E7'}
            />
            <path
              d="M360 0 L620 0 L540 240 L380 180 Z"
              fill={isDark ? '#101318' : '#DCE1E7'}
            />
            <path
              d="M420 260 L780 220 L800 490 L380 490 Z"
              fill={isDark ? '#111419' : '#DCE1E7'}
            />

            {/* Dense street grid lines */}
            <g stroke={isDark ? '#1D2128' : '#CBD5E1'} strokeWidth="1.2">
              {Array.from({ length: 14 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i * 38}
                  x2="800"
                  y2={i * 38 + (i % 2 === 0 ? 22 : -18)}
                />
              ))}
              {Array.from({ length: 18 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 48}
                  y1="0"
                  x2={i * 48 + (i % 2 === 0 ? -25 : 30)}
                  y2="500"
                />
              ))}
            </g>

            {/* Secondary arterial roads */}
            <g stroke={isDark ? '#272C35' : '#B8C2CC'} strokeWidth="3.5" fill="none">
              <path d="M20 75 Q180 130 340 60 T690 120" />
              <path d="M70 480 L190 270 L320 240 L480 470" />
              <path d="M510 40 L420 260 L580 420 L790 360" />
            </g>

            {/* Secondary active truck route (left side) */}
            <path
              d="M78 395 L138 308 L210 348 L242 480"
              stroke="#C4E854"
              strokeWidth="3"
              strokeOpacity="0.8"
              fill="none"
              filter="url(#limeGlow)"
            />

            {/* Primary active route (top to mid truck) */}
            <path
              d="M170 25 L268 102 L222 182 L305 268"
              stroke="#C4E854"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#limeGlow)"
            />

            {/* Remaining dashed route to Drop-off */}
            <path
              d="M305 268 L345 322 L338 386"
              stroke={isDark ? '#6B7280' : '#475569'}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              fill="none"
            />
            <path
              d="M338 386 L510 355 L615 412 L750 385"
              stroke={isDark ? '#4B5563' : '#64748B'}
              strokeWidth="2"
              strokeDasharray="5 5"
              fill="none"
            />

            {/* Destination halo */}
            <circle cx="338" cy="386" r="36" fill="url(#destHalo)" />
            <circle cx="338" cy="386" r="14" fill="#C4E854" fillOpacity="0.22" />
            <circle cx="338" cy="386" r="6" fill="#C4E854" stroke="#0B0C0E" strokeWidth="2" />
          </svg>

          {/* Waypoint / Truck Tags matching mockup */}
          <div className="absolute left-[18%] top-[13%] px-2 py-1 rounded bg-[#14161A]/90 border border-white/10 text-[10px] font-mono text-zinc-200 shadow-lg pointer-events-none">
            {selectedShipment.driver?.vehiclePlate || 'YZXZ436437RT'}
          </div>
          <div className="absolute left-[6%] top-[43%] px-2 py-1 rounded bg-[#14161A]/90 border border-white/10 text-[10px] font-mono text-zinc-200 shadow-lg pointer-events-none">
            Y436437RT
          </div>
          <div className="absolute left-[65%] top-[69%] px-2 py-1 rounded bg-[#14161A]/90 border border-white/10 text-[10px] font-mono text-zinc-200 shadow-lg pointer-events-none">
            YZ436437RT
          </div>

          {/* Interactive Truck Markers */}
          <button
            type="button"
            onClick={() => onSelectShipment(selectedShipment)}
            title={selectedShipment.orderCode}
            style={{ left: '36.5%', top: '49%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
          >
            <TopDownTruckSvg angleDeg={-38} highlighted />
          </button>

          {shipments[1] && (
            <button
              type="button"
              onClick={() => onSelectShipment(shipments[1])}
              title={shipments[1].orderCode}
              style={{ left: '16.5%', top: '63%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
            >
              <TopDownTruckSvg angleDeg={32} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom-Right Map Controls for Fallback Map */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.2).toFixed(2)))}
          aria-label="Zoom in"
          className="w-10 h-10 rounded-xl bg-white/90 dark:bg-[#14161A]/90 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white flex items-center justify-center hover:border-[#C4E854]/60 transition-colors shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.2).toFixed(2)))}
          aria-label="Zoom out"
          className="w-10 h-10 rounded-xl bg-white/90 dark:bg-[#14161A]/90 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white flex items-center justify-center hover:border-[#C4E854]/60 transition-colors shadow-lg cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          aria-label="Recenter map"
          className="w-10 h-10 rounded-xl bg-white/90 dark:bg-[#14161A]/90 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-white flex items-center justify-center hover:border-[#C4E854]/60 transition-colors shadow-lg cursor-pointer"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const FleetMapPanel: React.FC<FleetMapPanelProps> = ({
  shipments,
  selectedShipment,
  onSelectShipment,
  onOpenShipmentDetail,
  onOpenInbox,
  isDark,
}) => {
  const [callBanner, setCallBanner] = useState<string | null>(null);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  const active = selectedShipment ?? shipments[0];

  const center = useMemo(
    () =>
      active
        ? { lat: active.currentLat, lng: active.currentLng }
        : { lat: 40.7385, lng: -73.9635 },
    [active]
  );

  useEffect(() => {
    const onQuota = () => setMapLoadFailed(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  if (!active) {
    return (
      <div className="h-[430px] lg:h-full lg:flex-1 min-h-[340px] rounded-2xl bg-white dark:bg-[#121418] border border-zinc-200 dark:border-white/[0.08] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          Awaiting Live Fleet Telemetry
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
          Socket.IO real-time listener is ready. Send shipments and GPS updates to{' '}
          <code className="font-mono">/api/ingest/shipments</code> &amp;{' '}
          <code className="font-mono">/api/ingest/telemetry</code> to render routes instantaneously.
        </p>
      </div>
    );
  }

  const showLiveGoogleMap = Boolean(MAPS_API_KEY) && !mapLoadFailed;

  return (
    <div className="relative h-[430px] lg:h-full lg:flex-1 min-h-[340px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/[0.08] bg-[#0B0D10]">
      {/* Map Layer */}
      {showLiveGoogleMap ? (
        <APIProvider apiKey={MAPS_API_KEY} language="en" region="US">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            colorScheme={isDark ? 'DARK' : 'LIGHT'}
            defaultCenter={center}
            center={center}
            defaultZoom={13}
            disableDefaultUI={true}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <ActiveRouteLayer shipment={active} allShipments={shipments} />

            {/* Vehicle Markers */}
            {shipments.map((item) => {
              const isSelected = item.id === active.id;
              return (
                <AdvancedMarker
                  key={item.id}
                  position={{ lat: item.currentLat, lng: item.currentLng }}
                  onClick={() => onSelectShipment(item)}
                  title={`${item.orderCode} (${item.status})`}
                >
                  <div className="relative flex flex-col items-center cursor-pointer">
                    <span className="mb-1 px-2 py-0.5 rounded bg-[#14161A]/90 border border-white/15 text-[10px] font-mono text-white whitespace-nowrap shadow">
                      {item.driver?.vehiclePlate || item.dropoffTag}
                    </span>
                    <TopDownTruckSvg angleDeg={isSelected ? -35 : 25} highlighted={isSelected} />
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Drop-off Destination Pin */}
            <AdvancedMarker
              position={{ lat: active.destLat, lng: active.destLng }}
              title={active.dropoffLocation}
            >
              <div className="relative flex items-center justify-center">
                <span className="w-8 h-8 rounded-full bg-[#C4E854]/25 flex items-center justify-center">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#C4E854] border-2 border-[#0B0C0E]" />
                </span>
              </div>
            </AdvancedMarker>

            <div className="absolute bottom-4 right-4 z-20">
              <GoogleMapControls center={center} />
            </div>
          </GoogleMap>
        </APIProvider>
      ) : (
        <InteractiveVectorFallbackMap
          shipments={shipments}
          selectedShipment={active}
          onSelectShipment={onSelectShipment}
          isDark={isDark}
        />
      )}

      {/* Drop-off ETA Floating Card (Bottom Center-Left matching mockup) */}
      <div className="absolute bottom-4 left-4 sm:left-[28%] z-20 pointer-events-auto">
        <div className="rounded-xl bg-[#121418]/92 backdrop-blur-md border border-white/12 px-3.5 py-2.5 shadow-2xl max-w-[210px]">
          <div className="text-[11.5px] font-semibold text-white tabular-nums">
            Drop - off ETA: {active.dropoffEta}
          </div>
          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
            {active.dropoffLocation}
          </div>
          <div className="text-[10px] font-mono text-zinc-300 mt-1">
            {active.dropoffTag}
          </div>
        </div>
      </div>

      {/* Floating Driver & Shipment Timeline Overlay Card (Top-Right inside Map) */}
      <div className="hidden sm:block absolute top-3.5 right-3.5 z-20 w-[275px] xl:w-[295px] rounded-2xl bg-white/95 dark:bg-[#131519]/92 backdrop-blur-xl border border-zinc-200 dark:border-white/[0.1] p-4 shadow-2xl">
        {/* Driver Header */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={active.driver?.avatarUrl || '/src/assets/images/avatar_driver_1795325383900.jpg'}
              alt={active.driver?.name || 'Driver'}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-white/15 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">
                {active.driver?.name || 'Unassigned Driver'}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {active.driver?.carrier || 'No carrier assigned'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenInbox}
              title="Message driver"
              className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/[0.06] hover:bg-[#C4E854]/20 text-zinc-700 dark:text-zinc-300 hover:text-[#6F8E11] dark:hover:text-[#C4E854] flex items-center justify-center transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const phone = active.driver?.phone || '+62 812-8890-4412';
                setCallBanner(`Dispatch line ready: ${phone}`);
                setTimeout(() => setCallBanner(null), 3500);
              }}
              title="Call driver"
              className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/[0.06] hover:bg-[#C4E854]/20 text-zinc-700 dark:text-zinc-300 hover:text-[#6F8E11] dark:hover:text-[#C4E854] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {callBanner && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-[#C4E854]/15 border border-[#C4E854]/30 text-[11px] font-medium text-[#6F8E11] dark:text-[#C4E854]">
            {callBanner}
          </div>
        )}

        {/* Shipment ID Row */}
        <div className="flex items-center justify-between gap-2 pt-3 pb-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              SHIPMENT ID
            </div>
            <div className="text-[14px] font-semibold text-zinc-900 dark:text-white tracking-tight mt-0.5 tabular-nums">
              {active.shipmentId}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenShipmentDetail(active)}
            title="Inspect full shipment log"
            className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Vertical Timeline */}
        <div className="space-y-3 pt-1">
          {active.events.map((ev, idx) => {
            const isLast = idx === active.events.length - 1;
            const nextIsCompleted = active.events[idx + 1]?.isCompleted;
            return (
              <div key={ev.id} className="relative flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative flex flex-col items-center pt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 z-10 ${
                        ev.isCompleted
                          ? 'bg-[#82A818] dark:bg-[#C4E854] shadow-[0_0_8px_rgba(196,232,84,0.75)]'
                          : 'bg-zinc-400 dark:bg-zinc-600'
                      }`}
                    />
                    {!isLast && (
                      <span
                        className={`w-[1.5px] h-7 mt-1 ${
                          ev.isCompleted && nextIsCompleted
                            ? 'bg-[#82A818] dark:bg-[#C4E854]'
                            : 'border-l border-dashed border-zinc-400 dark:border-zinc-600'
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-zinc-900 dark:text-white truncate">
                      {ev.dateLabel}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {ev.statusTitle}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-300 tabular-nums shrink-0 pt-0.5">
                  {ev.timeLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
