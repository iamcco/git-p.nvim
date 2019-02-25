import Plugin from 'sran.nvim';

import App from './app';


export default async function(plugin: Plugin) {
  new App(plugin)
}
