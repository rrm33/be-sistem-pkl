"use client";

import React, { useState, useEffect } from 'react';
import { Users, KeyRound, ShieldAlert, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';

type User = {
  id: number;
  username: string;
  role: string;
  createdAt: string;
  nama?: string;
};

const ROLES = ['ADMIN', 'SISWA', 'PEMBIMBING', 'PERUSAHAAN'];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Gagal memuat data pengguna', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangeRole = async (userId: number, currentRole: string) => {
    if (currentRole === 'SISWA' || currentRole === 'PERUSAHAAN') {
      return Swal.fire('Ditolak', 'Akun Siswa atau DUDI tidak dapat diubah rolenya.', 'error');
    }

    const { value: newRole } = await Swal.fire({
      title: 'Ubah Role Pengguna',
      input: 'select',
      inputOptions: {
        'PEMBIMBING': 'Guru',
        'ADMIN': 'Admin'
      },
      inputValue: currentRole,
      showCancelButton: true,
      confirmButtonColor: '#1C587A',
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal'
    });

    if (newRole && newRole !== currentRole) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/${userId}/role`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        });

        if (res.ok) {
          Swal.fire('Sukses', 'Role berhasil diubah', 'success');
          fetchUsers();
        } else {
          Swal.fire('Error', 'Gagal mengubah role', 'error');
        }
      } catch (e) {
        Swal.fire('Error', 'Terjadi kesalahan server', 'error');
      }
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    const { value: newPassword } = await Swal.fire({
      title: 'Reset Password',
      text: `Masukkan password baru untuk ${username}`,
      input: 'password',
      inputPlaceholder: 'Password Baru',
      showCancelButton: true,
      confirmButtonColor: '#1C587A',
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Password tidak boleh kosong!';
        }
        if (value.length < 6) {
          return 'Password minimal 6 karakter!';
        }
      }
    });

    if (newPassword) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/${userId}/reset-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword })
        });

        if (res.ok) {
          Swal.fire('Sukses', 'Password berhasil direset', 'success');
        } else {
          Swal.fire('Error', 'Gagal mereset password', 'error');
        }
      } catch (e) {
        Swal.fire('Error', 'Terjadi kesalahan server', 'error');
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.nama && u.nama.toLowerCase().includes(search.toLowerCase()));
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-smk-blue" /> Manajemen Pengguna
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola hak akses dan password akun pengguna sistem.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue focus:ring-1 focus:ring-smk-blue"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue font-medium text-slate-700 w-full sm:w-auto"
          >
            <option value="ALL">Semua Role</option>
            {ROLES.map(r => (
              <option key={r} value={r}>
                {r === 'PEMBIMBING' ? 'Guru' : r === 'PERUSAHAAN' ? 'DUDI' : r === 'SISWA' ? 'Siswa' : r === 'ADMIN' ? 'Admin' : r}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Username / Email</th>
                <th className="px-6 py-4 font-semibold">Nama Pengguna</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Tgl Dibuat</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">#{user.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{user.username}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{user.nama || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                        user.role === 'PEMBIMBING' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'PERUSAHAAN' ? 'bg-orange-100 text-orange-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {user.role === 'PEMBIMBING' ? 'Guru' : user.role === 'PERUSAHAAN' ? 'DUDI' : user.role === 'SISWA' ? 'Siswa' : user.role === 'ADMIN' ? 'Admin' : user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {(user.role === 'ADMIN' || user.role === 'PEMBIMBING') && (
                          <button
                            onClick={() => handleChangeRole(user.id, user.role)}
                            className="p-2 text-smk-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Ubah Role"
                          >
                            <ShieldAlert size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPassword(user.id, user.username)}
                          className="p-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="text-sm text-slate-500">
              Menampilkan <span className="font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> dari <span className="font-medium text-slate-700">{filteredUsers.length}</span> data
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Kembali
              </button>
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currentPage === pageNumber
                          ? "bg-smk-orange text-white shadow-sm"
                          : "border border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                }
                
                if (pageNumber === 2 && currentPage > 3) {
                  return <span key="ellipsis-left" className="text-slate-400 px-1 text-xs">...</span>;
                }
                if (pageNumber === totalPages - 1 && currentPage < totalPages - 2) {
                  return <span key="ellipsis-right" className="text-slate-400 px-1 text-xs">...</span>;
                }
                
                return null;
              })}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
