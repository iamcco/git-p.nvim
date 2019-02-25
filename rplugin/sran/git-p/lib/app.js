"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var os_1 = tslib_1.__importDefault(require("os"));
var fs_1 = tslib_1.__importDefault(require("fs"));
var path_1 = tslib_1.__importDefault(require("path"));
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var findup_1 = tslib_1.__importDefault(require("findup"));
var util_1 = require("./util");
var constant_1 = require("./constant");
var TEMP_FROM_DIFF_FILE_NAME = 'git-p-from-diff.tmp';
var TEMP_TO_DIFF_FILE_NAME = 'git-p-diff.tmp';
var TEMP_FROM_BLAME_FILE_NAME = 'git-p-from-blame.tmp';
var TEMP_TO_BLAME_FILE_NAME = 'git-p-blame.tmp';
var NOTIFY_DIFF = 'git-p-diff';
var NOTIFY_BLAME = 'git-p-blame';
var App = /** @class */ (function () {
    function App(plugin) {
        this.plugin = plugin;
        this.diff$ = new rxjs_1.Subject();
        this.blame$ = new rxjs_1.Subject();
        this.init();
    }
    App.prototype.init = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a;
            var _this = this;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.logger = this.plugin.util.getLogger('GIT-P:App');
                        _a = this;
                        return [4 /*yield*/, util_1.pcb(fs_1.default.mkdtemp)(path_1.default.join(os_1.default.tmpdir(), 'git-p'), 'utf-8')
                            // diff subscription
                        ];
                    case 1:
                        _a.tempDir = _b.sent();
                        // diff subscription
                        this.diffSubscription = this.diff$.pipe(operators_1.switchMap(function (bufnr) { return rxjs_1.from(_this.getBufferInfo(bufnr)); }), operators_1.filter(function (bufInfo) { return bufInfo !== undefined; }), operators_1.switchMap(function (bufInfo) {
                            return rxjs_1.timer(constant_1.delayGap).pipe(operators_1.switchMap(function () {
                                _this.updateDiffFile();
                                return rxjs_1.from(util_1.gitDiff({
                                    bufferInfo: bufInfo,
                                    fromFile: _this.fromDiffFile,
                                    toFile: _this.toDiffFile,
                                    logger: _this.logger
                                })).pipe(operators_1.map(function (diff) { return ({
                                    diff: diff,
                                    bufnr: bufInfo.bufnr
                                }); }), operators_1.catchError(function (error) {
                                    _this.logger.info('CatchError: ', error);
                                    return rxjs_1.of(error);
                                }));
                            }));
                        })).subscribe(function (_a) {
                            var diff = _a.diff, bufnr = _a.bufnr;
                            _this.updateDiffSign(diff, bufnr);
                        });
                        // blame subscription
                        this.blameSubscription = this.blame$.pipe(operators_1.switchMap(function (bufnr) { return rxjs_1.from(_this.getBufferInfo(bufnr)); }), operators_1.filter(function (bufInfo) { return bufInfo !== undefined; }), operators_1.switchMap(function (bufInfo) {
                            _this.updateBlameFile();
                            return rxjs_1.from(util_1.gitBlame({
                                bufferInfo: bufInfo,
                                fromFile: _this.fromDiffFile,
                                toFile: _this.toDiffFile,
                                logger: _this.logger
                            }));
                        })).subscribe(function () {
                            //
                        });
                        this.plugin.nvim.on('notification', function (method, args) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var bufnr;
                            return tslib_1.__generator(this, function (_a) {
                                bufnr = args[0];
                                if (bufnr === -1 || bufnr === undefined) {
                                    return [2 /*return*/];
                                }
                                switch (method) {
                                    case NOTIFY_DIFF:
                                        this.updateDiff(bufnr);
                                        break;
                                    case NOTIFY_BLAME:
                                        this.updateBlame(bufnr);
                                        break;
                                    default:
                                        break;
                                }
                                return [2 /*return*/];
                            });
                        }); });
                        return [2 /*return*/];
                }
            });
        });
    };
    // update diff sign by diff info
    App.prototype.updateDiffSign = function (diff, bufnr) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var nvim, lines, signsRaw, signsLines, otherSigns, _i, signsLines_1, line, _a, lnum, signId, groupName, group, _loop_1, lnum;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!diff || bufnr === undefined) {
                            return [2 /*return*/];
                        }
                        nvim = this.plugin.nvim;
                        lines = diff.lines;
                        return [4 /*yield*/, nvim.call('gitp#get_signs', bufnr)];
                    case 1:
                        signsRaw = _b.sent();
                        signsLines = signsRaw.trim().split('\n').slice(2);
                        otherSigns = {};
                        // lnum 0 should assign to 1
                        if (lines['0']) {
                            if (lines['1']) {
                                lines['1'].operate = constant_1.deleteTopAndBottomSymbol;
                            }
                            else {
                                lines['1'] = {
                                    operate: constant_1.deleteTopSymbol,
                                    diffKey: lines['0'].diffKey
                                };
                            }
                            delete lines['0'];
                        }
                        // resolve with old diff sign
                        for (_i = 0, signsLines_1 = signsLines; _i < signsLines_1.length; _i++) {
                            line = signsLines_1[_i];
                            _a = line
                                .split('=')
                                .slice(1, 4)
                                .map(function (item, idx) {
                                if (idx > 1) {
                                    return item.replace(/\s*$/, '');
                                }
                                return item.replace(/[^0-9]+$/, '');
                            }), lnum = _a[0], signId = _a[1], groupName = _a[2];
                            // invalid line format
                            if (lnum === undefined || signId === undefined) {
                                continue;
                            }
                            // diff sign
                            if (signId.startsWith(constant_1.signPrefix)) {
                                if (lines[lnum]) {
                                    group = constant_1.signGroups[lines[lnum].operate];
                                    // update diff sign if groupName is difference
                                    if (group !== groupName) {
                                        nvim.command("sign place " + constant_1.signPrefix + lnum + " line=" + lnum + " name=" + group + " buffer=" + bufnr);
                                    }
                                    delete lines[lnum];
                                }
                                else {
                                    // delete diff sign if do not exist
                                    nvim.command("sign unplace " + signId + " buffer=" + bufnr);
                                }
                            }
                            else if (!signId.startsWith(constant_1.signPrefix)) {
                                if (!otherSigns[lnum]) {
                                    otherSigns[lnum] = [];
                                }
                                otherSigns[lnum].push({
                                    signId: signId,
                                    groupName: groupName
                                });
                            }
                        }
                        _loop_1 = function (lnum) {
                            var sign = constant_1.signGroups[lines[lnum].operate];
                            nvim.command("sign place " + constant_1.signPrefix + lnum + " line=" + lnum + " name=" + sign + " buffer=" + bufnr);
                            // if line lnum have other sign,
                            // upate it so it will cover on diff sign
                            if (otherSigns[lnum]) {
                                otherSigns[lnum].forEach(function (_a) {
                                    var signId = _a.signId, groupName = _a.groupName;
                                    nvim.command("sign place " + signId + " line=" + lnum + " name=" + groupName + " buffer=" + bufnr);
                                });
                            }
                        };
                        // place new diff sign
                        for (lnum in lines) {
                            _loop_1(lnum);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    App.prototype.getBufferInfo = function (bufnr) {
        var _this = this;
        return new Promise(function (resolve, reject) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var nvim, absFilePath, gitDir, buffer, content;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        nvim = this.plugin.nvim;
                        return [4 /*yield*/, nvim.call('expand', "#" + bufnr + ":p")
                            // file do not exist on disk
                        ];
                    case 1:
                        absFilePath = _a.sent();
                        // file do not exist on disk
                        if (!fs_1.default.existsSync(absFilePath)) {
                            return [2 /*return*/, resolve()];
                        }
                        return [4 /*yield*/, util_1.pcb(findup_1.default, [], false)(absFilePath, '.git')];
                    case 2:
                        gitDir = _a.sent();
                        return [4 /*yield*/, this.getCurrentBuffer(bufnr)];
                    case 3:
                        buffer = _a.sent();
                        return [4 /*yield*/, buffer.getLines()
                            // .git dir do not exist
                        ];
                    case 4:
                        content = _a.sent();
                        // .git dir do not exist
                        if (!gitDir || !fs_1.default.existsSync(path_1.default.join(gitDir, '.git'))) {
                            return [2 /*return*/, resolve()];
                        }
                        resolve({
                            gitDir: gitDir,
                            filePath: path_1.default.relative(gitDir, absFilePath),
                            absFilePath: absFilePath,
                            bufnr: bufnr,
                            content: content.join('\n') + '\n' // end newline
                        });
                        return [2 /*return*/];
                }
            });
        }); });
    };
    App.prototype.getCurrentBuffer = function (bufnr) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var nvim, buffer, buffers;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        nvim = this.plugin.nvim;
                        return [4 /*yield*/, nvim.buffer];
                    case 1:
                        buffer = _a.sent();
                        if (bufnr === buffer.id) {
                            return [2 /*return*/, buffer];
                        }
                        return [4 /*yield*/, nvim.buffers];
                    case 2:
                        buffers = _a.sent();
                        buffers.some(function (buf) {
                            if (buf.id === bufnr) {
                                buffer = buf;
                                return true;
                            }
                            return false;
                        });
                        return [2 /*return*/, buffer];
                }
            });
        });
    };
    App.prototype.closeFile = function (file) {
        try {
            file.close();
        }
        catch (error) {
            this.logger.error('Close File Fail: ', error);
        }
    };
    App.prototype.updateDiffFile = function () {
        if (this.fromDiffFile && this.fromDiffFile.writable) {
            this.logger.info('close from file');
            this.closeFile(this.fromDiffFile);
        }
        if (this.toDiffFile && this.toDiffFile.writable) {
            this.logger.info('clsoe to file');
            this.closeFile(this.toDiffFile);
        }
        this.fromDiffFile = fs_1.default.createWriteStream(path_1.default.join(this.tempDir, TEMP_FROM_DIFF_FILE_NAME));
        this.toDiffFile = fs_1.default.createWriteStream(path_1.default.join(this.tempDir, TEMP_TO_DIFF_FILE_NAME));
    };
    App.prototype.updateBlameFile = function () {
        if (this.fromBlameFile) {
            this.closeFile(this.fromBlameFile);
        }
        if (this.toBlameFile) {
            this.closeFile(this.toBlameFile);
        }
        this.fromBlameFile = fs_1.default.createWriteStream(path_1.default.join(this.tempDir, TEMP_FROM_BLAME_FILE_NAME));
        this.toBlameFile = fs_1.default.createWriteStream(path_1.default.join(this.tempDir, TEMP_TO_BLAME_FILE_NAME));
    };
    App.prototype.updateDiff = function (bufnr) {
        this.diff$.next(bufnr);
    };
    App.prototype.updateBlame = function (bufnr) {
        this.blame$.next(bufnr);
    };
    App.prototype.destroy = function () {
        this.blameSubscription.unsubscribe();
        this.diffSubscription.unsubscribe();
    };
    return App;
}());
exports.default = App;
