"use client";

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, Navigation, Loader2 } from 'lucide-react';
import L from 'leaflet';
import Swal from 'sweetalert2';

// Fix leaflet icon issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelect: (address: string) => void;
  onClose: () => void;
}

const MapController = ({ 
  center, 
  setAddress,
  triggerLocate
}: { 
  center: L.LatLng | null, 
  setAddress: (addr: string) => void,
  triggerLocate: number
}) => {
  const map = useMap();
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useEffect(() => {
    if (center) {
      setPosition(center);
      map.flyTo(center, 16);
    }
  }, [center, map]);

  useMapEvents({
    click: async (e) => {
      setPosition(e.latlng);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
        const data = await response.json();
        if (data && data.display_name) {
          setAddress(`${data.display_name} (Koordinat: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)})`);
        }
      } catch (error) {
        console.error("Geocoding error: ", error);
        Swal.fire('Error', 'Gagal mengambil alamat dari peta.', 'error');
      }
    },
    locationfound: (e) => {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 16);
    },
  });

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 16 });
  }, [map, triggerLocate]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

export default function MapPicker({ onLocationSelect, onClose }: MapPickerProps) {
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [center, setCenter] = useState<L.LatLng | null>(null);
  const [triggerLocate, setTriggerLocate] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setCenter(new L.LatLng(lat, lon));
        setAddress(`${result.display_name} (Koordinat: ${lat.toFixed(6)}, ${lon.toFixed(6)})`);
      } else {
        Swal.fire('Informasi', 'Alamat tidak ditemukan. Coba kata kunci lain.', 'info');
      }
    } catch (error) {
      console.error("Search error: ", error);
      Swal.fire('Error', 'Gagal melakukan pencarian alamat.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (address) {
      onLocationSelect(address);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Pilih Lokasi Alamat</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 font-bold">X</button>
        </div>
        
        <div className="p-3 bg-yellow-50 text-yellow-800 text-sm border-b border-yellow-100 flex items-center justify-between gap-4">
          <div className="flex-1">
            <strong>Cara penggunaan:</strong> Geser peta & klik lokasi rumah, atau cari lewat form di samping.
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari alamat..." 
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-yellow-200 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <Search size={16} className="absolute left-3 top-2 text-yellow-500" />
            <button 
              type="submit" 
              disabled={isSearching}
              className="px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-md text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center min-w-[70px]"
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Cari'}
            </button>
          </form>
          <button 
            onClick={() => setTriggerLocate(Date.now())}
            className="flex items-center gap-1 px-3 py-1.5 bg-smk-blue text-white hover:bg-blue-700 rounded-md text-sm font-semibold transition-colors shrink-0 shadow-sm"
            title="Lokasi Saat Ini"
          >
            <Navigation size={16} />
            <span className="hidden sm:inline">Lokasi Saya</span>
          </button>
        </div>
        
        <div className="h-[400px] w-full relative z-0">
          <MapContainer center={[-8.1721, 113.7000]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            />
            <MapController center={center} setAddress={setAddress} triggerLocate={triggerLocate} />
          </MapContainer>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Alamat Terpilih</label>
            <textarea 
              readOnly 
              value={address} 
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 resize-none h-20"
              placeholder="Klik pada peta untuk mendapatkan alamat..."
            ></textarea>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700">Batal</button>
            <button 
              onClick={handleConfirm}
              disabled={!address}
              className="px-4 py-2 bg-smk-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Gunakan Alamat Ini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
