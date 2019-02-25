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

let &cpo = s:save_cpo
unlet s:save_cpo
