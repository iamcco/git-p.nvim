export interface GitParams {
  gitDir: string;
  workDir: string;
  fromFile: string;
  toFile: string;
}

export interface FileInfo {
  buffer: number;
  path: string;
}
