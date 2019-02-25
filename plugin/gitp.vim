"===============================================================================
"File: plugin/git-p.nvim
"Maintainer: iamcco <ooiss@qq.com>
"Github: http://github.com/iamcco <年糕小豆汤>
"Licence: Vim Licence
"===============================================================================

" if exists('g:loaded_git_p')
    " finish
" endif

let g:loaded_git_p= 1

let s:save_cpo = &cpo
set cpo&vim

highlight GitPDeleteHi guifg=#ff0000
highlight GitPAddHi guifg=#00ff00
highlight GitPModifyHi guifg=#0000ff

sign define GitPDeleteTopSign text=▔ texthl=GitPDeleteHi
sign define GitPDeleteBottomSign text=▁ texthl=GitPDeleteHi
sign define GitPDeleteTopAndBottomSign text=[ texthl=GitPDeleteHi
sign define GitPAddSign text=▏ texthl=GitPAddHi
sign define GitPModifySign text=▏ texthl=GitPModifyHi

function! s:init() abort
  augroup GitP
    autocmd!
    autocmd CursorHold,CursorHoldI,TextChanged,TextChangedI * call sran#rpc#notify('git-p-diff', bufnr('%'))
  augroup END
endfunction

autocmd User SranNvimRpcReady call s:init()

let &cpo = s:save_cpo
unlet s:save_cpo
