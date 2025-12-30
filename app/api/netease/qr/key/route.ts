import { NextResponse } from 'next/server';
import { getQRKey } from '@/lib/netease-api';

export async function GET() {
    try {
        const data = await getQRKey();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('NetEase QR Key Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
