import Plugin from 'sran.nvim';
export default class App {
    private plugin;
    private diff$;
    private diffSubscription;
    private fromDiffFile;
    private toDiffFile;
    private toBlameFile;
    private tempDir;
    private logger;
    private virtualId;
    private blames;
    private diffs;
    private dpBuffer;
    private dpWindow;
    private blameTimer;
    private blameCount;
    constructor(plugin: Plugin);
    private init;
    private startSubscribeDiff;
    private displayBlame;
    /**
     * clear blame virtual text except:
     *
     * 1. do not support virtual
     * 2. do not have virtual set
     * 3. at the same as before
     */
    private clearBlameLine;
    private updateBlameLine;
    private updateDiffSign;
    private showDiffPreview;
    private focusDPWin;
    private getBufferInfo;
    private getCurrentBuffer;
    private closeFile;
    createDiffTmpFiles(): void;
    private createBlameTmpFiles;
    destroy(): void;
    private closeDiffPreview;
    private createBuffer;
    private createWin;
}
