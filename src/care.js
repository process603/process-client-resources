import {parseFeed,loadPublicFeed,resourceCard,alphabeticalResources} from './app.js?v=20261005-education';

const GUIDES={
  'primary-care':{
    title:'Find a primary care provider',category:'Primary Care, Dental & Vision',mapType:'Primary Care',
    description:'A primary care provider (PCP) is your starting point for routine health care. Choose a practice near the place you plan to live, then arrange a new-patient appointment.',
    steps:[['Choose where to start','Use St. Joseph’s new-patient scheduling, call Harbor Care, or find a health center near your next home. For other practices, use your insurance plan’s provider directory or call the member-services number on your card.'],['Check the fit','Ask whether the practice sees your age group, takes your exact insurance plan, and has new-patient appointments. If you are uninsured, ask about financial assistance or sliding fees.'],['Arrange your first visit','Complete the provider’s intake steps and confirm the date, office address, and transportation. If your insurance plan requires a designated PCP, ask how to select or update one.']],
    script:'Hi, I’m looking for a new primary care provider near [town]. My insurance is [exact plan], or I am currently uninsured. Are you accepting new patients in my age group? What is the next available appointment? What forms or records do I need, and how do I get started?',
    distinction:'Primary care, ongoing therapy, and medication management are different services. Ask which service you are booking and who will handle each part of your care.'
  },
  therapy:{
    title:'Find a therapist',category:'Therapy & Counseling',mapType:'Therapy',
    description:'Start with a counseling practice, a community mental health center, or your insurance plan’s behavioral-health directory. Ask for an intake appointment for ongoing therapy.',
    steps:[['Choose the kind of support','Decide whether you prefer in-person or telehealth appointments and where you will be living. Ask about experience with the concerns you want help with, including recovery if relevant.'],['Check coverage and access','Confirm your exact insurance plan, age eligibility, costs, referral requirements, and wait time. Ask about sliding fees if uninsured. For telehealth, confirm that the provider can see you in the state where you will be located.'],['Complete an intake','Call or follow the practice’s published intake instructions. Ask what happens after the first assessment, how ongoing appointments are arranged, and who to contact while waiting.']],
    script:'Hi, I’m looking for ongoing therapy near [town], or by telehealth. My insurance is [exact plan], or I am currently uninsured. Do you see people in my age group? Are you scheduling new intakes? Do I need a referral, what will it cost, and what should I do next?',
    distinction:'Therapy focuses on counseling and coping skills. Medication management involves a prescribing clinician. A practice may offer both, but they can require separate appointments. A treatment-program intake is not always the same as starting ongoing individual therapy.'
  }
};

export function guideFor(type) { return GUIDES[type] || GUIDES['primary-care']; }
export function careResources(resources,category) {return resources.filter(item=>item.category===category || (category==='Primary Care, Dental & Vision' && item.category==='Primary Care')).sort(alphabeticalResources);}

async function init() {
  const therapy=new URLSearchParams(location.search).get('type')==='therapy';
  const guide=guideFor(therapy?'therapy':'primary-care');
  document.title=guide.title+' | Recovery Resource Hub';
  document.querySelector('#care-title').textContent=guide.title;
  document.querySelector('#care-description').textContent=guide.description;
  document.querySelector(therapy?'#therapy-tab':'#primary-tab').setAttribute('aria-current','page');
  document.querySelector('#call-script').textContent=guide.script;
  document.querySelector('#care-distinction').textContent=guide.distinction;
  document.querySelector('#care-map').href='./map.html?type='+encodeURIComponent(guide.mapType);
  const list=document.querySelector('#care-steps');
  for(const [title,description] of guide.steps){const li=document.createElement('li'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=description;li.append(h,p);list.append(li);}
  document.querySelector('#print-guide').addEventListener('click',()=>window.print());
  let printDetails=[];
  window.addEventListener('beforeprint',()=>{printDetails=[...document.querySelectorAll('details:not([open])')];for(const details of printDetails)details.open=true;});
  window.addEventListener('afterprint',()=>{for(const details of printDetails)details.open=false;printDetails=[];});
  const status=document.querySelector('#care-feed-state');
  const render=resources=>{
    const items=careResources(resources,guide.category);
    const target=document.querySelector('#care-resources');target.replaceChildren(...items.map(resourceCard));
    if(!items.length){const p=document.createElement('p');p.textContent='No listings here yet. Ask your case manager for help finding care.';target.append(p);}
  };
  try{const response=await fetch('./resources.json',{cache:'no-store'});if(!response.ok)throw new Error('Snapshot unavailable');render(parseFeed({resources:await response.json()}));status.textContent='Saved resource list';}
  catch{render([]);status.textContent='Resource list unavailable';}
  const url=String(window.PROCESS_RESOURCE_FEED_URL||'').trim();
  if(!url)return;
  let updating=false;
  const refresh=async()=>{if(updating)return;updating=true;try{const live=await loadPublicFeed(url);render(live.resources);status.textContent='Updated from staff resource sheet';}catch{status.textContent='Live sheet unavailable · verify saved details with providers';}finally{updating=false;}};
  await refresh();setInterval(()=>{if(!document.hidden)refresh();},5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
if(typeof document!=='undefined'&&document.querySelector('#care-main'))init();
