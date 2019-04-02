" close floating window by id
function! gitp#close_win(id) abort
  let winnr = win_id2win(a:id)
  if winnr > 0
    execute winnr.'wincmd c'
    return 1
  endif
  return 0
endfunction

" map quit
function! gitp#map_quit() abort
  nmap <buffer> q <Plug>(git-p-diff-preview)
endfunction

" get signs by bufnr
function! gitp#get_signs(bufnr) abort
  redir => l:signlines
  execute "silent sign place buffer=" . a:bufnr
  redir END
  return l:signlines
endfunction

" trigger diff and blame info update event
function! gitp#diff_and_blame_update() abort
  if exists('#User#GitPDiffAndBlameUpdate')
    doautocmd User GitPDiffAndBlameUpdate
  endif
endfunction
