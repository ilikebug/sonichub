import { NextRequest, NextResponse } from 'next/server';
import { createQRImage } from '@/lib/netease-api';

export async function GET(request: NextRequest) {
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
        return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    try {
        const data = await createQRImage(key);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('NetEase QR Create Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
