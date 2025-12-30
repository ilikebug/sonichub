import { NextResponse } from 'next/server';
import { getQRKey } from '@/lib/netease-api';

export async function GET() {
    try {
        const data = await getQRKey();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
