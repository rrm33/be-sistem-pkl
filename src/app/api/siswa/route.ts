import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jurusanId = searchParams.get('jurusanId');
    const perusahaanId = searchParams.get('perusahaanId');

    const where: any = {};
    if (jurusanId) where.jurusanId = parseInt(jurusanId, 10);
    if (perusahaanId) where.perusahaanId = parseInt(perusahaanId, 10);

    const siswa = await prisma.siswa.findMany({
      where,
      include: {
        user: true,
        jurusan: true,
        perusahaan: true,
        cabang: true,
        guruPembimbing: true
      },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json(siswa);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching siswa' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nisn, nis, namaLengkap, password, jurusanId, kelas, hp, alamat } = body;

    const existingUser = await prisma.user.findUnique({ where: { username: nisn } });
    if (existingUser) {
      return NextResponse.json({ message: 'NISN sudah terdaftar' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password || nisn, 10);

    const user = await prisma.user.create({
      data: {
        username: nisn,
        password: hashedPassword,
        role: 'SISWA',
        siswa: {
          create: {
            nisn,
            nis,
            namaLengkap,
            jurusanId: jurusanId ? parseInt(jurusanId, 10) : undefined,
            kelas,
            hp,
            alamat
          }
        }
      },
      include: { siswa: true }
    });

    return NextResponse.json(user.siswa);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error creating siswa' }, { status: 500 });
  }
}
