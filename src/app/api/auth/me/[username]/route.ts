import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        siswa: {
          include: { 
            jurusan: true, 
            perusahaan: {
              include: { guruPembimbing: true }
            },
            cabang: true,
            guruPembimbing: true,
            absensi: {
              where: { tanggal: today },
              orderBy: { id: 'desc' },
              take: 1
            }
          }
        },
        guruPembimbing: true,
        perusahaan: true
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
