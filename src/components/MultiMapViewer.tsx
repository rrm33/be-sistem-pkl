import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Building2, User, Users } from 'lucide-react';

// Fix for default marker icon in react-leaflet
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export interface DudiMarkerData {
  id: string;
  nama: string;
  lat: number;
  lng: number;
  guruPembimbing?: { nama?: string; namaLengkap?: string } | null;
  siswaMagang?: { nama?: string; namaLengkap?: string; nisn: string }[];
}

interface MultiMapViewerProps {
  markers: DudiMarkerData[];
  centerLat?: number;
  centerLng?: number;
}

// Komponen helper untuk menyesuaikan zoom agar semua titik muat di satu layar
function MapBoundsFitter({ markers }: { markers: DudiMarkerData[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      // Tambahkan padding agar marker yang di pinggir tidak tertutup
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);

  return null;
}

export default function MultiMapViewer({ markers, centerLat = -8.1726, centerLng = 113.7001 }: MultiMapViewerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Cleanup Leaflet default icon issues
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-slate-100 rounded-xl animate-pulse flex items-center justify-center">
        <p className="text-slate-500 font-medium">Memuat Peta...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-200 shadow-sm z-0 relative">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <MapBoundsFitter markers={markers} />
        
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]}
            icon={customIcon}
          >
            {/* Tooltip to show only the company name when not clicked */}
            <Tooltip direction="top" offset={[0, -32]} permanent={true} className="shadow-sm border-slate-200">
              <span className="font-bold text-xs text-slate-800">{marker.nama}</span>
            </Tooltip>

            {/* Popup showing full details when clicked */}
            <Popup className="dudi-popup">
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-3 border-b pb-2">
                  <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                    <Building2 size={16} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{marker.nama}</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                      <User size={12} />
                      Guru Pembimbing
                    </div>
                    <p className="text-sm text-slate-700 font-medium ml-4">
                      {marker.guruPembimbing?.namaLengkap || marker.guruPembimbing?.nama || <span className="text-slate-400 italic">Belum diplot</span>}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                      <Users size={12} />
                      Siswa Magang ({marker.siswaMagang?.length || 0})
                    </div>
                    {marker.siswaMagang && marker.siswaMagang.length > 0 ? (
                      <ul className="ml-4 space-y-1">
                        {marker.siswaMagang.map(s => (
                          <li key={s.nisn} className="text-xs text-slate-700 list-disc">{s.namaLengkap || s.nama}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic ml-4">Belum ada siswa</p>
                    )}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Global CSS for overriding leaflet popup styles to make it cleaner */}
      <style dangerouslySetInnerHTML={{__html: `
        .dudi-popup .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .dudi-popup .leaflet-popup-content {
          margin: 12px;
        }
        .leaflet-tooltip {
          background-color: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03) !important;
          color: #1e293b !important;
        }
        .leaflet-tooltip::before {
          border-top-color: white !important;
        }
      `}} />
    </div>
  );
}
