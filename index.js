const fs = require('fs')

const content = fs.readFileSync('./text.diff').toString()

console.log(parseDiff(content))

function parseDiff (diffStr) {
  const lines = diffStr.split('\n').slice(4)
  return lines.reduce((diff, next) => {
    if (!next.startsWith('@@')) {
      return diff
    }

    let info = next.split('@@', 2)[1]
    if (!info) {
      return diff
    }

    const [deletes, adds] = info
      .trim()
      .split(' ')
      .map(str => str.slice(1).split(','))

    if (deletes[1] !== '0') {
      diff = recordLineNum(
        diff,
        parseInt(deletes[0]), parseInt(`${deletes[1] || 1}`),
        false
      )
    }

    if (adds[1] !== '0') {
      diff = recordLineNum(
        diff,
        parseInt(adds[0]), parseInt(`${adds[1] || 1}`),
        true
      )
    }
    return diff
  }, {})
}

function recordLineNum (diff, startLine, len, isAdd) {
  for (let index = 0; index < len; index++) {
    const lineNum = startLine + index
    if (diff[lineNum] === !isAdd) {
      diff[lineNum] = '~'
    } else {
      diff[lineNum] = isAdd
    }
  }
  return diff
}
