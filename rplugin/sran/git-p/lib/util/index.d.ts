import { GitParams, Diff, BlameLine } from '../types';
export declare function pcb(cb: (...args: any[]) => void, codes?: Array<string | number>, isThrowError?: boolean): (...args: any[]) => Promise<any>;
export declare function gitDiff(params: GitParams): Promise<{
    blame: BlameLine;
    diff: Diff;
}>;
/**
 * blame lines example:
 *
 * 1135f48e9dc3fd2a04d26bde28b3c6d7e2098653 (iamcco            1551111936 +0800  7) import findup from 'findup';
 * b162af96d412d4dc97e64ea79c299ecd5abaf079 (iamcco            1551097475 +0800  8)
 * 0000000000000000000000000000000000000000 (Not Committed Yet 1551503101 +0800  9) import { pcb, gitDiff } from './util';
 * ...
 */
export declare function parseBlame(line: string): BlameLine;
export declare function align(str: string | number): string;
export declare function ago(timestamp: string): string;
export declare function dateFormat(timestamp: string, format: string): string;
/**
 * parse diff string to Diff
 *
 * diff string example:
 *
 * diff --git a/plugin/gitp.vim b/plugin/gitp.vim
 * index 7a55c07..b3df694 100644
 * --- a/plugin/gitp.vim
 * +++ b/plugin/gitp.vim
 * @@ -21,8 +21,14 @@ highlight GitPModifyHi guifg=#0000ff
 * -sign define GitPDeleteSign text=- texthl=GitPDeleteHi
 * ...
 */
export declare function parseDiff(diffStr: string): Diff;
