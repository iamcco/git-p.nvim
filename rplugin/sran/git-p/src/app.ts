import os from 'os';
import fs from 'fs';
import path from 'path';
import Plugin from 'sran.nvim';
import { Subject, Subscription, from, of, timer } from 'rxjs';
import { switchMap, map, catchError, filter } from 'rxjs/operators';
import findup from 'findup';

import { pcb, gitDiff, gitBlame } from './util';
import { BufferInfo, Diff } from './types';
import { signPrefix, signGroups, deleteTopAndBottomSymbol, deleteTopSymbol, delayGap } from './constant';

const TEMP_FROM_DIFF_FILE_NAME: string = 'git-p-from-diff.tmp'
const TEMP_TO_DIFF_FILE_NAME: string = 'git-p-diff.tmp'
const TEMP_FROM_BLAME_FILE_NAME: string = 'git-p-from-blame.tmp'
const TEMP_TO_BLAME_FILE_NAME: string = 'git-p-blame.tmp'

const NOTIFY_DIFF = 'git-p-diff'
const NOTIFY_BLAME = 'git-p-blame'

export default class App {
  private diff$: Subject<number> = new Subject<number>()
  private diffSubscription: Subscription
  private blameSubscription: Subscription
  private blame$: Subject<number> = new Subject<number>()
  private fromDiffFile: fs.WriteStream
  private toDiffFile: fs.WriteStream
  private fromBlameFile: fs.WriteStream
  private toBlameFile: fs.WriteStream
  private tempDir: string
  private logger: any

  constructor(private plugin: Plugin) {
    this.init()
  }

  private async init() {
    this.logger = this.plugin.util.getLogger('GIT-P:App')
    this.tempDir = await pcb(fs.mkdtemp)(path.join(os.tmpdir(), 'git-p'), 'utf-8')

    // diff subscription
    this.diffSubscription = this.diff$.pipe(
      switchMap(bufnr => from(this.getBufferInfo(bufnr))),
      filter((bufInfo) => bufInfo !== undefined),
      switchMap((bufInfo: BufferInfo) => {
        return timer(delayGap).pipe(
          switchMap(() => {
            this.updateDiffFile()
            return from(gitDiff({
              bufferInfo: bufInfo,
              fromFile: this.fromDiffFile,
              toFile: this.toDiffFile,
              logger: this.logger
            })).pipe(
              map(diff => ({
                diff,
                bufnr: bufInfo.bufnr
              })),
              catchError(error => {
                this.logger.info('CatchError: ', error)
                return of(error)
              })
            )
          })
        )
      })
    ).subscribe(({ diff, bufnr }) => {
      this.updateDiffSign(diff, bufnr)
    })

    // blame subscription
    this.blameSubscription = this.blame$.pipe(
      switchMap(bufnr => from(this.getBufferInfo(bufnr))),
      filter(bufInfo => bufInfo !== undefined),
      switchMap((bufInfo) => {
        this.updateBlameFile()
        return from(gitBlame({
          bufferInfo: bufInfo,
          fromFile: this.fromDiffFile,
          toFile: this.toDiffFile,
          logger: this.logger
        }))
      })
    ).subscribe(() => {
      //
    })

    this.plugin.nvim.on('notification', async (method: string, args: any[]) => {
      const bufnr = args[0]
      if (bufnr === -1 || bufnr === undefined) {
        return;
      }
      switch (method) {
        case NOTIFY_DIFF:
          this.updateDiff(bufnr)
          break;
        case NOTIFY_BLAME:
          this.updateBlame(bufnr)
          break;
        default:
          break;
      }
    })
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
    return new Promise(async (resolve, reject) => {
      const { nvim } = this.plugin
      const absFilePath = await nvim.call('expand', `#${bufnr}:p`)
      // file do not exist on disk
      if (!fs.existsSync(absFilePath)) {
        return resolve()
      }
      const gitDir = await pcb(findup, [], false)(absFilePath, '.git')
      const buffer = await this.getCurrentBuffer(bufnr)
      const content = await buffer.getLines()
      // .git dir do not exist
      if (!gitDir || !fs.existsSync(path.join(gitDir, '.git'))) {
        return resolve()
      }
      resolve({
        gitDir,
        filePath: path.relative(gitDir, absFilePath),
        absFilePath,
        bufnr,
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

  public updateDiffFile() {
    if (this.fromDiffFile && this.fromDiffFile.writable) {
      this.logger.info('close from file')
      this.closeFile(this.fromDiffFile)
    }
    if (this.toDiffFile && this.toDiffFile.writable) {
      this.logger.info('clsoe to file')
      this.closeFile(this.toDiffFile)
    }
    this.fromDiffFile = fs.createWriteStream(
      path.join(this.tempDir, TEMP_FROM_DIFF_FILE_NAME)
    )
    this.toDiffFile = fs.createWriteStream(
      path.join(this.tempDir, TEMP_TO_DIFF_FILE_NAME)
    )
  }

  private updateBlameFile() {
    if (this.fromBlameFile) {
      this.closeFile(this.fromBlameFile)
    }
    if (this.toBlameFile) {
      this.closeFile(this.toBlameFile)
    }
    this.fromBlameFile = fs.createWriteStream(
      path.join(this.tempDir, TEMP_FROM_BLAME_FILE_NAME)
    )
    this.toBlameFile = fs.createWriteStream(
      path.join(this.tempDir, TEMP_TO_BLAME_FILE_NAME)
    )
  }

  private updateDiff(bufnr: number) {
    this.diff$.next(bufnr)
  }

  public updateBlame(bufnr: number) {
    this.blame$.next(bufnr)
  }

  public destroy() {
    this.blameSubscription.unsubscribe()
    this.diffSubscription.unsubscribe()
  }
}
