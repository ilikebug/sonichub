import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MAPPING_FILE, FAVORITES_FILE } from './cache';

// 通用的内存存储类
class FileStore<T> {
    private data: T | null = null;
    private filePath: string;
    private saveTimer: NodeJS.Timeout | null = null;
    private defaultValue: T;

    constructor(filePath: string, defaultValue: T) {
        this.filePath = filePath;
        this.defaultValue = defaultValue;
    }

    // 加载数据 (同步，仅首次)
    private load(): T {
        if (this.data !== null) return this.data;
        try {
            if (fs.existsSync(this.filePath)) {
                const content = fs.readFileSync(this.filePath, 'utf-8');
                this.data = JSON.parse(content);
            } else {
                this.data = this.defaultValue;
            }
        } catch (e) {
            console.error(`Failed to load store from ${this.filePath}`, e);
            this.data = this.defaultValue;
        }
        return this.data!;
    }

    // 获取数据
    public get(): T {
        return this.load();
    }

    // 更新数据 (防抖保存)
    public set(newData: T) {
        this.data = newData;

        // 防抖：500ms 后写入磁盘
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            this.saveToDisk();
        }, 500);
    }

    // 立即保存
    public async saveToDisk() {
        try {
            if (this.data) {
                await fs.promises.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
            }
        } catch (e) {
            console.error(`Failed to save store to ${this.filePath}`, e);
        }
    }
}

// 歌曲映射类型
interface SongMapping {
    [key: string]: {
        videoId: string;
        title: string;
        timestamp: number;
    };
}

// 初始化 Store
const mappingStore = new FileStore<SongMapping>(MAPPING_FILE, {});
const favoritesStore = new FileStore<any[]>(FAVORITES_FILE, []);

// --- 歌曲映射管理 ---

function getSongKey(title: string, artist: string): string {
    const normalized = `${title.toLowerCase().trim()}_${artist.toLowerCase().trim()}`;
    return crypto.createHash('md5').update(normalized).digest('hex');
}

export const songMapping = {
    get: (title: string, artist: string) => {
        const data = mappingStore.get();
        const key = getSongKey(title, artist);
        return data[key];
    },

    save: (title: string, artist: string, videoId: string, videoTitle: string) => {
        const data = mappingStore.get();
        const key = getSongKey(title, artist);

        // 只有当不存在或 ID 改变时才更新
        if (!data[key] || data[key].videoId !== videoId) {
            data[key] = {
                videoId,
                title: videoTitle,
                timestamp: Date.now()
            };
            mappingStore.set(data);
        }
    }
};

// --- 收藏管理 ---

export const favorites = {
    getAll: () => {
        return favoritesStore.get();
    },

    add: (song: any) => {
        const list = favoritesStore.get();
        if (!list.some(s => s.id === song.id)) {
            list.push(song);
            favoritesStore.set(list);
        }
        return list;
    },

    remove: (songId: string) => {
        let list = favoritesStore.get();
        const initialLength = list.length;
        list = list.filter(s => s.id !== songId);

        if (list.length !== initialLength) {
            favoritesStore.set(list);
        }
        return list;
    }
};
