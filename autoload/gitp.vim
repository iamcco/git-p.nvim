" get signs by bufnr
function! gitp#get_signs(bufnr) abort
  redir => l:signlines
  execute "silent sign place buffer=" . a:bufnr
  redir END
  return l:signlines
endfunction
