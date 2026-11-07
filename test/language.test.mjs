import test from 'node:test';
import assert from 'node:assert/strict';
import {originalPage,spanishPage} from '../src/language.js';
import {readFileSync} from 'node:fs';

test('language links retain map and guide filters and return to the original domain',()=>{
 const proxy='https://resources-theprocessrecoverycenter-com.translate.goog/map.html?type=Spanish%20%26%20Latino%20Resources&_x_tr_sl=en&_x_tr_tl=es#results';
 const original=new URL(originalPage(proxy));
 assert.equal(original.origin,'https://resources.theprocessrecoverycenter.com');
 assert.equal(original.searchParams.get('type'),'Spanish & Latino Resources');
 assert.equal(original.searchParams.has('_x_tr_tl'),false);
 assert.equal(original.hash,'#results');
 const translated=new URL(spanishPage(proxy));
 assert.equal(translated.hostname,'translate.google.com');
 assert.equal(translated.searchParams.get('tl'),'es');
 assert.equal(translated.searchParams.get('u'),original.href);
});
test('every public page exposes language links without requiring JavaScript',()=>{
 for(const page of ['index','map','care','family']){
  const html=readFileSync(new URL('../src/'+page+'.html',import.meta.url),'utf8');
  assert.match(html,/data-language="en"/);
  assert.match(html,/data-language="es"/);
  assert.match(html,/Español: Google Translate/);
 }
});
