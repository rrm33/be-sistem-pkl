import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const kelas = await prisma.kelas.findMany({
      include: { jurusan: true },
      orderBy: { id: 'asc' }
    });
    return NextResponse.json(kelas);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching kelas' }, { status: 500 });
  }
}
