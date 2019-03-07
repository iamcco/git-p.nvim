import os from 'os';
import fs from 'fs';
import path from 'path';
import Plugin from 'sran.nvim';
import { Subject, Subscription, from, of, timer } from 'rxjs';
import { switchMap, map, catchError, filter, mergeMap } from 'rxjs/operators';
import findup from 'findup';

import { pcb, gitDiff } from './util';
import { BufferInfo, Diff, BlameLine } from './types';
import {
  signPrefix,
  signGroups,
  deleteTopAndBottomSymbol,
  deleteTopSymbol,
  delayGap,
  ignorePrefix,
  blameKeys,
} from './constant';

const TEMP_FROM_DIFF_FILE_NAME: string = 'git-p-from-diff.tmp'
const TEMP_TO_DIFF_FILE_NAME: string = 'git-p-diff.tmp'
const TEMP_TO_BLAME_FILE_NAME: string = 'git-p-blame.tmp'

const NOTIFY_DIFF = 'git-p-diff'
const NOTIFY_CLEAR_BLAME = 'git-p-clear-blame'
const REQUEST_BLAME = 'git-p-r-blame'

export default class App {
  private diff$: Subject<number> = new Subject<number>()
  private diffSubscription: Subscription
  private fromDiffFile: fs.WriteStream
  private toDiffFile: fs.WriteStream
  private toBlameFile: fs.WriteStream
  private tempDir: string
  private logger: any
  private virtualId: number | undefined
  // save blame line number of each buffer
  private blames: {
    [bufnr: string]: {
      line: number
      blame: BlameLine
      mode: string // vim mode
    }
  } = {}
  // save diff info of each buffer
  private diffs: {
    [bufnr: string]: Diff
  } = {}

  constructor(private plugin: Plugin) {
    this.init()
  }

  private async init() {
    const { nvim, util } = this.plugin
    this.logger = util.getLogger('GIT-P:App')
    this.tempDir = await pcb(fs.mkdtemp)(path.join(os.tmpdir(), 'git-p'), 'utf-8')

    // if support virtual text
    const hasVirtualText = await nvim.call('exists', '*nvim_buf_set_virtual_text')
    if (hasVirtualText === 1) {
      this.virtualId = await nvim.call('nvim_create_namespace', 'git-p-virtual-text')
    }

    // subscribe diff
    this.diffSubscription = this.startSubscribeDiff()

    // trigger diff update
    const bufnr: number = await nvim.call('bufnr', '%')
    this.diff$.next(bufnr)

    // listen notification
    this.plugin.nvim.on('notification', async (method: string, args: any[]) => {
      const bufnr = args[0]
      if (bufnr === -1 || bufnr === undefined) {
        return;
      }
      switch (method) {
        case NOTIFY_DIFF:
          this.diff$.next(bufnr)
          break;
        case NOTIFY_CLEAR_BLAME:
          this.clearBlameLine(bufnr, args[1])
          break;
        default:
          break;
      }
    })

    this.plugin.nvim.on( 'request',
      async (method: string, args: any[], res: { send: (...args: any[]) => any }) => {
        const bufnr = args[0]
        if (bufnr === -1 || bufnr === undefined) {
          return;
        }
        switch (method) {
          case REQUEST_BLAME:
            res.send(args)
            break;
          default:
            break;
        }
    })
  }

