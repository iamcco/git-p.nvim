# git-p.nvim

> it only support vim >= 8.1 and latest neovim

Git plus for (neo)vim

- fast async update
- use virtual text to display line blame (only neovim support)

![image](https://user-images.githubusercontent.com/5492542/53678420-d20b7400-3cf9-11e9-9ac6-18f3b6cbfb6e.png)

## Install

with vim-plug:

```vim
Plug 'iamcco/sran.nvim', { 'do': { -> sran#util#install() } }
Plug 'iamcco/git-p.nvim'
```

## Usage & Config

```vim
" enable virtual text to display blame and only neovim support this
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
let g:gitp_blmae_format = '    %{account} * %{ago}'

" show blame on statusline git-p.nvim will udpate b:gitp_blame variable
" and trigger GitPDiffAndBlameUpdate event when blame update
" so you can use this info to display on statusline
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
```

## TODO

- [ ] will use new sign api when it port to neovim. [8668](https://github.com/neovim/neovim/issues/8668)

### Buy Me A Coffee ☕️

![btc](https://img.shields.io/keybase/btc/iamcco.svg?style=popout-square)

![image](https://user-images.githubusercontent.com/5492542/42771079-962216b0-8958-11e8-81c0-520363ce1059.png)
