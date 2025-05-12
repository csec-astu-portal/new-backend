import { Express } from 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: {
        [fieldname: string]: Express.Multer.File[];
      } | Express.Multer.File[];
    }
  }
}

// Add declaration for multer
declare module 'multer' {
  import { Request, Response } from 'express';
  
  namespace multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
    
    interface FileFilterCallback {
      (error: Error | null, acceptFile: boolean): void;
    }
    
    interface StorageEngine {
      _handleFile(req: Request, file: File, callback: (error?: any, info?: Partial<File>) => void): void;
      _removeFile(req: Request, file: File, callback: (error: Error | null) => void): void;
    }
    
    interface DiskStorageOptions {
      destination?: string | ((req: Request, file: File, callback: (error: Error | null, destination: string) => void) => void);
      filename?: (req: Request, file: File, callback: (error: Error | null, filename: string) => void) => void;
    }
    
    interface Options {
      dest?: string;
      storage?: StorageEngine;
      limits?: {
        fieldNameSize?: number;
        fieldSize?: number;
        fields?: number;
        fileSize?: number;
        files?: number;
        parts?: number;
        headerPairs?: number;
      };
      fileFilter?: (req: Request, file: File, callback: FileFilterCallback) => void;
      preservePath?: boolean;
    }
  }
  
  function multer(options?: multer.Options): any;
  
  namespace multer {
    function diskStorage(options: DiskStorageOptions): StorageEngine;
    function memoryStorage(): StorageEngine;
  }
  
  export = multer;
}
