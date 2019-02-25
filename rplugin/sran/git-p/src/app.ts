import fs from 'fs';
import path from 'path';
import Plugin from 'sran.nvim';
import { Subject, Subscription, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { pcb, gitHunk, gitBlame } from './util';
import { FileInfo } from './types';

const TEMP_TO_DIFF_FILE_NAME: string = 'git-p-diff.tmp'
const TEMP_FROM_DIFF_FILE_NAME: string = 'git-p-from-diff.tmp'
const TEMP_FROM_BLAME_FILE_NAME: string = 'git-p-from-blame.tmp'
const TEMP_TO_BLAME_FILE_NAME: string = 'git-p-blame.tmp'

export default class App {
  private hunk$: Subject<FileInfo> = new Subject<FileInfo>()
  private hunkSubscription: Subscription
  private blameSubscription: Subscription
  private blame$: Subject<FileInfo> = new Subject<FileInfo>()
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
    this.tempDir = await pcb(fs.mkdtemp)('git-p', 'utf-8')

    this.hunkSubscription = this.hunk$.pipe(
      switchMap((params: FileInfo) => {
        this.updateDiffFile()

        return from(gitHunk(params))
      })
    ).subscribe(res => {
      console.log(res);
    })

    this.blameSubscription = this.blame$.pipe(
      switchMap((params: FileInfo) => {
        this.updateBlameFile()
        return gitBlame(params)
      })
    ).subscribe(res => {
      console.log(res);
    })
  }

  private closeFile(file: fs.WriteStream) {
    try {
      file.close()
    } catch (error) {
      this.logger.error('Close File Fail: ', error)
    }
  }

  public updateDiffFile() {
    if (this.fromDiffFile) {
      this.closeFile(this.fromDiffFile)
    }
    if (this.toDiffFile) {
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

  private updateHunk(params: FileInfo) {
    this.hunk$.next(params)
  }

  public updateBlame(params: FileInfo) {
    this.blame$.next(params)
  }

  public destroy() {
    this.blameSubscription.unsubscribe()
    this.hunkSubscription.unsubscribe()
  }
}
