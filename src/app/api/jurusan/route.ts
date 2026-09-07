import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const jurusan = await prisma.jurusan.findMany({
      include: { kelas: true, siswa: true },
      orderBy: { id: 'asc' }
    });
    return NextResponse.json(jurusan);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching jurusan' }, { status: 500 });
  }
}
