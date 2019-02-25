import Plugin from 'sran.nvim';
export default class App {
    private plugin;
    private diff$;
    private diffSubscription;
    private blameSubscription;
    private blame$;
    private fromDiffFile;
    private toDiffFile;
    private fromBlameFile;
    private toBlameFile;
    private tempDir;
    private logger;
    constructor(plugin: Plugin);
    private init;
    private updateDiffSign;
    private getBufferInfo;
    private getCurrentBuffer;
    private closeFile;
    updateDiffFile(): void;
    private updateBlameFile;
    private updateDiff;
    updateBlame(bufnr: number): void;
    destroy(): void;
}
