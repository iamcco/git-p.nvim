// vim sign id prefix
export const signPrefix: string = '6000'

export const deleteTopSymbol = '-'
export const deleteBottomSymbol = '_'
export const deleteTopAndBottomSymbol = '['
export const addSymbol = '+'
export const modifySymbol = '~'

// sign groups
export const signGroups = {
  [deleteTopSymbol]: 'GitPDeleteTopSign',
  [deleteBottomSymbol]: 'GitPDeleteBottomSign',
  [deleteTopAndBottomSymbol]: 'GitPDeleteTopAndBottomSign',
  [addSymbol]: 'GitPAddSign',
  [modifySymbol]: 'GitPModifySign',
}

// delay before diff
export const delayGap = 200

// files with there prefix will ignore
export const ignorePrefix = ['.git/']

export const second = 1000
export const minute = 60 * second
export const hour = 60 * minute
export const day = 24 * hour
export const year = 365 * day
export const month = 30 * day

export const blameKeys = [
  'hash',
  'account',
  'date',
  'time',
  'ago',
  'zone',
  'lineNum',
  'commit'
]

export const emptyHash = '0000000000000000000000000000000000000000'
