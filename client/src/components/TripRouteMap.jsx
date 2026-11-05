import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { itineraryPoints } from '../utils/tripPlanCore';

// Cores do mapa: fixas (legíveis sobre tiles claros e escuros), alinhadas à marca
const MAP_COLORS = {
  bus: '#c6f432',
  casing: '#0e1116',
  walk: '#0e1116',
  paper: '#ffffff',
  start: '#2f6fe8',
  end: '#f0582a'
};

function pin(color, text) {
  return L.divIcon({
    className: 'trip-pin',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};color:${MAP_COLORS.paper};border:2.5px solid ${MAP_COLORS.paper};box-shadow:0 2px 8px rgb(0 0 0 / 0.35);display:flex;align-items:center;justify-content:center;font:700 12px sans-serif;">${text}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

// Mapa com o trajeto de um itinerário: caminhada tracejada, ônibus em destaque
export default function TripRouteMap({ itinerary }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    (itinerary.legs || []).forEach(leg => {
      if (!leg.path || leg.path.length === 0) return;
      if (leg.isWalk) {
        L.polyline(leg.path, { color: MAP_COLORS.walk, weight: 4, dashArray: '2 8', lineCap: 'round' }).addTo(map);
      } else {
        L.polyline(leg.path, { color: MAP_COLORS.casing, weight: 9, lineCap: 'round' }).addTo(map);
        L.polyline(leg.path, { color: MAP_COLORS.bus, weight: 5, lineCap: 'round' })
          .bindTooltip(`Linha ${leg.lineCode || ''}`)
          .addTo(map);
      }
    });

    const points = itineraryPoints(itinerary);
    if (points.length > 0) {
      L.marker(points[0], { icon: pin(MAP_COLORS.start, 'A') }).addTo(map);
      L.marker(points[points.length - 1], { icon: pin(MAP_COLORS.end, 'B') }).addTo(map);
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
    } else {
      map.setView([-23.5015, -47.4526], 13);
    }

    return () => map.remove();
  }, [itinerary]);

  return <div ref={containerRef} className="w-full h-64 rounded-[16px] overflow-hidden border border-line" />;
}
