# git-p.nvim

> it support neovim with floating window feature

Git plus for (neo)vim

- diff sign fast async update
- use virtual text to display line blame
- show change with float window

[![image](https://user-images.githubusercontent.com/5492542/54088981-bc9fe500-439e-11e9-919b-71ef32ef35be.png)](https://asciinema.org/a/bjwwsMAMXT35v4l5wu7o2X9a6)

## Install

with vim-plug:

```vim
Plug 'iamcco/sran.nvim', { 'do': { -> sran#util#install() } }
Plug 'iamcco/git-p.nvim'
```

## Usage & Config

```vim
" enable virtual text to display blame and neovim support this
" default is: 1
let g:gitp_blame_virtual_text = 1

" use custom highlight for blame virtual text
" change GitPBlameLineHi to your highlight group
highlight link GitPBlameLine GitPBlameLineHi

" format blame virtual text
" hash: commit hash
" account: commit account name
" date: YYYY-MM-DD
" time: HH:mm:ss
" ago: xxx ago
" zone: +xxxx
" commit: commit message
" lineNum: line number
let g:gitp_blame_format = '    %{account} * %{ago}'

" NOTE: use %{hash:8} or %{hash:0:8} to use the first 8 characters

" statusline integrated: b:gitp_blame, b:gitp_diff_state
"
" blame info:
" b:gitp_blame = {
"    hash: string
"    account: string
"    date: string
"    time: string
"    ago: string
"    zone: string
"    lineNum: string
"    lineString: string
"    commit: string
"    rawString: string
" }
"
" diff lines stat:
" b:gitp_diff_state = { delete: number, add: number, modify: number }
"
" will trigger GitPDiffAndBlameUpdate event after these variables updated

" use custom highlight for diff sign
" change the GitPAddHi GitPModifyHi GitPDeleteHi to your highlight group
highlight link GitPAdd                GitPAddHi
highlight link GitPModify             GitPModifyHi
highlight link GitPDeleteTop          GitPDeleteHi
highlight link GitPDeleteBottom       GitPDeleteHi
highlight link GitPDeleteTopAndBottom GitPDeleteHi

" use custom diff sign
let g:gitp_add_sign = '■'
let g:gitp_modify_sign = '▣'
let g:gitp_delete_top_sign = '▤'
let g:gitp_delete_bottom_sign = '▤'
let g:gitp_delete_top_and_bottom_sign = '▤'

" let your sign column background same as line number column
" highlight! link SignColumn LineNr

" use <leader>d to display change
nmap <leader>d <Plug>(git-p-diff-preview)

" show blame line manually if `let g:gitp_blame_virtual_text = 0`
nmap <leader>s <Plug>(git-p-show-blame)

" NOTE: if have diff preview window, it will focus to the diff preview window
" if current window is diff preview window, it will close diff preview window
" or use `q` to quit diff preview window

" use custom highlight for float diff preview window
" change Pmenu to your highlight group
highlight link GitPDiffFloat Pmenu
```

## FAQ

A. Why my diff sign update slow

B. set updatetime to a small number like: `set updatetime=300`

A. I want to see coc's sign if the line have both sign.

B. set `"diagnostic.signOffset": 9999999` in coc-settings.json to let coc's sign get higher priority.

## TODO

- [ ] will use new sign api when it port to neovim. [8668](https://github.com/neovim/neovim/issues/8668)

### Buy Me A Coffee ☕️

![btc](https://img.shields.io/keybase/btc/iamcco.svg?style=popout-square)

![image](https://user-images.githubusercontent.com/5492542/42771079-962216b0-8958-11e8-81c0-520363ce1059.png)
