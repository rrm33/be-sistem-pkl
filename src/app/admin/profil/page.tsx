"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { UserCircle2, Briefcase, GraduationCap, MapPin, Phone, Hash, Shield, Maximize2, X, Edit3, Save, Navigation, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';

const LocationPickerModal = dynamic(() => import('@/components/LocationPickerModal'), { ssr: false });

export default function ProfilPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // State for form editing
  const [formData, setFormData] = useState<any>({});
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    const token = Cookies.get('token');
    let reqUsername = "";
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        reqUsername = payload.username;
      } catch (e) {
        console.error("Failed to decode token");
      }
    }

    if (!reqUsername) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/auth/me/${reqUsername}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        
        // Initialize form data based on relation
        if (data.siswa) {
          setFormData(data.siswa);
        } else if (data.guruPembimbing) {
          setFormData(data.guruPembimbing);
        } else if (data.perusahaan) {
          setFormData(data.perusahaan);
        }
      } else {
        toast.error("Gagal memuat data profil");
      }
    } catch (err) {
      toast.error("Gagal terhubung ke server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleMapSelect = (lat: number, lng: number) => {
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    
    // Tentukan kolom mana yang akan diisi
    const targetField = 'alamat';
    setFormData((prev: any) => ({ ...prev, [targetField]: mapsLink }));
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.loading("Mendapatkan lokasi saat ini...", { id: 'loc' });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
          const targetField = 'alamat';
          setFormData((prev: any) => ({ ...prev, [targetField]: mapsLink }));
          toast.success("Lokasi berhasil didapatkan", { id: 'loc' });
        },
        () => {
          toast.error("Gagal mendapatkan lokasi. Pastikan izin GPS diberikan.", { id: 'loc' });
        }
      );
    } else {
      toast.error("Browser tidak mendukung lokasi");
    }
  };

  const handleChangePin = () => {
    Swal.fire({
      title: 'Ubah PIN Keamanan Admin',
      html: `
        <div style="text-align: left; font-size: 13px; color: #475569;">
          <p style="margin-bottom: 12px; font-size: 12px; color: #64748b;">
            PIN Keamanan digunakan untuk mengonfirmasi penghapusan data sensitif.
          </p>
          <div>
            <label style="display:block; font-weight: bold; margin-bottom: 4px;">PIN Lama (Default: 123456)</label>
            <input id="swal-old-pin" type="password" maxlength="12" class="swal2-input" style="width: 100%; margin: 0;" placeholder="PIN Lama">
          </div>
          <div style="margin-top: 10px;">
            <label style="display:block; font-weight: bold; margin-bottom: 4px;">PIN Baru (Min. 4 Digit)</label>
            <input id="swal-new-pin" type="password" maxlength="12" class="swal2-input" style="width: 100%; margin: 0;" placeholder="PIN Baru">
          </div>
          <div style="margin-top: 10px;">
            <label style="display:block; font-weight: bold; margin-bottom: 4px;">Konfirmasi PIN Baru</label>
            <input id="swal-confirm-pin" type="password" maxlength="12" class="swal2-input" style="width: 100%; margin: 0;" placeholder="Konfirmasi PIN Baru">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan PIN Baru',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#1C587A',
      cancelButtonColor: '#64748b',
      focusConfirm: false,
      preConfirm: async () => {
        const oldPin = (document.getElementById('swal-old-pin') as HTMLInputElement).value;
        const newPin = (document.getElementById('swal-new-pin') as HTMLInputElement).value;
        const confirmPin = (document.getElementById('swal-confirm-pin') as HTMLInputElement).value;

        if (!oldPin || !newPin || !confirmPin) {
          Swal.showValidationMessage('Semua kolom PIN wajib diisi!');
          return false;
        }

        if (newPin.length < 4) {
          Swal.showValidationMessage('PIN Baru minimal 4 Karakter / Digit!');
          return false;
        }

        if (newPin !== confirmPin) {
          Swal.showValidationMessage('Konfirmasi PIN Baru tidak cocok!');
          return false;
        }

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/change-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: profile.username, oldPin, newPin })
          });
          if (!res.ok) {
            const err = await res.json();
            Swal.showValidationMessage(err.message || 'Gagal mengubah PIN');
            return false;
          }
          return true;
        } catch (e) {
          Swal.showValidationMessage('Kesalahan koneksi server');
          return false;
        }
      }
    }).then((res) => {
      if (res.isConfirmed) {
        toast.success('PIN Keamanan Admin berhasil diperbarui!');
      }
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });
      if (selectedPhoto) {
        data.append('foto', selectedPhoto);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/me/${profile.username}`, {
        method: 'PUT',
        body: data
      });
      
      if (res.ok) {
        toast.success("Profil berhasil diperbarui!");
        setIsEditModalOpen(false);
        fetchProfile(); // Reload data
      } else {
        toast.error("Gagal memperbarui profil");
      }
    } catch (err) {
      toast.error("Gagal terhubung ke server");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-smk-blue/20 border-t-smk-blue rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-slate-500">Gagal memuat profil atau sesi telah berakhir.</p>
      </div>
    );
  }

  // Menentukan data spesifik berdasarkan role
  let specificData = null;
  let avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.username}&backgroundColor=f8fafc`;
  let displayName = profile.username;

  if (profile.siswa) {
    specificData = profile.siswa;
    displayName = specificData.namaLengkap;
    if (specificData.foto) avatarUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${specificData.foto}`;
  } else if (profile.guruPembimbing) {
    specificData = profile.guruPembimbing;
    displayName = specificData.namaLengkap;
    if (specificData.foto) avatarUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${specificData.foto}`;
  } else if (profile.perusahaan) {
    specificData = profile.perusahaan;
    displayName = specificData.nama;
    if (specificData.logo) avatarUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${specificData.logo}`;
  } else if (profile.role === 'ADMIN') {
    displayName = "Administrator";
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profil Pengguna</h1>
          <p className="text-sm text-slate-500 mt-1">Informasi detail akun Anda</p>
        </div>
        {(profile.role !== 'ADMIN' || specificData) && (
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 hover:text-smk-blue transition-colors shadow-sm font-medium text-sm"
          >
            <Edit3 size={16} /> Edit Profil
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Cover Header */}
        <div className="h-32 bg-gradient-to-r from-smk-blue/20 to-smk-orange/20 relative"></div>
        
        <div className="px-6 sm:px-10 pb-10 relative">
          {/* Avatar / Foto */}
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 sm:-mt-12 mb-6">
            <div 
              onClick={() => setIsPhotoZoomed(true)}
              className="w-32 h-32 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden shrink-0 cursor-pointer group relative"
            >
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="text-white" size={24} />
              </div>
            </div>
            <div className="flex-1 pb-2">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-2 mt-2 sm:mt-0 shadow-sm border border-black/5 leading-none bg-slate-50 text-slate-600">
                {profile.role}
              </div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{displayName}</h2>
              <p className="text-sm font-medium text-slate-500">{profile.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            {/* Info Akun (Umum) */}
            <div className="space-y-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                <Shield size={18} className="text-smk-blue" /> Informasi Akun
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Username / ID</div>
                  <div className="font-medium text-slate-800">{profile.username}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Terdaftar Sejak</div>
                  <div className="font-medium text-slate-800">
                    {new Date(profile.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleChangePin}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-colors shadow-sm"
                  >
                    <KeyRound size={16} className="text-smk-blue" />
                    Ubah PIN Keamanan Admin
                  </button>
                </div>
              </div>
            </div>

            {/* Info Detail Spesifik Role */}
            {specificData && (
              <div className="space-y-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <UserCircle2 size={18} className="text-smk-orange" /> Detail Biodata
                </h3>

                <div className="space-y-4">
                  {profile.siswa && (
                    <>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NISN / NIS</div>
                        <div className="font-medium text-slate-800">{specificData.nisn} / {specificData.nis}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NIK / No. KK</div>
                        <div className="font-medium text-slate-800">{specificData.nik || '-'} / {specificData.kk || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tempat, Tanggal Lahir</div>
                        <div className="font-medium text-slate-800">
                          {specificData.tmpLahir || '-'}, {specificData.tglLahir ? new Date(specificData.tglLahir).toLocaleDateString('id-ID') : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kontak (Email & HP)</div>
                        <div className="font-medium text-slate-800 flex flex-col gap-1">
                          <span className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {specificData.hp || '-'}</span>
                          <span className="text-sm text-slate-600">{specificData.email || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Alamat</div>
                        <div className="font-medium text-slate-800 flex items-start gap-2">
                          <MapPin size={14} className="text-slate-400 mt-1 shrink-0" />
                          <span>{specificData.alamat || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kelas</div>
                        <div className="font-medium text-slate-800">{specificData.kelas} - {specificData.jurusan?.namaSingkat || ''}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lokasi PKL</div>
                        <div className="font-medium text-slate-800 flex items-center gap-2">
                          <Briefcase size={14} className="text-slate-400" />
                          {specificData.perusahaan?.nama || <span className="italic text-slate-400">Belum diploting</span>}
                        </div>
                      </div>
                    </>
                  )}

                  {profile.guruPembimbing && (
                    <>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NIP</div>
                        <div className="font-medium text-slate-800 flex items-center gap-2">
                          <Hash size={14} className="text-slate-400" /> {specificData.nip}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor Telepon</div>
                        <div className="font-medium text-slate-800 flex items-center gap-2">
                          <Phone size={14} className="text-slate-400" /> {specificData.kontak || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Alamat</div>
                        <div className="font-medium text-slate-800 flex items-start gap-2">
                          <MapPin size={14} className="text-slate-400 mt-1 shrink-0" />
                          <span>{specificData.alamat || '-'}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {profile.perusahaan && (
                    <>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bidang Usaha</div>
                        <div className="font-medium text-slate-800 flex items-center gap-2">
                          <Briefcase size={14} className="text-slate-400" /> {specificData.bidangUsaha || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Alamat</div>
                        <div className="font-medium text-slate-800 flex items-start gap-2">
                          <MapPin size={14} className="text-slate-400 mt-1 shrink-0" />
                          <span>{specificData.alamat || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kontak Person (Pimpinan)</div>
                        <div className="font-medium text-slate-800">{specificData.pimpinan || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kontak (Email & HP)</div>
                        <div className="font-medium text-slate-800 flex flex-col gap-1">
                          <span className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {specificData.hp || '-'}</span>
                          <span className="text-sm text-slate-600">{specificData.email || '-'}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Edit Profil */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsEditModalOpen(false)}></div>
          
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit3 size={18} className="text-smk-blue" /> Edit Profil
              </h2>
              <button 
                onClick={() => !isSaving && setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                disabled={isSaving}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <form id="editProfileForm" onSubmit={handleSaveProfile} className="space-y-4">
                
                {/* Photo Upload Section */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-bold text-slate-800 mb-2">Foto Profil</h3>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Unggah Foto Baru</label>
                    <input type="file" accept="image/*" onChange={(e) => setSelectedPhoto(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-smk-blue" />
                    <p className="text-xs text-slate-500 mt-1">Maksimal 2MB. Format: JPG, PNG.</p>
                  </div>
                </div>

                {profile.siswa && (
                  <>
                    <div className="border-b pb-4 mb-4">
                      <h3 className="font-bold text-slate-800 mb-2">Keamanan Akun</h3>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password Baru (Opsional)</label>
                        <input type="password" name="password" placeholder="Kosongkan jika tidak ingin mengubah password" value={formData.password || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-smk-blue" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                      <input type="text" name="namaLengkap" value={formData.namaLengkap || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-smk-blue focus:border-smk-blue outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">NIK</label>
                        <input type="text" name="nik" value={formData.nik || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">No. KK</label>
                        <input type="text" name="kk" value={formData.kk || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                        <input type="text" name="tmpLahir" value={formData.tmpLahir || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">No. HP</label>
                        <input type="text" name="hp" value={formData.hp || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                      <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-semibold text-slate-700">Alamat Lengkap</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleGetCurrentLocation} className="text-[10px] sm:text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 flex items-center gap-1 transition-colors"><Navigation size={12} /> Lokasi Saya</button>
                          <button type="button" onClick={() => setIsMapModalOpen(true)} className="text-[10px] sm:text-xs font-semibold bg-smk-blue/10 text-smk-blue px-2 py-1 rounded hover:bg-smk-blue/20 flex items-center gap-1 transition-colors"><MapPin size={12} /> Pilih di Peta</button>
                        </div>
                      </div>
                      <textarea name="alamat" value={formData.alamat || ''} onChange={handleInputChange} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none"></textarea>
                    </div>
                  </>
                )}

                {profile.guruPembimbing && (
                  <>
                    <div className="border-b pb-4 mb-4">
                      <h3 className="font-bold text-slate-800 mb-2">Keamanan Akun</h3>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password Baru (Opsional)</label>
                        <input type="password" name="password" placeholder="Kosongkan jika tidak ingin mengubah password" value={formData.password || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-smk-blue" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                      <input type="text" name="namaLengkap" value={formData.namaLengkap || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-smk-blue outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">No. Telepon / Kontak</label>
                      <input type="text" name="kontak" value={formData.kontak || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-semibold text-slate-700">Alamat Lengkap</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleGetCurrentLocation} className="text-[10px] sm:text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 flex items-center gap-1 transition-colors"><Navigation size={12} /> Lokasi Saya</button>
                          <button type="button" onClick={() => setIsMapModalOpen(true)} className="text-[10px] sm:text-xs font-semibold bg-smk-blue/10 text-smk-blue px-2 py-1 rounded hover:bg-smk-blue/20 flex items-center gap-1 transition-colors"><MapPin size={12} /> Pilih di Peta</button>
                        </div>
                      </div>
                      <textarea name="alamat" value={formData.alamat || ''} onChange={handleInputChange} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none"></textarea>
                    </div>
                  </>
                )}

                {profile.perusahaan && (
                  <>
                    <div className="border-b pb-4 mb-4">
                      <h3 className="font-bold text-slate-800 mb-2">Keamanan Akun</h3>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password Baru (Opsional)</label>
                        <input type="password" name="password" placeholder="Kosongkan jika tidak ingin mengubah password" value={formData.password || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-smk-blue" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Perusahaan</label>
                      <input type="text" name="nama" value={formData.nama || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-smk-blue outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Pimpinan (Kontak Person)</label>
                      <input type="text" name="pimpinan" value={formData.pimpinan || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                        <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">No. HP / Telepon</label>
                        <input type="text" name="hp" value={formData.hp || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                      <textarea name="alamat" value={formData.alamat || ''} onChange={handleInputChange} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none"></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Bidang Usaha</label>
                      <input type="text" name="bidangUsaha" value={formData.bidangUsaha || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                form="editProfileForm"
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-smk-blue text-white font-medium hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {isPhotoZoomed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-10 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setIsPhotoZoomed(false)}></div>
          
          <div className="relative z-10 w-full max-w-3xl flex flex-col items-center">
            <button 
              onClick={() => setIsPhotoZoomed(false)}
              className="absolute -top-12 right-0 sm:-right-12 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="w-full aspect-square sm:aspect-auto sm:max-h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
              <img src={avatarUrl} alt="Zoomed Profile" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      <LocationPickerModal 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelect={handleMapSelect}
      />
    </div>
  );
}
