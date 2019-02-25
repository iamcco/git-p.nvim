import { GitParams, Diff } from '../types';
export declare function pcb(cb: (...args: any[]) => void, codes?: Array<string | number>, isThrowError?: boolean): (...args: any[]) => Promise<any>;
export declare function gitDiff(params: GitParams): Promise<Diff>;
export declare function gitBlame(params: GitParams): Promise<any>;
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
