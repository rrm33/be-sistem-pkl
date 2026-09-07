import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    let pengaturan = await prisma.pengaturanUmum.findFirst();
    if (!pengaturan) {
      pengaturan = await prisma.pengaturanUmum.create({
        data: {
          radiusAbsenMeter: 50,
          minAppVersion: '1.0.0'
        }
      });
    }
    return NextResponse.json(pengaturan);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error fetching pengaturan' }, { status: 500 });
  }
}
