import fs from 'fs';
import { Buffer } from 'neovim';
export declare type DiffInfo = {
    [diffKey: string]: string[];
};
export declare type DiffLine = {
    operate: '-' | '_' | '[' | '+' | '~';
    diffKey: string;
};
export declare type Diff = {
    info: DiffInfo;
    lines: {
        [lineNum: string]: DiffLine;
    };
};
export declare type BlameLine = {
    hash?: string;
    account?: string;
    date?: string;
    time?: string;
    ago?: string;
    zone?: string;
    lineNum?: string;
    lineString?: string;
    commit?: string;
    rawString: string;
};
export declare type BufferInfo = {
    buffer: Buffer;
    gitDir: string;
    filePath: string;
    absFilePath: string;
    bufnr: number;
    content: string;
    currentLine: number;
};
export declare type GitDirs = {
    [gitDir: string]: {
        [filePath: string]: boolean;
    };
};
export interface GitParams {
    fromFile: fs.WriteStream;
    toFile: fs.WriteStream;
    bufferInfo: BufferInfo;
    logger: {
        info: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        error: (...args: any[]) => void;
    };
}
