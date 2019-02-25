import fs from 'fs';
import Plugin from 'sran.nvim';

import { pcb, gitHunk } from './util';

const GET_HUNK = 'git-p-hunk'

export default async function(plugin: Plugin) {
  const tempFile: string = await pcb(fs.mkdtemp)('git-p', 'utf-8')
  const { nvim, util: { getLogger } } = plugin;

  nvim.on('notification', (method: string, ...args: any[]) => {
    switch (method) {
      case GET_HUNK:
        const hunk = gitHunk({
          gitDir: '',
          workDir: '',
          fileName: '',
          buffer: '',
          tempFile,
        })
        break;

      default:
        break;
    }
  })
}
