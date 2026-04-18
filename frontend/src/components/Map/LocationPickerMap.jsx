import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const DEFAULT_CENTER = {
  lat: 31.5204,
  lng: 74.3587
};

const DEFAULT_ZOOM = 12;

if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  });
}

function MapViewport({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], DEFAULT_ZOOM);
  }, [map, center.lat, center.lng]);

  return null;
}

function DraggablePin({ position, onPositionChange }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (!marker) {
          return;
        }

        const latLng = marker.getLatLng();
        onPositionChange({ lat: latLng.lat, lng: latLng.lng });
      }
    }),
    [onPositionChange]
  );

  useMapEvents({
    click(event) {
      onPositionChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
    />
  );
}

export default function LocationPickerMap({ position, onPositionChange }) {
  const currentPosition = position || DEFAULT_CENTER;

  return (
    <MapContainer
      center={[currentPosition.lat, currentPosition.lng]}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport center={currentPosition} />
      <DraggablePin position={currentPosition} onPositionChange={onPositionChange} />
    </MapContainer>
  );
}
