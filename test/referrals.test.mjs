import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parseFeed,matchesReferral,resourceKey} from '../src/app.js';
import {careResources,guideFor} from '../src/care.js';

test('renamed healthcare category loads in the care guide and public backup',()=>{
 const resources=parseFeed({resources:JSON.parse(fs.readFileSync(new URL('../src/resources.json',import.meta.url)))});
 const items=careResources(resources,guideFor('primary-care').category);
 assert.ok(items.some(x=>x.title.includes('St. Joseph')));
 assert.ok(resources.some(x=>x.category==='Safety & Survivor Support'));
 assert.ok(resources.some(x=>x.title.includes('Dental Clinic')));
 assert.ok(resources.length>=158);
});
test('referral filters never interpret missing data or a partial plan name as confirmed',()=>{
 const [item]=parseFeed({resources:[{category:'Primary Care, Dental & Vision',title:'Clinic',servicesOffered:'Primary care; Dental',insurancePlans:'WellSense NH Medicaid; Self-pay'}]});
 assert.equal(matchesReferral(item,{servicesOffered:'Dental'}),true);
 assert.equal(matchesReferral(item,{insurancePlans:'Medicaid'}),false);
 assert.equal(matchesReferral(item,{insurancePlans:'WellSense NH Medicaid'}),true);
 assert.equal(matchesReferral(item,{agesServed:'Adults (18+)'}),false);
 assert.equal(matchesReferral(item,{agesServed:'Not verified'}),true);
 assert.equal(matchesReferral(item,{servicesOffered:'Dental',agesServed:'Adults (18+)'}),false);
});
test('handout identities distinguish locations and services while remaining stable on contact edits',()=>{
 const a={title:'Clinic',category:'Therapy & Counseling',address:'1 Main St'};
 assert.notEqual(resourceKey(a),resourceKey({...a,address:'2 Main St'}));
 assert.notEqual(resourceKey(a),resourceKey({...a,category:'Medication Providers'}));
 assert.equal(resourceKey(a),resourceKey({...a,phone:'603-555-0100'}));
});
test('Apps Script publishes only approved referral fields and supports old sheets',()=>{
 const headers=['Category','Resource Name','Description','Button Text','URL','Phone','How-To','Audience','Featured','Active','Sort Order','Last Verified','Important Notes','Staff Notes','Map Type','Address','Latitude','Longitude','Services Offered','Ages Served','Insurance Plans','Intake Access'];
 const row=['Primary Care, Dental & Vision','Clinic','','','https://example.com','','','All',true,true,1,'2026-10-02','','PRIVATE','','','','','Dental','Adults (18+)','Not verified','Call for intake'];
 for(const width of [18,22]){
  const data=[[],headers.slice(0,width),row.slice(0,width)];const context={SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>name==='Resources'?{getDataRange:()=>({getValues:()=>data,getDisplayValues:()=>data.map(r=>r.map(String))})}:{getLastRow:()=>3,getRange:()=>({getValues:()=>[['Primary Care, Dental & Vision','',1,true]]})}})}};
  runInNewContext(fs.readFileSync(new URL('../apps-script/Code.gs',import.meta.url),'utf8'),context);
  const result=context.buildPublicResources_();assert.equal(result.resources.length,1);assert.equal(result.resources[0].servicesOffered,width===22?'Dental':'Not verified');assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
 }
});
