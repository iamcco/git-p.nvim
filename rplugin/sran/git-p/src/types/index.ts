import fs from 'fs';

export type DiffInfo = {
  [diffKey: string]: string[]
}

export type DiffLine = {
  operate: '-' | '_' | '[' | '+' | '~'
  diffKey: string
}

export type Diff = {
  info: DiffInfo
  lines: {
    [lineNum: string]: DiffLine
  }
}

export interface BufferInfo {
  gitDir: string
  filePath: string
  absFilePath: string
  bufnr: number
  content: string
}

export interface GitParams {
  fromFile: fs.WriteStream;
  toFile: fs.WriteStream;
  bufferInfo: BufferInfo;
  logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  }
}

