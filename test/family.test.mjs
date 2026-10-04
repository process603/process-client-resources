import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed,matchesCategory} from '../src/app.js';
import {familyResources,familySection} from '../src/family.js';
import {filterLocations} from '../src/map.js';
test('family cross-listing keeps treatment entries in original category without duplication',()=>{
  const items=parseFeed({resources:[{category:'Treatment Programs',title:'Mother program',servicesOffered:'Substance use treatment; Family support',mapType:'Programs',address:'Nashua, NH',latitude:42.76,longitude:-71.46},{category:'Family Support & Reunification',title:'Parent help',servicesOffered:'Parenting support',mapType:'Family Support',address:'Nashua, NH',latitude:42.76,longitude:-71.46},{category:'Treatment Programs',title:'Other treatment'}]});
  assert.equal(familyResources(items).length,2);
  assert.ok(matchesCategory(items[0],'Family Support & Reunification'));
  assert.ok(matchesCategory(items[0],'Treatment Programs'));
  assert.equal(filterLocations(items,'Family Support','').length,2);
  assert.equal(filterLocations(items,'Programs','').length,1);
  assert.equal(familySection(items[0]),'housing');
  assert.equal(familySection({servicesOffered:'DCYF information'}),'dcyf');
});