  private startSubscribeDiff(): Subscription {
    return this.diff$.pipe(
      switchMap(bufnr => timer(delayGap).pipe(
        switchMap(() => from(this.getBufferInfo(bufnr))),
        filter((bufInfo) => bufInfo !== undefined),
        switchMap((bufInfo: BufferInfo) => {
          this.createDiffTmpFiles()
          return from(gitDiff({
            bufferInfo: bufInfo,
            fromFile: this.fromDiffFile,
            toFile: this.toDiffFile,
            logger: this.logger
          })).pipe(
            map(res => ({
              bufInfo,
              blame: res.blame,
              diff: res.diff,
            })),
            catchError(error => {
              this.logger.info('Current Buffer Info: ', {
                bufnr: bufInfo.bufnr,
                gitDir: bufInfo.gitDir,
                filePath: bufInfo.filePath,
                currentLine: bufInfo.currentLine,
              })
              this.logger.error('Diff Error: ', error.message)
              return of(error)
            })
          )
        })
      )),
      mergeMap(({ bufInfo, blame, diff }: {
        bufInfo: BufferInfo,
        blame: BlameLine,
        diff: Diff
      }) => {
        return from((async () => {
          if (!bufInfo) {
            return
          }
          try {
            // save diff
            this.diffs[bufInfo.bufnr] = diff
            // upate diff sign
            await this.updateDiffSign(diff, bufInfo.bufnr)
            // update b:gitp_blame
            await bufInfo.buffer.setVar('gitp_blame', blame)
            // update b:gitp_diff_state
            await bufInfo.buffer.setVar('gitp_diff_state', diff.state)
            // update blame line
            await this.updateBlameLine(blame, bufInfo)
            // trigger diff and blame update user event
            await this.plugin.nvim.call('gitp#diff_and_blame_update')
          } catch (error) {
            return error
          }
        })())
      })
    ).subscribe(error => {
      if (error) {
        this.logger.error('Update Diff Signs Error: ', error)
      }
    })
  }

  /**
   * clear blame virtual text except:
   *
   * 1. do not support virtual
   * 2. do not have virtual set
   * 3. at the same as before
   */
  private clearBlameLine(bufnr: number, line: number) {
    if (this.virtualId === undefined ||
      this.blames[bufnr] === undefined ||
      line === undefined ||
      this.blames[bufnr].line === line
    ) {
      return
    }
    this.blames[bufnr] = undefined
    const { nvim } = this.plugin
    nvim.call( 'nvim_buf_clear_namespace', [bufnr, this.virtualId, 0, -1])
  }

  private async updateBlameLine(blame: BlameLine, bufInfo: BufferInfo) {
    if (!blame || this.virtualId === undefined) {
      return
    }
    const { nvim } = this.plugin
    // virtual text is not enable
    const enableVirtualText = await nvim.getVar('gitp_blame_virtual_text')
    if (enableVirtualText !== 1) {
      return
    }
    const { bufnr, currentLine } = bufInfo
    const mode: string = await nvim.call('mode')
    // do not update blame if same line, hash and mode as before
    if (this.blames[bufnr] !== undefined &&
      this.blames[bufnr].line === currentLine &&
      this.blames[bufnr].blame.hash === blame.hash &&
      this.blames[bufnr].mode === mode &&
      mode !== 'n'
    ) {
      return
    }
    // save blame
    this.blames[bufnr] = {
      line: currentLine,
      blame,
      mode
    }
    // clear pre virtual text
    await nvim.call( 'nvim_buf_clear_namespace', [bufnr, this.virtualId, 0, -1])
    const formtLine = await nvim.getVar('gitp_blmae_format')
    const blameText = blameKeys.reduce((res, next) => {
      return res.replace(`%{${next}}`, blame[next])
    }, formtLine as string)
    // set new virtual text
    await nvim.call(
      'nvim_buf_set_virtual_text',
      [
        bufnr,
        this.virtualId,
        currentLine - 1,
        [[blameText, 'GitPBlameLine']],
        {}
      ]
    )
  }

