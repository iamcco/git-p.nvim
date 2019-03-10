"===============================================================================
"File: plugin/git-p.nvim
"Maintainer: iamcco <ooiss@qq.com>
"Github: http://github.com/iamcco <年糕小豆汤>
"Licence: Vim Licence
"===============================================================================

if exists('g:loaded_git_p')
    finish
endif

let g:loaded_git_p= 1

let s:save_cpo = &cpo
set cpo&vim

" format blame line
if !exists('g:gitp_blmae_format')
  let g:gitp_blmae_format = '  %{account} ~ %{ago} / %{commit}'
endif

if !exists('g:gitp_blame_virtual_text')
  let g:gitp_blame_virtual_text = 1
endif

function! s:init() abort
  augroup GitP
    autocmd!
    autocmd FocusGained,CursorHold,CursorHoldI,TextChanged,TextChangedI * call sran#rpc#notify('git-p-diff', bufnr('%'))
    autocmd CursorMoved * call sran#rpc#notify('git-p-clear-blame', bufnr('%'), line('.'))
    autocmd CursorMoved,CursorMovedI * call sran#rpc#notify('git-p-close-diff-preview', bufnr('%'))
  augroup END
  nnoremap <Plug>(git-p-diff-preview) :call sran#rpc#notify('git-p-diff-preview', bufnr('%'), line('.'))<Esc>
endfunction

function! s:sign_define(sign, symbol, default_symbol, hi) abort
  execute 'sign define ' . a:sign . ' text=' . get(g:, a:symbol, a:default_symbol) . ' texthl=' . a:hi
endfunction

" diff sign highlight groups
highlight GitPAddHi    guifg=#b8bb26 ctermfg=40
highlight GitPModifyHi guifg=#83a598 ctermfg=33
highlight GitPDeleteHi guifg=#f3423a ctermfg=196

" actual use groups which user can custom
highlight default link GitPAdd                GitPAddHi
highlight default link GitPModify             GitPModifyHi
highlight default link GitPDeleteTop          GitPDeleteHi
highlight default link GitPDeleteBottom       GitPDeleteHi
highlight default link GitPDeleteTopAndBottom GitPDeleteHi

" diff preview window highlight group
highlight default link GitPDiffFloat Pmenu

" blame line highlight groups
highlight GitPBlameLineHi guifg=#606060 ctermfg=60

highlight default link GitPBlameLine GitPBlameLineHi

call s:sign_define('GitPAddSign',                'gitp_add_sign',                   '▏', 'GitPAdd')
call s:sign_define('GitPModifySign',             'gitp_modify_sign',                '▏', 'GitPModify')
call s:sign_define('GitPDeleteTopSign',          'gitp_delete_top_sign',            '▏', 'GitPDeleteTop')
call s:sign_define('GitPDeleteBottomSign',       'gitp_delete_bottom_sign',         '▏', 'GitPDeleteBottom')
call s:sign_define('GitPDeleteTopAndBottomSign', 'gitp_delete_top_and_bottom_sign', '▏', 'GitPDeleteTopAndBottom')

" start init aster sran server is ready
autocmd User SranNvimRpcReady call s:init()

let &cpo = s:save_cpo
unlet s:save_cpo
