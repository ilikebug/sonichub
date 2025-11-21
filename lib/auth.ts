// 简单的会话管理
const sessions = new Map<string, number>(); // token -> 过期时间戳
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 生成随机 token
export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 创建会话
export function createSession(): string {
  const token = generateToken();
  const expiresAt = Date.now() + SESSION_DURATION;
  sessions.set(token, expiresAt);
  return token;
}

// 验证会话
export function verifySession(token: string | null): boolean {
  if (!token) return false;
  
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  
  // 检查是否过期
  if (Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  
  return true;
}

// 删除会话
export function deleteSession(token: string): void {
  sessions.delete(token);
}

// 清理过期会话
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, expiresAt] of sessions.entries()) {
    if (now > expiresAt) {
      sessions.delete(token);
    }
  }
}

// 定期清理（每小时）
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

