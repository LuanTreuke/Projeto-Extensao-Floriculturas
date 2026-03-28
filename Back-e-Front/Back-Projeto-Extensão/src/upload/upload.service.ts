import { Injectable } from '@nestjs/common';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  generateFileName(originalName: string): string {
    const ext = extname(originalName);
    const uuid = uuidv4();
    return `${uuid}${ext}`;
  }

  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  async deleteFile(pathOrFilename: string): Promise<void> {
    if (!pathOrFilename) return;

    const filename = pathOrFilename.includes('/')
      ? pathOrFilename.split('/').filter(Boolean).pop()
      : pathOrFilename;

    if (!filename) return;

    const fullPath = join(process.cwd(), 'uploads', filename);

    try {
      await fs.unlink(fullPath);
    } catch (err: any) {
      if (err && err.code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
