import test from 'node:test';
import assert from 'node:assert/strict';
import {sortResources,parseFeed} from '../src/app.js';
import {filterLocations,distanceFromProcess} from '../src/map.js';

test('category lists pin owned resources then sort alphabetically regardless of legacy priority',()=>{
  for(const [category,title] of [['Treatment Programs','The Process Recovery Center'],['Housing & Sober Living','Rise Above Sober Living']]){
    const items=[{category,title:'Zebra',featured:true,sortOrder:1},{category,title:'Alpha',featured:false,sortOrder:999},{category,title}];
    assert.deepEqual(items.sort(sortResources).map(x=>x.title),[title,'Alpha','Zebra']);
  }
});
test('distance ordering keeps pins first, respects filters and excludes unmapped resources',()=>{
  const base={category:'Treatment Programs',mapType:'Programs',address:'Public office',latitude:42.761492,longitude:-71.4665541};
  const resources=parseFeed({resources:[{...base,title:'The Process Recovery Center'},{...base,title:'Alpha far',latitude:43.761492},{...base,title:'Zebra near',latitude:42.771492},{...base,title:'Unmapped',latitude:null},{...base,title:'Hidden',active:false}]});
  assert.equal(distanceFromProcess(base),0);
  assert.ok(Math.abs(distanceFromProcess({...base,latitude:43.761492})-69.09)<0.1);
  assert.deepEqual(filterLocations(resources,'Programs','','All','distance').map(x=>x.title),['The Process Recovery Center','Zebra near','Alpha far']);
  assert.deepEqual(filterLocations(resources,'Programs','far','All','distance').map(x=>x.title),['Alpha far']);
  assert.deepEqual(filterLocations(resources,'Programs','').map(x=>x.title),['The Process Recovery Center','Alpha far','Zebra near']);
});
