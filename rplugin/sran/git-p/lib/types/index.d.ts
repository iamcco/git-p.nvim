import fs from 'fs';
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
export interface BufferInfo {
    gitDir: string;
    filePath: string;
    absFilePath: string;
    bufnr: number;
    content: string;
}
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