  // update diff sign by diff info
  private async updateDiffSign(diff: Diff, bufnr: number) {
    if (!diff || bufnr === undefined) {
      return
    }
    const { nvim } = this.plugin
    const { lines } = diff;
    /**
     * signsRaw:
     *
     *  --- Signs ---
     *  rplugin/sran/git-p/src/app.ts 的 Signs:
     *  line=11  id=600011  name=GitPAddSign
     *  ....
     */
    const signsRaw: string = await nvim.call('gitp#get_signs', bufnr)
    const signsLines: string[] = signsRaw.trim().split('\n').slice(2)
    const otherSigns: {
      [lnum: string]: Array<{signId: string, groupName: string}>
    } = {}
    // lnum 0 should assign to 1
    if (lines['0']) {
      if (lines['1']) {
        lines['1'].operate = deleteTopAndBottomSymbol
      } else {
        lines['1'] = {
          operate: deleteTopSymbol,
          diffKey: lines['0'].diffKey
        }
      }
      delete lines['0']
    }

    // resolve with old diff sign
    for (const line of signsLines) {
      // sign line: 'line=11  id=600011  name=GitPAddSign'
      // parse sign line to: lnum, signId, groupName
      const [lnum, signId, groupName] = line
        .split('=')
        .slice(1, 4)
        .map((item, idx) => {
          if (idx > 1) {
            return item.replace(/\s*$/, '')
          }
          return item.replace(/[^0-9]+$/, '')
        })

      // invalid line format
      if (lnum === undefined || signId === undefined) {
        continue
      }

      // diff sign
      if (signId.startsWith(signPrefix)) {
        if (lines[lnum]) {
          const group = signGroups[lines[lnum].operate]
          // update diff sign if groupName is difference
          if (group !== groupName) {
            nvim.command(
              `sign place ${signPrefix}${lnum} line=${lnum} name=${group} buffer=${bufnr}`
            )
          }
          delete lines[lnum]
        } else {
          // delete diff sign if do not exist
          nvim.command(`sign unplace ${signId} buffer=${bufnr}`)
        }
      } else if (!signId.startsWith(signPrefix)) {
        if (!otherSigns[lnum]) {
          otherSigns[lnum] = []
        }
        otherSigns[lnum].push({
          signId,
          groupName
        })
      }
    }
    // place new diff sign
    for (const lnum in lines) {
      const sign = signGroups[lines[lnum].operate]
      nvim.command(
        `sign place ${signPrefix}${lnum} line=${lnum} name=${sign} buffer=${bufnr}`
      )
      // if line lnum have other sign,
      // upate it so it will cover on diff sign
      if (otherSigns[lnum]) {
        otherSigns[lnum].forEach(({ signId, groupName }) => {
          nvim.command(
            `sign place ${signId} line=${lnum} name=${groupName} buffer=${bufnr}`
          )
        })
      }
    }
  }

  private getBufferInfo(bufnr: number): Promise<undefined | BufferInfo> {
    return new Promise(async (resolve) => {
      const { nvim } = this.plugin
      const absFilePath = await nvim.call('expand', `#${bufnr}:p`)

      // file do not exist on disk
      if (!fs.existsSync(absFilePath)) {
        return resolve()
      }

      const gitDir = await pcb(findup, [], false)(absFilePath, '.git')
      // .git dir do not exist
      if (!gitDir || !fs.existsSync(path.join(gitDir, '.git'))) {
        return resolve()
      }

      const filePath = path.relative(gitDir, absFilePath)
      // ignore if match prefix
      if (ignorePrefix.some(prefix => filePath.startsWith(prefix))) {
        return resolve()
      }

      const buffer = await this.getCurrentBuffer(bufnr)
      const currentLine: number = await nvim.call('line', '.')
      const content = await buffer.getLines()
      resolve({
        buffer,
        gitDir,
        filePath,
        absFilePath,
        bufnr,
        currentLine,
        content: content.join('\n') + '\n' // end newline
      })
    })
  }

  private async getCurrentBuffer(bufnr: number) {
    const { nvim } = this.plugin;
    let buffer = await nvim.buffer
    if (bufnr === buffer.id) {
      return buffer
    }
    const buffers = await nvim.buffers
    buffers.some(buf => {
      if (buf.id === bufnr) {
        buffer = buf
        return true;
      }
      return false;
    })
    return buffer;
  }

  private closeFile(file: fs.WriteStream) {
    try {
      file.close()
    } catch (error) {
      this.logger.error('Close File Fail: ', error)
    }
  }

  // close tmp write stream and open new write stream
  public createDiffTmpFiles() {
    if (this.fromDiffFile && this.fromDiffFile.writable) {
      this.closeFile(this.fromDiffFile)
    }
    if (this.toDiffFile && this.toDiffFile.writable) {
      this.closeFile(this.toDiffFile)
    }
    this.fromDiffFile = fs.createWriteStream(
      path.join(this.tempDir, TEMP_FROM_DIFF_FILE_NAME)
    )
    this.toDiffFile = fs.createWriteStream(
      path.join(this.tempDir, TEMP_TO_DIFF_FILE_NAME)
    )
  }

  private createBlameTmpFiles() {
    if (this.toBlameFile) {
      this.closeFile(this.toBlameFile)
    }
    this.toBlameFile = fs.createWriteStream(
      path.join(this.tempDir, TEMP_TO_BLAME_FILE_NAME)
    )
  }

  public destroy() {
    this.diffSubscription.unsubscribe()
  }
}
