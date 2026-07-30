import { useEffect, useRef, useState } from "react";
import { assets } from "./data";
import {
  assetPlacementProfiles,
  placementFormat,
  type PlacementCandidate,
  type PlacementEvaluation,
  type PlacementZoneClass,
  type RegulatoryZoneShape,
} from "./placement-strategy";

type PlacementComplianceMapProps = {
  zones: RegulatoryZoneShape[];
  candidate: PlacementCandidate;
  evaluation: PlacementEvaluation;
  showZones: boolean;
  showEstate: boolean;
  showBuffers: boolean;
  relocationMode: boolean;
  onMoveCandidate: (lat: number, lng: number, zone: PlacementZoneClass | null) => void;
  onSelectEstateAsset?: (assetId: string) => void;
  t: (value: string) => string;
};

const ZONE_COLORS: Record<PlacementZoneClass, string> = {
  0: "#d94a43",
  1: "#8aa87e",
  2: "#d19a32",
  3: "#16875b",
};

function pointInside(lat: number, lng: number, polygon: Array<{ lat: number; lng: number }>) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function zoneAtPoint(
  lat: number,
  lng: number,
  zones: RegulatoryZoneShape[],
): PlacementZoneClass | null {
  const match = zones.find((zone) => pointInside(lat, lng, zone.polygon));
  return match?.zone ?? null;
}

export function PlacementComplianceMap({
  zones,
  candidate,
  evaluation,
  showZones,
  showEstate,
  showBuffers,
  relocationMode,
  onMoveCandidate,
  onSelectEstateAsset,
  t,
}: PlacementComplianceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Leaflet is loaded by the application shell.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoneLayersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assetLayersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidateLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bufferLayersRef = useRef<any[]>([]);
  const candidateRef = useRef(candidate);
  const relocationRef = useRef(relocationMode);
  const moveRef = useRef(onMoveCandidate);
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  candidateRef.current = candidate;
  relocationRef.current = relocationMode;
  moveRef.current = onMoveCandidate;

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    const init = () => {
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !containerRef.current) {
        if (attempts++ < 30) window.setTimeout(init, 150);
        else setFailed(true);
        return;
      }

      try {
        map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false,
        }).setView([candidateRef.current.lat, candidateRef.current.lng], 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
          if (!relocationRef.current) return;
          const zone = zoneAtPoint(event.latlng.lat, event.latlng.lng, zones);
          moveRef.current(event.latlng.lat, event.latlng.lng, zone);
        });
        mapRef.current = map;
        setMapReady(true);
        window.setTimeout(() => map?.invalidateSize(), 120);
      } catch {
        setFailed(true);
      }
    };

    init();
    return () => {
      cancelled = true;
      if (map) map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [zones]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;
    zoneLayersRef.current.forEach((layer) => layer.remove());
    zoneLayersRef.current = [];
    if (!showZones) return;

    zones.forEach((zone) => {
      const color = ZONE_COLORS[zone.zone];
      const polygon = L.polygon(
        zone.polygon.map((point) => [point.lat, point.lng]),
        {
          color,
          weight: 1.5,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: zone.zone === 0 ? 0.22 : 0.13,
        },
      ).addTo(map);
      polygon.bindTooltip(`<strong>${zone.name.en}</strong><br/>Zone ${zone.zone}`, {
        sticky: true,
        direction: "top",
      });
      zoneLayersRef.current.push(polygon);
    });
  }, [mapReady, showZones, zones]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;
    assetLayersRef.current.forEach((layer) => layer.remove());
    assetLayersRef.current = [];
    if (!showEstate) return;

    assetPlacementProfiles.forEach((profile) => {
      const asset = assets.find((row) => row.id === profile.assetId);
      if (!asset) return;
      const stateColor =
        asset.status === "Live" ? "#27a366" : asset.status === "Offline" ? "#d94a43" : "#d18a25";
      const marker = L.circleMarker([asset.lat, asset.lng], {
        radius: 5.5,
        color: "#ffffff",
        weight: 1.5,
        fillColor: stateColor,
        fillOpacity: 1,
      }).addTo(map);
      marker.bindTooltip(
        `<strong>${asset.name}</strong><br/>${placementFormat(profile.formatId).name.en} | ${asset.status}`,
        { direction: "top" },
      );
      if (onSelectEstateAsset) marker.on("click", () => onSelectEstateAsset(asset.id));
      assetLayersRef.current.push(marker);
    });
  }, [mapReady, onSelectEstateAsset, showEstate]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (candidateLayerRef.current) candidateLayerRef.current.remove();
    bufferLayersRef.current.forEach((layer) => layer.remove());
    bufferLayersRef.current = [];

    const verdictColor =
      evaluation.verdict === "Compliant"
        ? "#16875b"
        : evaluation.verdict === "Review required"
          ? "#d18a25"
          : "#d94a43";
    const marker = L.marker([candidate.lat, candidate.lng], {
      icon: L.divIcon({
        className: "placement-candidate-marker",
        html: `<span style="--marker-color:${verdictColor}"><i></i></span>`,
        iconSize: [34, 42],
        iconAnchor: [17, 39],
      }),
    }).addTo(map);
    marker.bindTooltip(
      `<strong>${candidate.name.en}</strong><br/>${evaluation.format.name.en} | ${evaluation.verdict}`,
      { direction: "top", offset: [0, -28] },
    );
    candidateLayerRef.current = marker;

    if (showBuffers) {
      if (evaluation.minimumClearanceM) {
        bufferLayersRef.current.push(
          L.circle([candidate.lat, candidate.lng], {
            radius: evaluation.minimumClearanceM,
            color: "#2f6fd0",
            weight: 1.4,
            dashArray: "7 6",
            fillColor: "#2f6fd0",
            fillOpacity: 0.045,
          })
            .addTo(map)
            .bindTooltip(`${evaluation.minimumClearanceM} m linear clearance`),
        );
      }
      bufferLayersRef.current.push(
        L.circle([candidate.lat, candidate.lng], {
          radius: evaluation.diameterM / 2,
          color: verdictColor,
          weight: 1.6,
          fillColor: verdictColor,
          fillOpacity: 0.065,
        })
          .addTo(map)
          .bindTooltip(`${evaluation.diameterM} m density diameter`),
      );
    }

    map.panTo([candidate.lat, candidate.lng], { animate: true, duration: 0.35 });
  }, [candidate, evaluation, mapReady, showBuffers]);

  // Leaflet appends its own classes to the container element, so React must
  // never rewrite className after mount; toggle the relocation class directly.
  useEffect(() => {
    containerRef.current?.classList.toggle("is-relocating", relocationMode);
  }, [relocationMode]);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!mapReady || !map || !container) return;

    let frame = window.requestAnimationFrame(() => map.invalidateSize());
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => map.invalidateSize());
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [mapReady]);

  if (failed) {
    return (
      <div className="placement-map-fallback">
        <strong>{t("Map unavailable")}</strong>
        <span>{t("The placement checks remain available without map tiles.")}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="placement-map"
      role="application"
      aria-label={t("ADMO placement compliance map")}
    />
  );
}
