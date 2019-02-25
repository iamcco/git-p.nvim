import { execFile } from 'child_process';
import { GitParams, Diff } from '../types';
import { deleteBottomSymbol, modifySymbol, addSymbol } from '../constant';

// cover cb type async function to promise
export function pcb(
  cb: (...args: any[]) => void,
  codes: Array<string|number> = [],
  isThrowError: boolean = true
): (...args: any[]) => Promise<any> {
  return function(...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      cb(...args, function(error: NodeJS.ErrnoException, ...args: any[]) {
        if (error) {
          if (isThrowError && (!codes || codes.indexOf(error.code) === -1 )) {
            return reject(error)
          }
        }
        resolve(args.length < 2 ? args[0] : args)
      })
    })
  }
}

// get git hunk info
export async function gitDiff(params: GitParams): Promise<Diff> {
  return new Promise<Diff>(async (resolve, reject) => {
    const {
      bufferInfo,
      fromFile,
      toFile,
    } = params

    try {
      // get index file
      const [indexFile] = await pcb(execFile)(
        'git',
        ['--no-pager', 'show', `:${bufferInfo.filePath}`],
        {
          cwd: bufferInfo.gitDir,
        }
      )

      // write index file to tmp file
      await pcb(fromFile.end.bind(fromFile))(indexFile)

      // write buffer content to tmp file
      await pcb(toFile.end.bind(toFile))(bufferInfo.content)

      // git diff exit with code 1 if there is difference
      const [diff] = await pcb(execFile, [1])(
        'git',
        ['--no-pager', 'diff', '-p', '-U0', '--no-color', fromFile.path, toFile.path ],
        {
          cwd: bufferInfo.gitDir
        }
      )
      resolve(parseDiff(diff))
    } catch (error) {
      reject(error)
    }
  })
}

// get git blame info
export function gitBlame(params: GitParams): Promise<any> {
  return new Promise(() => {
  })
}

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
export function parseDiff(diffStr: string): Diff {
  // split to lines and delete the first four lines and the last '\n'
  const allLines = diffStr.split('\n').slice(4, -1)
  // diff info
  const diff: Diff = {
    info: {},
    lines: {}
  }
  const { info, lines } = diff

  // current diff key
  let diffKey: string

  for (const line of allLines) {
    if (!line.startsWith('@@')) {
      if (diffKey && info[diffKey]) {
        info[diffKey].push(line)
      }
      continue
    }

    let hunkKey = line.split('@@', 2)[1]
    // invalid format line
    if (!hunkKey) {
      continue
    }

    // Diff key: -xx +yy
    diffKey = hunkKey.trim()
    info[diffKey] = []

    const [pres, nows]: Array<Array<undefined | string>> = diffKey
      .split(/\s+/)
      .map(str => str.slice(1).split(','))

    // delete
    if (nows[1] === '0') {
      lines[nows[0]] = {
        operate: deleteBottomSymbol,
        diffKey
      }
    } else {
      const deleteCount = parseInt(`${pres[1] || 1}`, 10)
      const addCount = parseInt(`${nows[1] || 1}`, 10)
      const lineNum = parseInt(nows[0], 10)

      for (let i = 0; i < addCount; i++) {
        // delete and add at the same line
        if (i < deleteCount) {
          lines[lineNum + i] = {
            operate: modifySymbol,
            diffKey
          }
        } else {
          // add new line
          lines[lineNum + i] = {
            operate: addSymbol,
            diffKey
          }
        }
      }
    }
  }
  return diff
}
