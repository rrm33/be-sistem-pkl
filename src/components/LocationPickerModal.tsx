"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin } from 'lucide-react';
import Swal from 'sweetalert2';
import 'leaflet/dist/leaflet.css';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

let DefaultIcon: any;
if (typeof window !== 'undefined') {
  import('leaflet').then(L => {
    DefaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;
  });
}

function LocationMarker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e: any) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  if (map && typeof map.setView === 'function') {
    map.setView(center, 16);
  }
  return null;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
}

export default function LocationPickerModal({ isOpen, onClose, onSelect }: LocationPickerModalProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [center, setCenter] = useState<[number, number]>([-8.1726, 113.699]); // Default Jember

  if (!isOpen) return null;

  const handleSelect = () => {
    if (position) {
      onSelect(position[0], position[1]);
      onClose();
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          setCenter(newPos);
        },
        (err) => {
          Swal.fire('Error', 'Gagal mendapatkan lokasi saat ini. Pastikan GPS aktif dan izin diberikan.', 'error');
        }
      );
    } else {
      Swal.fire('Error', 'Browser Anda tidak mendukung geolokasi.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapPin size={18} className="text-smk-orange" /> Pilih Lokasi Peta
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 relative bg-slate-100">
          {typeof window !== 'undefined' && (
            <MapContainer 
              center={center} 
              zoom={13} 
              style={{ height: '100%', width: '100%', zIndex: 10 }}
            >
              <ChangeView center={center} />
              <TileLayer
                attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              />
              <LocationMarker position={position} setPosition={setPosition} />
            </MapContainer>
          )}
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[20] flex gap-2">
            <button
              onClick={handleCurrentLocation}
              className="px-4 py-2 bg-white text-smk-blue font-semibold rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2"
            >
              <MapPin size={16} /> Lokasi Saya
            </button>
            <button
              onClick={handleSelect}
              disabled={!position}
              className="px-6 py-2 bg-smk-blue text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pilih Titik Ini
            </button>
          </div>
          
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[20] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm text-sm font-medium text-slate-700 pointer-events-none">
            Klik pada peta untuk memilih titik lokasi
          </div>
        </div>
      </div>
    </div>
  );
}
