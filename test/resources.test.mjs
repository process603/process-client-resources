import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { normalize, safeHttpUrl, stale, parseFeed, sortResources, categoryList } from '../src/app.js';
import { mappable, filterLocations } from '../src/map.js';

test('the client parser rejects unsafe links and inactive rows', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpUrl('http://example.com'), '');
  assert.equal(normalize({category:'Employment',title:'Hidden',active:false}), null);
  assert.equal(parseFeed({resources:[{category:'Employment',title:'Jobs',url:'https://www.nhes.nh.gov/job-seekers'}]}).length,1);
  const expanded={categories:[{name:'Child Care',description:'Programs',sortOrder:15}],resources:[{category:'Child Care',title:'New program',url:'https://example.com'}]};
  assert.equal(parseFeed(expanded).length,1);
  assert.equal(categoryList(expanded)[0].name,'Child Care');
});

test('sorting favors featured entries and marks old details', () => {
  const base={category:'Housing & Sober Living',sortOrder:10};
  const [first]=[{...base,featured:false},{...base,featured:true}].sort(sortResources);
  assert.equal(first.featured,true);
  assert.equal(stale(''),true);
  assert.equal(stale('2020-01-01'),true);
  assert.equal(stale(new Date().toISOString().slice(0,10)),false);
});

test('map uses only active resources with complete public locations', () => {
  const resources=parseFeed({resources:[
    {category:'Treatment Programs',title:'Mapped program',active:true,mapType:'Programs',address:'21 Factory St, Nashua, NH',latitude:42.761492,longitude:-71.4665541},
    {category:'Treatment Programs',title:'No coordinates',active:true,mapType:'Programs',address:'Nashua, NH'},
    {category:'Treatment Programs',title:'Hidden',active:false,mapType:'Programs',address:'Nashua, NH',latitude:42.7,longitude:-71.4},
    {category:'Medication Providers',title:'Bad coordinates',active:true,mapType:'Medication',address:'Nashua, NH',latitude:999,longitude:-71.4}
  ]});
  assert.equal(mappable(resources).length,1);
  assert.equal(filterLocations(resources,'Programs','Factory').length,1);
  assert.equal(filterLocations(resources,'Medication','').length,0);
});

test('the public Apps Script output excludes Staff Notes and inactive rows', () => {
  const headers=['Category','Resource Name','Description','Button Text','URL','Phone','How-To','Audience','Featured','Active','Sort Order','Last Verified','Important Notes','Staff Notes','Map Type','Address','Latitude','Longitude'];
  const visible=['Housing & Sober Living','Home','Browse homes','Open','https://example.com','','Choose a home','All',true,true,10,'2026-09-23','','Private staff note','Sober Living','Nashua, NH',42.7,-71.4];
  const hidden=[...visible]; hidden[1]='Hidden'; hidden[9]=false;
  const data=[[],headers,visible,hidden];
  const display=data.map(row=>row.map(String));
  const context={SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>name==='Resources'?{getDataRange:()=>({getValues:()=>data,getDisplayValues:()=>display})}:{getLastRow:()=>4,getRange:()=>({getValues:()=>[['Housing & Sober Living','',10,true],['Phone Assistance','Phone applications',25,true]]})}})}};
  runInNewContext(readFileSync(new URL('../apps-script/Code.gs',import.meta.url),'utf8'),context);
  const result=context.buildPublicResources_();
  assert.equal(result.resources.length,1);
  assert.equal(result.resources[0].title,'Home');
  assert.equal(result.resources[0].mapType,'Sober Living');
  assert.equal(result.categories[1].name,'Phone Assistance');
  assert.equal(JSON.stringify(result).includes('Private staff note'),false);
});
