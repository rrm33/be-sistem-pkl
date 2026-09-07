import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, loginType } = body;

    if (!username || !password) {
      return NextResponse.json({ message: 'Username dan Password wajib diisi' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ message: 'Username atau Password salah' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Username atau Password salah' }, { status: 401 });
    }

    if (loginType) {
      if (loginType === 'GURU' && user.role !== 'ADMIN' && user.role !== 'PEMBIMBING') {
        return NextResponse.json({ message: 'Akses ditolak. Anda bukan Guru/Admin.' }, { status: 401 });
      }
      if (loginType === 'DUDI' && user.role !== 'PERUSAHAAN') {
        return NextResponse.json({ message: 'Akses ditolak. Akun ini bukan milik Perusahaan.' }, { status: 401 });
      }
      if (loginType === 'SISWA' && user.role !== 'SISWA') {
        return NextResponse.json({ message: 'Akses ditolak. Silakan gunakan halaman login Guru/DUDI.' }, { status: 401 });
      }
    }

    const tokenPayload = { sub: user.id, username: user.username, role: user.role };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'SUPER_SECRET_KEY', { expiresIn: '7d' });

    let nama = user.username;
    if (user.role === 'SISWA') {
      const siswa = await prisma.siswa.findUnique({ where: { userId: user.id } });
      if (siswa) nama = siswa.namaLengkap;
    } else if (user.role === 'PEMBIMBING') {
      const guru = await prisma.guruPembimbing.findUnique({ where: { userId: user.id } });
      if (guru) nama = guru.namaLengkap;
    } else if (user.role === 'PERUSAHAAN') {
      const perusahaan = await prisma.perusahaan.findUnique({ where: { userId: user.id } });
      if (perusahaan) nama = perusahaan.nama;
    } else if (user.role === 'ADMIN') {
      nama = 'Administrator';
    }

    return NextResponse.json({
      message: 'Login sukses',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nama
      }
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
