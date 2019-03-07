"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var child_process_1 = require("child_process");
var constant_1 = require("../constant");
// cover cb type async function to promise
function pcb(cb, codes, isThrowError) {
    if (codes === void 0) { codes = []; }
    if (isThrowError === void 0) { isThrowError = true; }
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return new Promise(function (resolve, reject) {
            cb.apply(void 0, args.concat([function (error) {
                    var args = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        args[_i - 1] = arguments[_i];
                    }
                    if (error) {
                        if (isThrowError && (!codes || codes.indexOf(error.code) === -1)) {
                            return reject(error);
                        }
                    }
                    resolve(args.length < 2 ? args[0] : args);
                }]));
        });
    };
}
exports.pcb = pcb;
// get diff info
function gitDiff(params) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var _this = this;
        return tslib_1.__generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var bufferInfo, fromFile, toFile, indexFile, blame, blameLine, diff, error_1;
                    return tslib_1.__generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                bufferInfo = params.bufferInfo, fromFile = params.fromFile, toFile = params.toFile;
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 8, , 9]);
                                return [4 /*yield*/, pcb(child_process_1.execFile)('git', ['--no-pager', 'show', ":" + bufferInfo.filePath], {
                                        cwd: bufferInfo.gitDir,
                                        maxBuffer: constant_1.maxBuffer
                                    })
                                    // write index file to tmp file
                                ];
                            case 2:
                                indexFile = (_a.sent())[0];
                                // write index file to tmp file
                                return [4 /*yield*/, pcb(fromFile.end.bind(fromFile))(indexFile)
                                    // write buffer content to tmp file
                                ];
                            case 3:
                                // write index file to tmp file
                                _a.sent();
                                // write buffer content to tmp file
                                return [4 /*yield*/, pcb(toFile.end.bind(toFile))(bufferInfo.content)];
                            case 4:
                                // write buffer content to tmp file
                                _a.sent();
                                return [4 /*yield*/, pcb(child_process_1.execFile)('git', [
                                        '--no-pager',
                                        'blame',
                                        '-l',
                                        '--root',
                                        '-t',
                                        "-L" + bufferInfo.currentLine + "," + bufferInfo.currentLine,
                                        '--contents',
                                        toFile.path,
                                        bufferInfo.filePath
                                    ], {
                                        cwd: bufferInfo.gitDir,
                                        maxBuffer: constant_1.maxBuffer
                                    })];
                            case 5:
                                blame = (_a.sent())[0];
                                return [4 /*yield*/, getBlame(blame, bufferInfo)
                                    // git diff exit with code 1 if there is difference
                                ];
                            case 6:
                                blameLine = _a.sent();
                                return [4 /*yield*/, pcb(child_process_1.execFile, [1])('git', ['--no-pager', 'diff', '-p', '-U0', '--no-color', fromFile.path, toFile.path], {
                                        cwd: bufferInfo.gitDir,
                                        maxBuffer: constant_1.maxBuffer
                                    })];
                            case 7:
                                diff = (_a.sent())[0];
                                resolve({
                                    blame: blameLine,
                                    diff: parseDiff(diff),
                                });
                                return [3 /*break*/, 9];
                            case 8:
                                error_1 = _a.sent();
                                reject(error_1);
                                return [3 /*break*/, 9];
                            case 9: return [2 /*return*/];
                        }
                    });
                }); })];
        });
    });
}
exports.gitDiff = gitDiff;
function getCommit(hash, cwd) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var commit;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (hash === constant_1.emptyHash) {
                        return [2 /*return*/, 'Not Committed Yet'];
                    }
                    return [4 /*yield*/, pcb(child_process_1.execFile)('git', [
                            '--no-pager',
                            'log',
                            '--oneline',
                            '-n1',
                            hash
                        ], {
                            cwd: cwd,
                            maxBuffer: constant_1.maxBuffer
                        })];
                case 1:
                    commit = (_a.sent())[0];
                    return [2 /*return*/, parseCommit(commit.trim())];
            }
        });
    });
}
exports.getCommit = getCommit;
/**
 * commit line:
 *
 * d719e63 (HEAD -> master, origin/master, origin/HEAD) add git blame line support witch virtual text
 */
function parseCommit(line) {
    return line.replace(/^[^ ]+\s+(\([^)]+\)\s?)?/, '');
}
exports.parseCommit = parseCommit;
/**
 * blame lines example:
 *
 * 1135f48e9dc3fd2a04d26bde28b3c6d7e2098653 (iamcco            1551111936 +0800  7) import findup from 'findup';
 * b162af96d412d4dc97e64ea79c299ecd5abaf079 (iamcco            1551097475 +0800  8)
 * 0000000000000000000000000000000000000000 (Not Committed Yet 1551503101 +0800  9) import { pcb, gitDiff } from './util';
 * ...
 */
