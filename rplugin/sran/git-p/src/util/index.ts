import { execFile } from 'child_process';
import { GitParams, Diff, BlameLine, BufferInfo } from '../types';
import {
  deleteBottomSymbol,
  modifySymbol,
  addSymbol,
  year,
  month,
  day,
  hour,
  minute,
  second,
  emptyHash,
  maxBuffer
} from '../constant';

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

// get diff info
export async function gitDiff(params: GitParams): Promise<{ blame: BlameLine, diff: Diff }> {
  return new Promise<{ blame: BlameLine, diff: Diff }>(async (resolve, reject) => {
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
          maxBuffer
        }
      )

      // write index file to tmp file
      await pcb(fromFile.end.bind(fromFile))(indexFile)

      // write buffer content to tmp file
      await pcb(toFile.end.bind(toFile))(bufferInfo.content)

      const [blame] = await pcb(execFile)(
        'git',
        [
          '--no-pager',
          'blame',
          '-l',
          '--root',
          '-t',
          `-L${bufferInfo.currentLine},${bufferInfo.currentLine}`,
          '--contents',
          toFile.path,
          bufferInfo.filePath
        ],
        {
          cwd: bufferInfo.gitDir,
          maxBuffer
        }
      )

      const blameLine = await getBlame(blame, bufferInfo)

      // git diff exit with code 1 if there is difference
      const [diff] = await pcb(execFile, [1])(
        'git',
        ['--no-pager', 'diff', '-p', '-U0', '--no-color', fromFile.path, toFile.path ],
        {
          cwd: bufferInfo.gitDir,
          maxBuffer
        }
      )
      resolve({
        blame: blameLine,
        diff: parseDiff(diff),
      })
    } catch (error) {
      reject(error)
    }
  })
}

export async function getCommit(hash: string, cwd: string): Promise<string> {
  if (hash === emptyHash) {
    return 'Not Committed Yet'
  }
  const [commit]: [string] = await pcb(execFile)(
    'git',
    [
      '--no-pager',
      'log',
      '--oneline',
      '-n1',
      hash
    ],
    {
      cwd,
      maxBuffer
    }
  )
  return parseCommit(commit.trim())
}

/**
 * commit line:
 *
 * d719e63 (HEAD -> master, origin/master, origin/HEAD) add git blame line support witch virtual text
 */
export function parseCommit(line: string): string {
  return line.replace(/^[^ ]+\s+(\([^)]+\)\s?)?/, '')
}

/**
 * blame lines example:
 *
 * 1135f48e9dc3fd2a04d26bde28b3c6d7e2098653 (iamcco            1551111936 +0800  7) import findup from 'findup';
 * b162af96d412d4dc97e64ea79c299ecd5abaf079 (iamcco            1551097475 +0800  8)
 * 0000000000000000000000000000000000000000 (Not Committed Yet 1551503101 +0800  9) import { pcb, gitDiff } from './util';
 * ...
 */
export function parseBlame(line: string): BlameLine {
  let items = line.split('(')
  const hash = items[0].split(' ')[0]
  items = items.slice(1).join('(').split(')')
  const lineString = items[1].trim()
  let infos = items[0].split(' ')
  const lineNum = infos.pop()
  const zone = infos.pop()
  const timestamp = infos.pop()
  const account = infos.join(' ')
  const res = {
    hash,
    account: hash === emptyHash ? 'You' : account,
    date: dateFormat(timestamp, 'YYYY/HH/DD'),
    time: dateFormat(timestamp, 'HH:mm:ss'),
    ago: ago(timestamp),
    zone,
    lineNum,
    lineString,
    rawString: line,
  }
  return res
}

export async function getBlame(line: string, bufInfo: BufferInfo): Promise<BlameLine> {
  const blame = parseBlame(line)
  blame.commit = await getCommit(blame.hash, bufInfo.gitDir)
  return blame
}

export function align(str: string | number): string {
  return `${str}`.replace(/^(\d)$/, '0$1')
}

export function ago(timestamp: string): string {
  const now = Date.now()
  const before = new Date(parseInt(`${timestamp}000`, 10)).getTime()
  const gap = now - before
  const years = Math.floor(gap / year)
  if (years) {
    return `${years} year${years > 1 && 's' || ''} ago`
  }
  const months = Math.floor(gap / month)
  if (months) {
    return `${months} month${months > 1 && 's' || ''} ago`
  }
  const days = Math.floor(gap / day)
  if (days) {
    return `${days} day${days > 1 && 's' || ''} ago`
  }
  const hours = Math.floor(gap / hour)
  if (hours) {
    return `${hours} hour${hours > 1 && 's' || ''} ago`
  }
  const minutes = Math.floor(gap / minute)
  if (minutes) {
    return `${minutes} minute${minutes > 1 && 's' || ''} ago`
  }
  const seconds = Math.floor(gap / second)
  if (seconds) {
    return `${seconds} second${seconds > 1 && 's' || ''} ago`
  }
  return 'a moment ago'
}

export function dateFormat(timestamp: string, format: string): string {
  if (timestamp === undefined) {
    return ''
  }
  const date = new Date(parseInt(`${timestamp}000`, 10))
  return format.replace(/YYYY/g, `${date.getFullYear()}`)
    .replace(/MM/g, `${date.getMonth() + 1}`)
    .replace(/DD/g, align(date.getDate()))
    .replace(/HH/g, align(date.getHours()))
    .replace(/hh/g, `${date.getHours()}`)
    .replace(/mm/g, align(date.getMinutes()))
    .replace(/ss/g, align(date.getSeconds()))
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
    lines: {},
    state: {
      delete: 0,
      add: 0,
      modify: 0
    }
  }
  const { info, lines, state } = diff

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

    const deleteCount = parseInt(`${pres[1] || 1}`, 10)
    const addCount = parseInt(`${nows[1] || 1}`, 10)
    const lineNum = parseInt(nows[0], 10)


    state.delete += deleteCount
    state.add += addCount

    // delete
    if (nows[1] === '0') {
      lines[nows[0]] = {
        operate: deleteBottomSymbol,
        diffKey
      }
    } else {
      for (let i = 0; i < addCount; i++) {
        // delete and add at the same line
        if (i < deleteCount) {
          lines[lineNum + i] = {
            operate: modifySymbol,
            diffKey
          }
          state.modify += 1
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

  // update delete and add lines
  state.delete -= state.modify
  state.add -= state.modify

  return diff
}
