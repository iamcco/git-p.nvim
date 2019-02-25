import { execFile } from 'child_process';
import { GitParams } from '../types';
// cover cb type async function to promise
export function pcb(cb: (...args: any[]) => void): (...args: any[]) => Promise<any> {
  return function(...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      cb(...args, function(error: NodeJS.ErrnoException, ...args: any[]) {
        if (error) {
          return reject(error)
        }
        resolve(...args)
      })
    })
  }
}

// get git hunk info
export function gitHunk(params: GitParams): Promise<any> {
  execFile('git', ['--no-pager', 'diff', '-p', '-U0', ])
}

// get git blame info
export function gitBlame(params: GitParams): Promise<any> {
}
