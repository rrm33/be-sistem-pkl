import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const guru = await prisma.guruPembimbing.findMany({
      include: {
        user: true,
        siswaBimbingan: true,
        perusahaanBimbingan: true
      },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json(guru);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching guru pembimbing' }, { status: 500 });
  }
}
