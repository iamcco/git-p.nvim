"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _a;
// vim sign id prefix
exports.signPrefix = '6666';
exports.deleteTopSymbol = '-';
exports.deleteBottomSymbol = '_';
exports.deleteTopAndBottomSymbol = '[';
exports.addSymbol = '+';
exports.modifySymbol = '~';
// sign groups
exports.signGroups = (_a = {},
    _a[exports.deleteTopSymbol] = 'GitPDeleteTopSign',
    _a[exports.deleteBottomSymbol] = 'GitPDeleteBottomSign',
    _a[exports.deleteTopAndBottomSymbol] = 'GitPDeleteTopAndBottomSign',
    _a[exports.addSymbol] = 'GitPAddSign',
    _a[exports.modifySymbol] = 'GitPModifySign',
    _a);
// delay before diff
exports.delayGap = 200;
// files with there prefix will ignore
exports.ignorePrefix = ['.git/'];
exports.second = 1000;
exports.minute = 60 * exports.second;
exports.hour = 60 * exports.minute;
exports.day = 24 * exports.hour;
exports.year = 365 * exports.day;
exports.month = 30 * exports.day;
exports.blameKeys = [
    'hash',
    'account',
    'date',
    'time',
    'ago',
    'zone',
    'lineNum',
    'commit'
];
exports.emptyHash = '0000000000000000000000000000000000000000';
exports.maxBuffer = 10000 * 1024;
