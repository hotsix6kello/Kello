"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
);
const Polyline = dynamic(
    () => import("react-leaflet").then((mod) => mod.Polyline),
    { ssr: false }
);

interface MapProps {
    center: [number, number];
    zoom?: number;
    markers?: Array<{ position: [number, number]; popupText?: string }>;
    path?: [number, number][]; // Route coordinates
    height?: string;
}

export default function Map({ center, zoom = 13, markers = [], path = [], height = "35vh" }: MapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // Inject leaflet CSS only in browser
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
        import('leaflet').then((L) => {
            const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
            const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
            const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';
            const DefaultIcon = L.icon({ iconRetinaUrl, iconUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
            L.Marker.prototype.options.icon = DefaultIcon;
        });
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div style={{ height, background: "#222", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>Loading Map...</div>;
    }

    // Type assertion for LatLngExpression (Leaflet types can be tricky with dynamic imports)
    const centerPos: any = center;
    const pathPositions: any[] = path;

    return (
        <MapContainer
            center={centerPos}
            zoom={zoom}
            scrollWheelZoom={false}
            style={{ height, width: "100%", zIndex: 0 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {markers.map((marker, idx) => (
                <Marker key={idx} position={marker.position as any}>
                    {marker.popupText && <Popup>{marker.popupText}</Popup>}
                </Marker>
            ))}

            {path.length > 0 && (
                <Polyline
                    positions={pathPositions}
                    pathOptions={{ color: '#3cb44a', weight: 4, opacity: 0.8 }}
                />
            )}
        </MapContainer>
    );
}
