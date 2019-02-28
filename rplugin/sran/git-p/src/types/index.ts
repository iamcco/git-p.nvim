import fs from 'fs';
import { Buffer } from 'neovim';

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

export type BlameLine = {
  hash?: string
  account?: string
  date?: string
  time?: string
  ago?: string
  zone?: string
  lineNum?: string
  lineString?: string
  rawString: string
}

export type BufferInfo = {
  buffer: Buffer
  gitDir: string
  filePath: string
  absFilePath: string
  bufnr: number
  content: string
  currentLine: number
}

export type GitDirs = {
  [gitDir: string]: {
    [filePath: string]: boolean
  }
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
