let NeteaseApi: any;
try {
    NeteaseApi = require('NeteaseCloudMusicApi');
} catch (error) {
    console.error('Failed to load NeteaseCloudMusicApi:', error);
}

export async function getQRKey() {
    if (!NeteaseApi?.login_qr_key) {
        throw new Error('Netease API login_qr_key not loaded');
    }
    const result = await NeteaseApi.login_qr_key({});
    if (!result || !result.body) {
        throw new Error('Invalid response from NetEase API (getQRKey)');
    }
    return result.body;
}

export async function createQRImage(key: string) {
    if (!NeteaseApi?.login_qr_create) {
        throw new Error('Netease API login_qr_create not loaded');
    }
    const result = await NeteaseApi.login_qr_create({
        key,
        qrimg: true,
    });
    if (!result || !result.body) {
        throw new Error('Invalid response from NetEase API (createQRImage)');
    }
    return result.body;
}

export async function checkQRStatus(key: string) {
    if (!NeteaseApi?.login_qr_check) {
        throw new Error('Netease API login_qr_check not loaded');
    }
    const result = await NeteaseApi.login_qr_check({
        key,
    });
    if (!result || !result.body) {
        throw new Error('Invalid response from NetEase API (checkQRStatus)');
    }
    return result.body;
}

export async function checkLoginStatus(cookie: string) {
    if (!NeteaseApi?.login_status) {
        throw new Error('Netease API login_status not loaded');
    }
    const result = await NeteaseApi.login_status({
        cookie,
    });
    if (!result || !result.body) {
        throw new Error('Invalid response from NetEase API (checkLoginStatus)');
    }
    return result.body;
}

export async function uploadToCloud(file: { name: string, data: Buffer }, cookie: string) {
    if (!NeteaseApi?.cloud) {
        throw new Error('Netease API cloud not loaded');
    }
    const result = await NeteaseApi.cloud({
        songFile: file,
        cookie,
    });
    if (!result || !result.body) {
        throw new Error('Invalid response from NetEase API (uploadToCloud)');
    }
    return result.body;
}
