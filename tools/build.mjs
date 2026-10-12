import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(process.env.GYM_BUILD_MODULES ? path.join(process.env.GYM_BUILD_MODULES,'../package.json') : path.join(root,'package.json'));
const {build}=require('esbuild');
await build({entryPoints:[path.join(root,'frontend/src/main.tsx')],bundle:true,external:['/backgrounds/*','/fonts/*'],minify:true,splitting:true,format:'esm',outdir:path.join(root,'public_html/assets'),entryNames:'app',chunkNames:'chunks/[name]-[hash]',jsx:'automatic',target:['es2022'],tsconfig:path.join(root,'frontend/tsconfig.json'),define:{'process.env.NODE_ENV':'"production"'},nodePaths:process.env.GYM_BUILD_MODULES?[process.env.GYM_BUILD_MODULES]:[],logLevel:'info'});


