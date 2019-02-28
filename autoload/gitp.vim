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