function parseBlame(line) {
    var items = line.split('(');
    var hash = items[0].split(' ')[0];
    items = items.slice(1).join('(').split(')');
    var lineString = items[1].trim();
    var infos = items[0].split(' ');
    var lineNum = infos.pop();
    var zone = infos.pop();
    var timestamp = infos.pop();
    var account = infos.join(' ');
    var res = {
        hash: hash,
        account: hash === constant_1.emptyHash ? 'You' : account,
        date: dateFormat(timestamp, 'YYYY/HH/DD'),
        time: dateFormat(timestamp, 'HH:mm:ss'),
        ago: ago(timestamp),
        zone: zone,
        lineNum: lineNum,
        lineString: lineString,
        rawString: line,
    };
    return res;
}
exports.parseBlame = parseBlame;
function getBlame(line, bufInfo) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var blame, _a;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    blame = parseBlame(line);
                    _a = blame;
                    return [4 /*yield*/, getCommit(blame.hash, bufInfo.gitDir)];
                case 1:
                    _a.commit = _b.sent();
                    return [2 /*return*/, blame];
            }
        });
    });
}
exports.getBlame = getBlame;
function align(str) {
    return ("" + str).replace(/^(\d)$/, '0$1');
}
exports.align = align;
function ago(timestamp) {
    var now = Date.now();
    var before = new Date(parseInt(timestamp + "000", 10)).getTime();
    var gap = now - before;
    var years = Math.floor(gap / constant_1.year);
    if (years) {
        return years + " year" + (years > 1 && 's' || '') + " ago";
    }
    var months = Math.floor(gap / constant_1.month);
    if (months) {
        return months + " month" + (months > 1 && 's' || '') + " ago";
    }
    var days = Math.floor(gap / constant_1.day);
    if (days) {
        return days + " day" + (days > 1 && 's' || '') + " ago";
    }
    var hours = Math.floor(gap / constant_1.hour);
    if (hours) {
        return hours + " hour" + (hours > 1 && 's' || '') + " ago";
    }
    var minutes = Math.floor(gap / constant_1.minute);
    if (minutes) {
        return minutes + " minute" + (minutes > 1 && 's' || '') + " ago";
    }
    var seconds = Math.floor(gap / constant_1.second);
    if (seconds) {
        return seconds + " second" + (seconds > 1 && 's' || '') + " ago";
    }
    return 'a moment ago';
}
exports.ago = ago;
function dateFormat(timestamp, format) {
    if (timestamp === undefined) {
        return '';
    }
    var date = new Date(parseInt(timestamp + "000", 10));
    return format.replace(/YYYY/g, "" + date.getFullYear())
        .replace(/MM/g, "" + (date.getMonth() + 1))
        .replace(/DD/g, align(date.getDate()))
        .replace(/HH/g, align(date.getHours()))
        .replace(/hh/g, "" + date.getHours())
        .replace(/mm/g, align(date.getMinutes()))
        .replace(/ss/g, align(date.getSeconds()));
}
exports.dateFormat = dateFormat;
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
function parseDiff(diffStr) {
    // split to lines and delete the first four lines and the last '\n'
    var allLines = diffStr.split('\n').slice(4, -1);
    // diff info
    var diff = {
        info: {},
        lines: {},
        state: {
            delete: 0,
            add: 0,
            modify: 0
        }
    };
    var info = diff.info, lines = diff.lines, state = diff.state;
    // current diff key
    var diffKey;
    for (var _i = 0, allLines_1 = allLines; _i < allLines_1.length; _i++) {
        var line = allLines_1[_i];
        if (!line.startsWith('@@')) {
            if (diffKey && info[diffKey]) {
                info[diffKey].push(line);
            }
            continue;
        }
        var hunkKey = line.split('@@', 2)[1];
        // invalid format line
        if (!hunkKey) {
            continue;
        }
        // Diff key: -xx +yy
        diffKey = hunkKey.trim();
        info[diffKey] = [];
        var _a = diffKey
            .split(/\s+/)
            .map(function (str) { return str.slice(1).split(','); }), pres = _a[0], nows = _a[1];
        var deleteCount = parseInt("" + (pres[1] || 1), 10);
        var addCount = parseInt("" + (nows[1] || 1), 10);
        var lineNum = parseInt(nows[0], 10);
        state.delete += deleteCount;
        state.add += addCount;
        // delete
        if (nows[1] === '0') {
            lines[nows[0]] = {
                operate: constant_1.deleteBottomSymbol,
                diffKey: diffKey
            };
        }
        else {
            for (var i = 0; i < addCount; i++) {
                // delete and add at the same line
                if (i < deleteCount) {
                    lines[lineNum + i] = {
                        operate: constant_1.modifySymbol,
                        diffKey: diffKey
                    };
                    state.modify += 1;
                }
                else {
                    // add new line
                    lines[lineNum + i] = {
                        operate: constant_1.addSymbol,
                        diffKey: diffKey
                    };
                }
            }
        }
    }
    // update delete and add lines
    state.delete -= state.modify;
    state.add -= state.modify;
    return diff;
}
exports.parseDiff = parseDiff;
