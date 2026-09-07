import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const perusahaan = await prisma.perusahaan.findMany({
      include: {
        guruPembimbing: true,
        guruNego: true,
        cabang: true,
        kuota: { include: { jurusan: true } },
        siswaMagang: true
      },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json(perusahaan);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching perusahaan' }, { status: 500 });
  }
}
