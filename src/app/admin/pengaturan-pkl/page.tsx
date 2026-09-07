"use client";

import React, { useState, useEffect, useRef } from "react";
import { Settings, Calendar, Save, Upload, Loader2, Building } from "lucide-react";
import { toast } from "sonner";

export default function PengaturanPklPage() {
  const [formData, setFormData] = useState({
    pklMulaiDefault: "",
    pklSelesaiDefault: "",
    radiusAbsenMeter: 50,
    minAppVersion: "1.0.0",
    appUpdateUrl: "",
    namaKepalaSekolah: "",
    nipKepalaSekolah: "",
    pangkatKepalaSekolah: "",
    logoSekolah: "",
    formatNomorSuratTugas: "094/xxx/101.6.5.19/" + new Date().getFullYear(),
    formatNomorSuratKeluar: "400.3/xxx/101.6.5.24/" + new Date().getFullYear(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_HOST = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const API_URL = `${API_HOST}/siswa/pengaturan-umum`;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        setFormData({
          pklMulaiDefault: data.pklMulaiDefault ? new Date(data.pklMulaiDefault).toISOString().split('T')[0] : "",
          pklSelesaiDefault: data.pklSelesaiDefault ? new Date(data.pklSelesaiDefault).toISOString().split('T')[0] : "",
          radiusAbsenMeter: data.radiusAbsenMeter ?? 50,
          minAppVersion: data.minAppVersion ?? "1.0.0",
          appUpdateUrl: data.appUpdateUrl ?? "",
          namaKepalaSekolah: data.namaKepalaSekolah ?? "",
          nipKepalaSekolah: data.nipKepalaSekolah ?? "",
          pangkatKepalaSekolah: data.pangkatKepalaSekolah ?? "",
          logoSekolah: data.logoSekolah ?? "",
          formatNomorSuratTugas: data.formatNomorSuratTugas || ("094/xxx/101.6.5.19/" + new Date().getFullYear()),
          formatNomorSuratKeluar: data.formatNomorSuratKeluar || ("400.3/xxx/101.6.5.24/" + new Date().getFullYear()),
        });
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Gagal memuat pengaturan PKL");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    toast.loading("Menyimpan pengaturan...", { id: "settings-save" });

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pklMulaiDefault: formData.pklMulaiDefault || null,
          pklSelesaiDefault: formData.pklSelesaiDefault || null,
          radiusAbsenMeter: Number(formData.radiusAbsenMeter),
          minAppVersion: formData.minAppVersion,
          appUpdateUrl: formData.appUpdateUrl,
          namaKepalaSekolah: formData.namaKepalaSekolah,
          nipKepalaSekolah: formData.nipKepalaSekolah,
          pangkatKepalaSekolah: formData.pangkatKepalaSekolah,
          formatNomorSuratTugas: formData.formatNomorSuratTugas,
          formatNomorSuratKeluar: formData.formatNomorSuratKeluar,
        }),
      });

      if (res.ok) {
        toast.success("Pengaturan PKL berhasil disimpan!", { id: "settings-save" });
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Gagal menyimpan pengaturan PKL", { id: "settings-save" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const uploadData = new FormData();
    uploadData.append("logoSekolah", file);

    setIsUploading(true);
    toast.loading("Mengunggah logo sekolah...", { id: "logo-upload" });

    try {
      const res = await fetch(`${API_URL}/upload-logo`, {
        method: "POST",
        body: uploadData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, logoSekolah: data.logoSekolah }));
        toast.success("Logo sekolah berhasil diperbarui!", { id: "logo-upload" });
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Gagal mengunggah logo");
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal mengunggah logo", { id: "logo-upload" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-smk-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="text-smk-blue" size={28} />
          Pengaturan PKL & Identitas Sekolah
        </h1>
        <p className="text-sm text-slate-500 mt-1">Konfigurasi parameter PKL, Kop Surat, dan Tanda Tangan Kepala Sekolah.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: School Logo Identity */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
          <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2 self-start">
            <Building className="text-smk-blue" size={18} />
            Logo Sekolah
          </h3>
          <div className="relative w-40 h-40 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-4 bg-slate-50 overflow-hidden group">
            <img
              src={formData.logoSekolah ? `${API_HOST}${formData.logoSekolah}` : "/logo.png"}
              alt="Logo Sekolah"
              className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Format yang didukung: PNG, JPG, JPEG.<br />Disarankan berlatar belakang transparan.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLogoUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-4 py-2 border border-slate-200 hover:border-smk-blue hover:text-smk-blue bg-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Upload size={14} />
            Unggah Logo Baru
          </button>
        </div>

        {/* Right Column: Configuration & Identity Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="text-smk-orange" size={20} />
                Masa Pelaksanaan PKL & Identitas Kepala Sekolah
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tentukan rentang tanggal PKL secara umum dan sesuaikan nama, NIP, serta pangkat Kepala Sekolah untuk kebutuhan cetak Surat Tugas resmi.
              </p>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* PKL Date Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tanggal Mulai PKL</label>
                  <input
                    type="date"
                    required
                    value={formData.pklMulaiDefault}
                    onChange={(e) => setFormData({ ...formData, pklMulaiDefault: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-smk-blue/30 focus:bg-white transition-all focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tanggal Selesai PKL</label>
                  <input
                    type="date"
                    required
                    value={formData.pklSelesaiDefault}
                    onChange={(e) => setFormData({ ...formData, pklSelesaiDefault: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-smk-blue/30 focus:bg-white transition-all focus:outline-none"
                  />
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Principal Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2">
                  <Settings className="text-smk-blue" size={18} />
                  Identitas Penandatangan Surat Tugas (Kepala Sekolah)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nama Kepala Sekolah</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Evi Silviana, S.Pd., M.M."
                      value={formData.namaKepalaSekolah}
                      onChange={(e) => setFormData({ ...formData, namaKepalaSekolah: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-smk-blue/30 focus:bg-white transition-all focus:outline-none text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 19750527 199903 2 005"
                      value={formData.nipKepalaSekolah}
                      onChange={(e) => setFormData({ ...formData, nipKepalaSekolah: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-smk-blue/30 focus:bg-white transition-all focus:outline-none text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Pangkat/Golongan</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pembina Tk. I"
                      value={formData.pangkatKepalaSekolah}
                      onChange={(e) => setFormData({ ...formData, pangkatKepalaSekolah: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-smk-blue/30 focus:bg-white transition-all focus:outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Absensi Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="text-smk-blue" size={18} />
                  Konfigurasi Absensi & Update Aplikasi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Radius Absen (Meter)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.radiusAbsenMeter}
                      onChange={(e) => setFormData({ ...formData, radiusAbsenMeter: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-smk-blue/30 focus:bg-white transition-all focus:outline-none font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Versi Min. Aplikasi</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 1.0.0"
                      value={formData.minAppVersion}
                      onChange={(e) => setFormData({ ...formData, minAppVersion: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-smk-blue/30 focus:bg-white transition-all focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">URL Unduh Update</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formData.appUpdateUrl}
                      onChange={(e) => setFormData({ ...formData, appUpdateUrl: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-smk-blue/30 focus:bg-white transition-all focus:outline-none text-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-smk-blue to-[#266f9f] hover:from-[#1a4f6e] hover:to-smk-blue text-white px-6 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 font-medium disabled:opacity-50 cursor-pointer"
                >
                  <Save size={18} />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
