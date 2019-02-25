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
