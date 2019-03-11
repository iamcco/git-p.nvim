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
var TEMP_TO_BLAME_FILE_NAME = 'git-p-blame.tmp';
var NOTIFY_DIFF = 'git-p-diff';
var NOTIFY_DIFF_PREVIEW = 'git-p-diff-preview';
var NOTIFY_CLEAR_BLAME = 'git-p-clear-blame';
var NOTIFY_CLOSE_DIFF_PREVIEW = 'git-p-close-diff-preview';
var REQUEST_BLAME = 'git-p-r-blame';
var App = /** @class */ (function () {
    function App(plugin) {
        this.plugin = plugin;
        this.diff$ = new rxjs_1.Subject();
        // save blame line number of each buffer
        this.blames = {};
        // save diff info of each buffer
        this.diffs = {};
        this.init();
    }
    App.prototype.init = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, nvim, util, _b, hasVirtualText, _c, bufnr;
            var _this = this;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = this.plugin, nvim = _a.nvim, util = _a.util;
                        this.logger = util.getLogger('GIT-P:App');
                        _b = this;
                        return [4 /*yield*/, util_1.pcb(fs_1.default.mkdtemp)(path_1.default.join(os_1.default.tmpdir(), 'git-p'), 'utf-8')
                            // if support virtual text
                        ];
                    case 1:
                        _b.tempDir = _d.sent();
                        return [4 /*yield*/, nvim.call('exists', '*nvim_buf_set_virtual_text')];
                    case 2:
                        hasVirtualText = _d.sent();
                        if (!(hasVirtualText === 1)) return [3 /*break*/, 4];
                        _c = this;
                        return [4 /*yield*/, nvim.call('nvim_create_namespace', 'git-p-virtual-text')];
                    case 3:
                        _c.virtualId = _d.sent();
                        _d.label = 4;
                    case 4:
                        // subscribe diff
                        this.diffSubscription = this.startSubscribeDiff();
                        return [4 /*yield*/, nvim.call('bufnr', '%')];
                    case 5:
                        bufnr = _d.sent();
                        this.diff$.next(bufnr);
                        // listen notification
                        this.plugin.nvim.on('notification', function (method, args) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var bufnr;
                            return tslib_1.__generator(this, function (_a) {
                                bufnr = args[0];
                                if (bufnr === -1 || bufnr === undefined) {
                                    return [2 /*return*/];
                                }
                                switch (method) {
                                    case NOTIFY_DIFF:
                                        this.diff$.next(bufnr);
                                        break;
                                    case NOTIFY_DIFF_PREVIEW:
                                        this.showDiffPreview(bufnr, args[1]);
                                        break;
                                    case NOTIFY_CLEAR_BLAME:
                                        this.clearBlameLine(bufnr, args[1]);
                                        break;
                                    case NOTIFY_CLOSE_DIFF_PREVIEW:
                                        this.closeDiffPreview();
                                        break;
                                    default:
                                        break;
                                }
                                return [2 /*return*/];
                            });
                        }); });
                        this.plugin.nvim.on('request', function (method, args, res) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                            var bufnr;
                            return tslib_1.__generator(this, function (_a) {
                                bufnr = args[0];
                                if (bufnr === -1 || bufnr === undefined) {
                                    return [2 /*return*/];
                                }
                                switch (method) {
                                    case REQUEST_BLAME:
                                        res.send(args);
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
    App.prototype.startSubscribeDiff = function () {
        var _this = this;
        return this.diff$.pipe(operators_1.switchMap(function (bufnr) { return rxjs_1.timer(constant_1.delayGap).pipe(operators_1.switchMap(function () { return rxjs_1.from(_this.getBufferInfo(bufnr)); }), operators_1.filter(function (bufInfo) { return bufInfo !== undefined; }), operators_1.switchMap(function (bufInfo) {
            _this.createDiffTmpFiles();
            return rxjs_1.from(util_1.gitDiff({
                bufferInfo: bufInfo,
                fromFile: _this.fromDiffFile,
                toFile: _this.toDiffFile,
                logger: _this.logger
            })).pipe(operators_1.map(function (res) { return ({
                bufInfo: bufInfo,
                blame: res.blame,
                diff: res.diff,
            }); }), operators_1.catchError(function (error) {
                _this.logger.info('Current Buffer Info: ', {
                    bufnr: bufInfo.bufnr,
                    gitDir: bufInfo.gitDir,
                    filePath: bufInfo.filePath,
                    currentLine: bufInfo.currentLine,
                });
                _this.logger.error('Diff Error: ', error.message);
                return rxjs_1.of(error);
            }));
        })); }), operators_1.mergeMap(function (_a) {
            var bufInfo = _a.bufInfo, blame = _a.blame, diff = _a.diff;
            return rxjs_1.from((function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                var error_1;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!bufInfo) {
                                return [2 /*return*/];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 7, , 8]);
                            // save diff
                            this.diffs[bufInfo.bufnr] = diff;
                            // upate diff sign
                            return [4 /*yield*/, this.updateDiffSign(diff, bufInfo.bufnr)
                                // update b:gitp_blame
                            ];
                        case 2:
                            // upate diff sign
                            _a.sent();
                            // update b:gitp_blame
                            return [4 /*yield*/, bufInfo.buffer.setVar('gitp_blame', blame)
                                // update b:gitp_diff_state
                            ];
                        case 3:
                            // update b:gitp_blame
                            _a.sent();
                            // update b:gitp_diff_state
                            return [4 /*yield*/, bufInfo.buffer.setVar('gitp_diff_state', diff.state)
                                // update blame line
                            ];
                        case 4:
                            // update b:gitp_diff_state
                            _a.sent();
                            // update blame line
                            return [4 /*yield*/, this.updateBlameLine(blame, bufInfo)
                                // trigger diff and blame update user event
                            ];
                        case 5:
                            // update blame line
                            _a.sent();
                            // trigger diff and blame update user event
                            return [4 /*yield*/, this.plugin.nvim.call('gitp#diff_and_blame_update')];
                        case 6:
                            // trigger diff and blame update user event
                            _a.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            error_1 = _a.sent();
                            return [2 /*return*/, error_1];
                        case 8: return [2 /*return*/];
                    }
                });
            }); })());
        })).subscribe(function (error) {
            if (error) {
                _this.logger.error('Update Diff Signs Error: ', error);
            }
        });
    };
    /**
     * clear blame virtual text except:
     *
     * 1. do not support virtual
     * 2. do not have virtual set
     * 3. at the same as before
     */
    App.prototype.clearBlameLine = function (bufnr, line) {
        if (this.virtualId === undefined ||
            this.blames[bufnr] === undefined ||
            line === undefined ||
            this.blames[bufnr].line === line) {
            return;
        }
        this.blames[bufnr] = undefined;
        var nvim = this.plugin.nvim;
        nvim.call('nvim_buf_clear_namespace', [bufnr, this.virtualId, 0, -1]);
    };
    App.prototype.updateBlameLine = function (blame, bufInfo) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var nvim, enableVirtualText, bufnr, currentLine, mode, formtLine, blameText;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!blame || this.virtualId === undefined) {
                            return [2 /*return*/];
                        }
                        nvim = this.plugin.nvim;
                        return [4 /*yield*/, nvim.getVar('gitp_blame_virtual_text')];
                    case 1:
                        enableVirtualText = _a.sent();
                        if (enableVirtualText !== 1) {
                            return [2 /*return*/];
                        }
                        bufnr = bufInfo.bufnr, currentLine = bufInfo.currentLine;
                        return [4 /*yield*/, nvim.call('mode')
                            // do not update blame if same line, hash and mode as before
                        ];
                    case 2:
                        mode = _a.sent();
                        // do not update blame if same line, hash and mode as before
                        if (this.blames[bufnr] !== undefined &&
                            this.blames[bufnr].line === currentLine &&
                            this.blames[bufnr].blame.hash === blame.hash &&
                            this.blames[bufnr].mode === mode &&
                            mode !== 'n') {
                            return [2 /*return*/];
                        }
                        // save blame
                        this.blames[bufnr] = {
                            line: currentLine,
                            blame: blame,
                            mode: mode
                        };
                        // clear pre virtual text
                        return [4 /*yield*/, nvim.call('nvim_buf_clear_namespace', [bufnr, this.virtualId, 0, -1])];
                    case 3:
                        // clear pre virtual text
                        _a.sent();
                        return [4 /*yield*/, nvim.getVar('gitp_blmae_format')];
                    case 4:
                        formtLine = _a.sent();
                        blameText = constant_1.blameKeys.reduce(function (res, next) {
                            return res.replace("%{" + next + "}", blame[next]);
                        }, formtLine);
                        // set new virtual text
                        return [4 /*yield*/, nvim.call('nvim_buf_set_virtual_text', [
                                bufnr,
                                this.virtualId,
                                currentLine - 1,
                                [[blameText, 'GitPBlameLine']],
                                {}
                            ])];
                    case 5:
                        // set new virtual text
                        _a.sent();
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
                        lines = tslib_1.__assign({}, (diff.lines || {}));
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
    App.prototype.showDiffPreview = function (bufnr, line) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var nvim, currentLine, currentBufnr, diff, lines, info, diffKey, previewLines, winnr, screenWidth, screenHeight, pos, winTop, col, wincol, winLeft, maxHeight, row, anchor, buffer, eventIgnore, error_2;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.dpWindow !== undefined) {
                            return [2 /*return*/];
                        }
                        nvim = this.plugin.nvim;
                        return [4 /*yield*/, nvim.call('line', '.')];
                    case 1:
                        currentLine = _a.sent();
                        if (line !== currentLine) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, nvim.call('bufnr', '%')];
                    case 2:
                        currentBufnr = _a.sent();
                        if (bufnr !== currentBufnr) {
                            return [2 /*return*/];
                        }
                        diff = this.diffs[bufnr];
                        if (!diff) {
                            return [2 /*return*/];
                        }
                        lines = diff.lines, info = diff.info;
                        if (!lines[line]) {
                            return [2 /*return*/];
                        }
                        diffKey = lines[line].diffKey;
                        previewLines = info[diffKey];
                        return [4 /*yield*/, nvim.call('winnr')];
                    case 3:
                        winnr = _a.sent();
                        return [4 /*yield*/, nvim.getOption('columns')];
                    case 4:
                        screenWidth = _a.sent();
                        return [4 /*yield*/, nvim.getOption('lines')];
                    case 5:
                        screenHeight = _a.sent();
                        return [4 /*yield*/, nvim.call('win_screenpos', winnr)];
                    case 6:
                        pos = _a.sent();
                        return [4 /*yield*/, nvim.call('winline')];
                    case 7:
                        winTop = _a.sent();
                        return [4 /*yield*/, nvim.call('col', '.')];
                    case 8:
                        col = _a.sent();
                        return [4 /*yield*/, nvim.call('wincol')];
                    case 9:
                        wincol = _a.sent();
                        winLeft = wincol - col - 2;
                        maxHeight = screenHeight - pos[0] - winTop;
                        row = screenHeight - maxHeight - 1;
                        anchor = 'NW';
                        if (previewLines.length > maxHeight && maxHeight / screenHeight < 0.5) {
                            maxHeight = screenHeight - maxHeight - 2;
                            anchor = 'SW';
                            row -= 1;
                        }
                        return [4 /*yield*/, this.createBuffer()];
                    case 10:
                        buffer = _a.sent();
                        return [4 /*yield*/, nvim.getOption('eventignore')];
                    case 11:
                        eventIgnore = _a.sent();
                        return [4 /*yield*/, nvim.setOption('eventignore', 'all')];
                    case 12:
                        _a.sent();
                        _a.label = 13;
                    case 13:
                        _a.trys.push([13, 16, , 17]);
                        return [4 /*yield*/, this.createWin(buffer.id, screenWidth - pos[1] - winLeft, Math.min(maxHeight, previewLines.length), row, pos[1] + winLeft, anchor)];
                    case 14:
                        _a.sent();
                        return [4 /*yield*/, buffer.replace(previewLines, 0)];
                    case 15:
                        _a.sent();
                        return [3 /*break*/, 17];
                    case 16:
                        error_2 = _a.sent();
                        this.logger.error('Show Diff Preview Error: ', error_2);
                        return [3 /*break*/, 17];
                    case 17: return [4 /*yield*/, nvim.setOption('eventignore', eventIgnore)];
                    case 18:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    App.prototype.getBufferInfo = function (bufnr) {
        var _this = this;
        return new Promise(function (resolve) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var nvim, absFilePath, gitDir, filePath, buffer, currentLine, content;
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
                        return [4 /*yield*/, util_1.pcb(findup_1.default, [], false)(absFilePath, '.git')
                            // .git dir do not exist
                        ];
                    case 2:
                        gitDir = _a.sent();
                        // .git dir do not exist
                        if (!gitDir || !fs_1.default.existsSync(path_1.default.join(gitDir, '.git'))) {
                            return [2 /*return*/, resolve()];
                        }
                        filePath = path_1.default.relative(gitDir, absFilePath);
                        // ignore if match prefix
                        if (constant_1.ignorePrefix.some(function (prefix) { return filePath.startsWith(prefix); })) {
                            return [2 /*return*/, resolve()];
                        }
                        return [4 /*yield*/, this.getCurrentBuffer(bufnr)];
                    case 3:
                        buffer = _a.sent();
                        return [4 /*yield*/, nvim.call('line', '.')];
                    case 4:
                        currentLine = _a.sent();
                        return [4 /*yield*/, buffer.getLines()];
                    case 5:
                        content = _a.sent();
                        resolve({
                            buffer: buffer,
                            gitDir: gitDir,
                            filePath: filePath,
                            absFilePath: absFilePath,
                            bufnr: bufnr,
                            currentLine: currentLine,
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
    // close tmp write stream and open new write stream
    App.prototype.createDiffTmpFiles = function () {
        if (this.fromDiffFile && this.fromDiffFile.writable) {
            this.closeFile(this.fromDiffFile);
        }
        if (this.toDiffFile && this.toDiffFile.writable) {
            this.closeFile(this.toDiffFile);
        }
        this.fromDiffFile = fs_1.default.createWriteStream(path_1.default.join(this.tempDir, TEMP_FROM_DIFF_FILE_NAME));
        this.toDiffFile = fs_1.default.createWriteStream(path_1.default.join(this.tempDir, TEMP_TO_DIFF_FILE_NAME));
    };
    App.prototype.createBlameTmpFiles = function () {
        if (this.toBlameFile) {
            this.closeFile(this.toBlameFile);
        }
        this.toBlameFile = fs_1.default.createWriteStream(path_1.default.join(this.tempDir, TEMP_TO_BLAME_FILE_NAME));
    };
    App.prototype.destroy = function () {
        this.diffSubscription.unsubscribe();
    };
    App.prototype.closeDiffPreview = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var dpWindow, nvim, isSupportWinClose;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.dpWindow === undefined) {
                            return [2 /*return*/];
                        }
                        dpWindow = this.dpWindow;
                        this.dpWindow = undefined;
                        nvim = this.plugin.nvim;
                        return [4 /*yield*/, nvim.call('exists', '*nvim_win_close')];
                    case 1:
                        isSupportWinClose = _a.sent();
                        if (!isSupportWinClose) return [3 /*break*/, 3];
                        return [4 /*yield*/, nvim.call('nvim_win_close', [dpWindow.id, true])];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, nvim.call('gitp#close_win', dpWindow.id)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    App.prototype.createBuffer = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a, dpBuffer, plugin, nvim, bufnr, buffers;
            var _this = this;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this, dpBuffer = _a.dpBuffer, plugin = _a.plugin;
                        if (dpBuffer) {
                            return [2 /*return*/, dpBuffer];
                        }
                        nvim = plugin.nvim;
                        return [4 /*yield*/, nvim.call('nvim_create_buf', [0, 1])];
                    case 1:
                        bufnr = _b.sent();
                        return [4 /*yield*/, nvim.buffers];
                    case 2:
                        buffers = _b.sent();
                        buffers.some(function (b) {
                            if (bufnr === b.id) {
                                _this.dpBuffer = b;
                                return true;
                            }
                            return false;
                        });
                        return [4 /*yield*/, this.dpBuffer.setOption('buftype', 'nofile')];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, this.dpBuffer.setOption('filetype', 'diff')];
                    case 4:
                        _b.sent();
                        return [2 /*return*/, this.dpBuffer];
                }
            });
        });
    };
    App.prototype.createWin = function (bufnr, width, height, row, col, anchor) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var nvim, winnr_1, windows, error_3;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        nvim = this.plugin.nvim;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 11, , 12]);
                        return [4 /*yield*/, nvim.call('nvim_open_win', [
                                bufnr,
                                false,
                                width,
                                height,
                                {
                                    relative: 'editor',
                                    anchor: anchor,
                                    focusable: false,
                                    row: row,
                                    col: col
                                }
                            ])];
                    case 2:
                        winnr_1 = _a.sent();
                        return [4 /*yield*/, nvim.windows];
                    case 3:
                        windows = _a.sent();
                        windows.some(function (w) {
                            if (w.id === winnr_1) {
                                _this.dpWindow = w;
                                return true;
                            }
                            return false;
                        });
                        return [4 /*yield*/, this.dpWindow.setOption('number', false)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.dpWindow.setOption('relativenumber', false)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.dpWindow.setOption('cursorline', false)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, this.dpWindow.setOption('cursorcolumn', false)];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, this.dpWindow.setOption('conceallevel', 2)];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, this.dpWindow.setOption('signcolumn', 'no')];
                    case 9:
                        _a.sent();
                        return [4 /*yield*/, this.dpWindow.setOption('winhighlight', 'Normal:GitPDiffFloat')];
                    case 10:
                        _a.sent();
                        return [2 /*return*/, this.dpWindow];
                    case 11:
                        error_3 = _a.sent();
                        this.logger.error('Create Window Error: ', error_3);
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    return App;
}());
exports.default = App;
