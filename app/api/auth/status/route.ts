import { NextResponse } from 'next/server';

export async function GET() {
    const password = process.env.APP_PASSWORD || process.env.NEXT_PUBLIC_APP_PASSWORD;

    return NextResponse.json({
        required: !!password && password.length > 0
    });
}
