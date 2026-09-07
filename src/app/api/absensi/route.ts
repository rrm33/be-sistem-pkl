import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siswaId = searchParams.get('siswaId');
    const tanggal = searchParams.get('tanggal');

    const where: any = {};
    if (siswaId) where.siswaId = parseInt(siswaId, 10);
    if (tanggal) where.tanggal = new Date(tanggal);

    const absensi = await prisma.absensi.findMany({
      where,
      include: {
        siswa: true,
        perusahaan: true,
        cabang: true
      },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json(absensi);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching absensi' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { siswaId, status, koordinatLokasi, fotoMasuk, fotoPulang, jenis } = body;

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    let absensiHariIni = await prisma.absensi.findFirst({
      where: {
        siswaId: parseInt(siswaId, 10),
        tanggal: today
      }
    });

    if (jenis === 'MASUK') {
      if (absensiHariIni) {
        return NextResponse.json({ message: 'Anda sudah presensi masuk hari ini' }, { status: 400 });
      }
      const siswa = await prisma.siswa.findUnique({ where: { id: parseInt(siswaId, 10) } });
      absensiHariIni = await prisma.absensi.create({
        data: {
          siswaId: parseInt(siswaId, 10),
          perusahaanId: siswa?.perusahaanId,
          cabangId: siswa?.cabangId,
          tanggal: today,
          jamMasuk: now,
          status: status || 'HADIR',
          koordinatLokasi,
          fotoMasuk
        }
      });
    } else if (jenis === 'PULANG') {
      if (!absensiHariIni) {
        return NextResponse.json({ message: 'Anda belum presensi masuk hari ini' }, { status: 400 });
      }
      absensiHariIni = await prisma.absensi.update({
        where: { id: absensiHariIni.id },
        data: {
          jamKeluar: now,
          fotoPulang
        }
      });
    }

    return NextResponse.json(absensiHariIni);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error processing absensi' }, { status: 500 });
  }
}
