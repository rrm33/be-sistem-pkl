import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siswaId = searchParams.get('siswaId');
    const status = searchParams.get('status');

    const where: any = {};
    if (siswaId) where.siswaId = parseInt(siswaId, 10);
    if (status) where.status = status;

    const jurnal = await prisma.jurnalHarian.findMany({
      where,
      include: {
        siswa: true,
        perusahaan: true
      },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json(jurnal);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching jurnal' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { siswaId, tanggal, kegiatan, fotoKegiatan } = body;

    const siswa = await prisma.siswa.findUnique({ where: { id: parseInt(siswaId, 10) } });

    const jurnal = await prisma.jurnalHarian.create({
      data: {
        siswaId: parseInt(siswaId, 10),
        perusahaanId: siswa?.perusahaanId,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        kegiatan,
        fotoKegiatan,
        status: 'PENDING'
      }
    });

    return NextResponse.json(jurnal);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error creating jurnal' }, { status: 500 });
  }
}
