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
var NOTIFY_CLEAR_BLAME = 'git-p-clear-blame';
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
                                    case NOTIFY_CLEAR_BLAME:
                                        this.clearBlameLine(bufnr, args[1]);
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
                            _a.trys.push([1, 6, , 7]);
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
                                // update blame line
                            ];
                        case 3:
                            // update b:gitp_blame
                            _a.sent();
                            // update blame line
                            return [4 /*yield*/, this.updateBlameLine(blame, bufInfo)
                                // trigger diff and blame update user event
                            ];
                        case 4:
                            // update blame line
                            _a.sent();
                            // trigger diff and blame update user event
                            return [4 /*yield*/, this.plugin.nvim.call('gitp#diff_and_blame_update')];
                        case 5:
                            // trigger diff and blame update user event
                            _a.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            error_1 = _a.sent();
                            return [2 /*return*/, error_1];
                        case 7: return [2 /*return*/];
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
    return App;
}());
exports.default = App;
