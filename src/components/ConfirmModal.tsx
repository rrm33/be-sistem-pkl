import React, { useEffect } from 'react';
import Swal from 'sweetalert2';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  type?: 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, confirmText = "Ya, Hapus Data", type = 'danger', onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      Swal.fire({
        title,
        text: message,
        icon: type === 'danger' ? 'warning' : 'info',
        input: 'password',
        inputAttributes: {
          maxlength: '12',
          autocapitalize: 'off',
          autocorrect: 'off',
          placeholder: 'Masukkan PIN Admin (Default: 123456)',
          autocomplete: 'new-password'
        },
        inputLabel: 'Verifikasi PIN Keamanan Admin *',
        showCancelButton: true,
        confirmButtonColor: type === 'danger' ? '#dc2626' : '#1C587A',
        cancelButtonColor: '#64748b',
        confirmButtonText: confirmText,
        cancelButtonText: 'Batal',
        allowOutsideClick: false,
        preConfirm: async (pinValue) => {
          if (!pinValue || pinValue.trim() === '') {
            Swal.showValidationMessage('PIN Keamanan Admin wajib diisi untuk menghapus data!');
            return false;
          }
          try {
            const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            const username = userStr ? JSON.parse(userStr).username : '';
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/verify-pin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, pin: pinValue.trim() }),
            });
            if (!res.ok) {
              const data = await res.json();
              Swal.showValidationMessage(data.message || 'PIN Keamanan Admin Salah!');
              return false;
            }
            return true;
          } catch (e) {
            Swal.showValidationMessage('Gagal memverifikasi PIN Keamanan Admin.');
            return false;
          }
        }
      }).then((result) => {
        if (result.isConfirmed) {
          onConfirm();
        } else {
          onCancel();
        }
      });
    }
  }, [isOpen, title, message, confirmText, type, onConfirm, onCancel]);

  return null;
}
