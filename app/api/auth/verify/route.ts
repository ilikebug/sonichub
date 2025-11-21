import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        // 从环境变量获取访问密码（支持两种方式）
        const correctPassword = process.env.APP_PASSWORD || process.env.NEXT_PUBLIC_APP_PASSWORD;

        // 调试信息（生产环境请删除）
        console.log('======= 密码验证调试 =======');
        console.log('设置的密码:', correctPassword ? `[${correctPassword}] (长度: ${correctPassword.length})` : '未设置');
        console.log('输入的密码:', password ? `[${password}] (长度: ${password.length})` : '未输入');
        console.log('是否匹配:', password === correctPassword);
        console.log('========================');

        if (!correctPassword) {
            // 如果没有设置密码，返回错误
            return NextResponse.json({
                success: false,
                message: '服务器未配置访问密码，请在 .env.local 文件中设置 APP_PASSWORD 或 NEXT_PUBLIC_APP_PASSWORD'
            }, { status: 500 });
        }

    // 验证密码
    if (password === correctPassword) {
      const token = createSession();
      return NextResponse.json({ success: true, token });
    } else {
      return NextResponse.json({ success: false, message: '密码错误' }, { status: 401 });
    }
    } catch (error) {
        console.error('Auth verification error:', error);
        return NextResponse.json({ success: false, message: '验证失败' }, { status: 500 });
    }
}

