import { NextRequest, NextResponse } from 'next/server';
import { checkLoginStatus } from '@/lib/netease-api';

export async function POST(request: NextRequest) {
    try {
        const { cookie } = await request.json();

        if (!cookie) {
            return NextResponse.json({ authenticated: false });
        }

        const status: any = await checkLoginStatus(cookie);

        // 网易云 API 返回数据中，如果 profile 为空或者 code 不为 200，通常表示登录失效
        const isAuthenticated = status.data && status.data.code === 200 && status.data.profile;

        return NextResponse.json({
            authenticated: !!isAuthenticated,
            profile: status.data?.profile || null
        });

    } catch (error: any) {
        console.error('NetEase status check error:', error);
        return NextResponse.json({ authenticated: false, error: 'Failed to verify status' }, { status: 500 });
    }
}
