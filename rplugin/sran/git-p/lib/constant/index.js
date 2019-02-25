"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _a;
// vim sign id prefix
exports.signPrefix = '6000';
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
