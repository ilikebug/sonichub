const NeteaseApi = require('NeteaseCloudMusicApi');
const { login_qr_key, login_qr_create, login_qr_check, cloud, login_status } = NeteaseApi;

export async function getQRKey() {
    const result = await login_qr_key({});
    return result.body;
}

export async function createQRImage(key: string) {
    const result = await login_qr_create({
        key,
        qrimg: true,
    });
    return result.body;
}

export async function checkQRStatus(key: string) {
    const result = await login_qr_check({
        key,
    });
    return result.body;
}

export async function checkLoginStatus(cookie: string) {
    const result = await login_status({
        cookie,
    });
    return result.body;
}

export async function uploadToCloud(file: { name: string, data: Buffer }, cookie: string) {
    const result = await cloud({
        songFile: file,
        cookie,
    });
    return result.body;
}
