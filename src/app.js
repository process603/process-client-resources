const CATEGORIES = [
  { name: 'Housing & Sober Living', icon: '⌂', description: 'Homes & applications' },
  { name: 'Shelters', icon: '⌂', description: 'Shelter & housing access' },
  { name: 'Treatment Programs', icon: '✳', description: 'Substance use treatment across New Hampshire' },
  { name: 'Primary Care, Dental & Vision', icon: '✚', description: 'Doctors, dentists & eye care' },
  { name: 'Therapy & Counseling', icon: '♡', description: 'Find support & arrange intake' },
  { name: 'Benefits & NHEASY', icon: '▤', description: 'Coverage & assistance' },
  { name: 'Phone Assistance', icon: '☎', description: 'Phone applications' },
  { name: 'Medical Transportation', icon: '↗', description: 'Plan ride numbers' },
  { name: 'Health Insurance', icon: '✚', description: 'Your health plan' },
  { name: 'Medication Providers', icon: '✚', description: 'Medication support' },
  { name: 'IDs & Documents', icon: '▣', description: 'Cards & certificates' },
  { name: 'Legal & Court Forms', icon: '§', description: 'Forms & filing steps' },
  { name: 'Employment', icon: '▥', description: 'Jobs & support' },
  { name: 'Recovery Resources', icon: '♡', description: 'Meetings & help' },
  { name: 'Safety & Survivor Support', icon: '◇', description: 'Safety, advocacy & survivor help' },
  { name: 'Food & Financial Assistance', icon: '◒', description: 'Food & daily needs' },
  { name: 'Food Pantries', icon: '◒', description: 'Groceries, meals & hours' }
];
const CATEGORY_GROUPS = [
  {name:'Housing & Basic Needs', categories:['Housing & Sober Living','Shelters','Food Pantries','Food & Financial Assistance']},
  {name:'Health & Treatment', categories:['Primary Care, Dental & Vision','Therapy & Counseling','Treatment Programs','Medication Providers']},
  {name:'Benefits & Access', categories:['Benefits & NHEASY','Health Insurance','Medical Transportation','Phone Assistance']},
  {name:'Documents, Work & Legal', categories:['IDs & Documents','Employment','Legal & Court Forms']},
  {name:'Recovery & Support', categories:['Recovery Resources','Safety & Survivor Support']}
];
function groupedCategories(categories) {
  const groups=CATEGORY_GROUPS.map(group=>({...group,categories:group.categories.map(name=>categories.find(c=>c.name===name)).filter(Boolean)}));
  const known=new Set(CATEGORY_GROUPS.flatMap(group=>group.categories));
  const extra=categories.filter(category=>!known.has(category.name));
  if(extra.length) groups.push({name:'More Resources',categories:extra});
  return groups.filter(group=>group.categories.length);
}
const state = { resources: [], categories: CATEGORIES, category: '', audience: 'All', query: '', showAll:false, referral:{} };
const $ = selector => document.querySelector(selector);

function safeHttpUrl(value) {
  try { const url = new URL(String(value || '').trim()); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
}
function safePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return [3,10,11].includes(digits.length) && (digits.length !== 11 || digits[0] === '1') ? `tel:${digits}` : '';
}
function coordinate(value, minimum, maximum) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}
function normalize(input, allowed = CATEGORIES.map(c => c.name)) {
  if (!input || !allowed.includes(input.category) || !String(input.title || '').trim() || input.active === false) return null;
  const text = key => String(input[key] ?? '').trim();
  const privateLocation = input.mapType === 'Respite';
  return { category:text('category'), title:text('title'), description:text('description'), buttonText:text('buttonText'),
    url:safeHttpUrl(input.url), phone:text('phone'), howTo:text('howTo'), audience:['All','Men','Women'].includes(input.audience)?input.audience:'All',
    featured:input.featured === true, sortOrder:Number(input.sortOrder) || 999, lastVerified:text('lastVerified'), importantNotes:text('importantNotes'),
    servicesOffered:text('servicesOffered') || 'Not verified', agesServed:text('agesServed') || 'Not verified', insurancePlans:text('insurancePlans') || 'Not verified', intakeAccess:text('intakeAccess') || 'Not verified',
    mapType:['Programs','Sober Living','Medication','Doorways','Shelters','Food Pantries','Primary Care','Dental','Therapy','Other'].includes(input.mapType) ? input.mapType : '',
    address:privateLocation ? '' : text('address'), latitude:privateLocation ? null : coordinate(input.latitude,-90,90), longitude:privateLocation ? null : coordinate(input.longitude,-180,180) };
}
function population(item) {
  if (item.audience === 'Men') return 'Male';
  if (item.audience === 'Women') return 'Female';
  const declared = /(?:^|\s)Population: (Male|Female|Both|Not confirmed)\./i.exec(item.importantNotes || '');
  return declared ? declared[1] : 'Both';
}
function populationLabel(item) {
  const value = population(item);
  return value.toLowerCase() === 'not confirmed' ? '' : value;
}
function publicNotes(item) {
  return String(item.importantNotes || '')
    .replace(/(?:^|\s)Population: (?:Male|Female|Both|Not confirmed)\./gi, ' ')
    .replace(/Eligibility is based on the staff tracker; confirm placement and current openings with the provider\./g, '')
    .replace(/Contact the provider to confirm which homes fit your needs\./g, '')
    .replace(/\s+/g, ' ').trim();
}
function matchesPopulation(item, selected) {
  if (!selected || selected === 'All') return true;
  const value = population(item);
  return value === selected || (value === 'Both' && ['Male','Female'].includes(selected));
}
function approximateLocation(item) {
  return /approximate (city|town)/i.test(item.importantNotes || '') || (!!item.address && !/\d/.test(item.address));
}
function stale(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;
  const time = Date.parse(date + 'T12:00:00Z');
  return !Number.isFinite(time) || time > Date.now() + 86400000 || Date.now() - time > 180 * 86400000;
}
function parseFeed(payload) {
  if (!payload || !Array.isArray(payload.resources)) throw new Error('Invalid feed');
  const allowed = categoryList(payload).map(category => category.name);
  const items=payload.resources.map(item => normalize(item, allowed)).filter(Boolean);
  if(typeof document!=='undefined') updateHandoutCatalog(items);
  return items;
}
function categoryList(payload) {
  if (!Array.isArray(payload?.categories)) return CATEGORIES;
  const icons = Object.fromEntries(CATEGORIES.map(category => [category.name, category.icon]));
  const seen = new Set();
  return payload.categories.map(category => ({
    name: String(category?.name || '').trim(), description: String(category?.description || '').trim(), sortOrder: Number(category?.sortOrder) || 999
  })).filter(category => { if (!category.name || seen.has(category.name)) return false; seen.add(category.name); return true; })
    .sort((a,b) => a.sortOrder-b.sortOrder || a.name.localeCompare(b.name))
    .map(category => ({ ...category, icon: icons[category.name] || '↗' }));
}
function node(tag,className,text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function resourceCard(item) {
  const card = node('article','resource-card');
  const top = node('div','card-top');
  top.append(node('span','card-category',item.category));
  const badges = node('span','card-badges');
  if (populationLabel(item) && ['Housing & Sober Living','Treatment Programs','Medication Providers'].includes(item.category)) badges.append(node('span','badge','Serves: ' + populationLabel(item)));
  top.append(badges);
  card.append(top,node('h3','',item.title));
  if (item.address) card.append(node('p','resource-location',item.address));
  card.append(node('p','description',item.description));
  const actions = node('div','card-actions');
  if (item.url) { const link=node('a','action-link',(item.buttonText||'Open resource')+' ↗'); link.href=item.url; link.referrerPolicy='no-referrer'; actions.append(link); }
  else actions.append(node('span','missing-link','Ask your case manager for the link'));
  const phone = safePhone(item.phone);
  if (phone) { const call=node('a','call-link','Call '+item.phone); call.href=phone; actions.append(call); }
  actions.append(handoutButton(item));
  card.append(actions);
  const notes=publicNotes(item);
  if (item.howTo || notes) { const details=node('details','card-detail'); details.append(node('summary','','How do I do this?')); if(item.howTo) details.append(node('p','',item.howTo)); if(notes) details.append(node('p','important',notes)); card.append(details); }
  const referral=node('details','card-detail');referral.append(node('summary','','Referral details'));
  for(const [key,label] of REFERRAL_FIELDS) referral.append(node('p','',label+': '+(item[key]||'Not verified')));
  referral.append(node('p','','Confirm your exact plan, eligibility, and current appointments with the provider.'));
  card.append(referral);
  return card;
}
function sortResources(a,b) {
  const ac=state.categories.findIndex(c=>c.name===a.category), bc=state.categories.findIndex(c=>c.name===b.category);
  return ac-bc || Number(b.featured)-Number(a.featured) || a.sortOrder-b.sortOrder || a.title.localeCompare(b.title);
}
function render() {
  const q=state.query.toLocaleLowerCase();
  const items=state.resources.filter(item => (!state.category || item.category===state.category) && matchesPopulation(item,state.audience) && matchesReferral(item,state.referral) && [item.title,item.description,item.category,item.howTo,publicNotes(item),item.address,...REFERRAL_FIELDS.map(([key])=>item[key])].join(' ').toLocaleLowerCase().includes(q)).sort(sortResources);
  const preview=!state.category&&!state.query&&!state.showAll&&!Object.values(state.referral).some(Boolean);
  const startingCategories=['Housing & Sober Living','Shelters','Food Pantries','Primary Care, Dental & Vision','Therapy & Counseling','Benefits & NHEASY','Treatment Programs','Recovery Resources','Safety & Survivor Support'];
  const displayed=preview?startingCategories.map(category=>items.find(item=>item.category===category)).filter(Boolean):items;
  $('#resource-list').replaceChildren(...displayed.map(resourceCard));
  $('#browse-all').hidden=!preview;
  $('#category-guide').hidden=!['Primary Care, Dental & Vision','Therapy & Counseling'].includes(state.category);
  $('#category-guide').href=state.category==='Primary Care, Dental & Vision'?'./care.html?type=primary-care':'./care.html?type=therapy';
  $('#result-count').textContent=preview?`${displayed.length} starting points · ${items.length} resources available`:`${items.length} resource${items.length===1?'':'s'}`;
  $('#resources-heading').textContent=state.category || (state.query?'Search results':preview?'Useful starting points':'All resources');
  $('#empty-state').hidden=items.length!==0;
  $('#empty-state h3').textContent=state.category&&!state.query?'No listings here yet':'No resources match';
  $('#empty-state p').textContent=state.category&&!state.query?'Ask your case manager for help while this category grows.':'Try another term or return to all topics.';
  for (const button of $('#category-grid').querySelectorAll('button')) button.setAttribute('aria-pressed',String(button.dataset.category===state.category));
  const audience=$('#audience-filters'); audience.replaceChildren();
  if (['Housing & Sober Living','Treatment Programs','Medication Providers'].includes(state.category)) for (const value of ['All','Male','Female','Both']) {
    const button=node('button','',value==='All'?'Everyone':value); button.type='button'; button.setAttribute('aria-pressed',String(value===state.audience)); button.addEventListener('click',()=>{state.audience=value;render();}); audience.append(button);
  }
}
function renderCategoryButtons() {
  const grid=$('#category-grid');
  const openGroups=new Set([...grid.querySelectorAll('details[open]')].map(group=>group.dataset.group));
  grid.replaceChildren();
  const all=node('button','browse-button','Browse all resources'); all.type='button'; all.addEventListener('click',()=>showAllResources()); grid.append(all);
  for(const group of groupedCategories(state.categories)) {
    const section=node('details','topic-section'); section.dataset.group=group.name; section.open=openGroups.has(group.name)||group.categories.some(c=>c.name===state.category);
    const summary=node('summary'); summary.append(node('strong','',group.name),node('small','',group.categories.map(c=>c.name).join(' · ')));
    const topics=node('div','topic-grid'); section.append(summary,topics); grid.append(section);
    for(const category of group.categories) {
      const button=node('button','topic'); button.type='button'; button.dataset.category=category.name;
      const icon=node('span','topic-icon',category.icon), bottom=node('span','topic-bottom'), names=node('span');
      names.append(node('strong','',category.name),node('small','',category.description)); bottom.append(names,node('span','topic-arrow','↗')); button.append(icon,bottom);
      button.addEventListener('click',()=>{state.category=state.category===category.name?'':category.name;state.audience='All';state.query='';$('#search').value='';render();$('#resources').scrollIntoView({behavior:'smooth'});}); topics.append(button);
    }
  }
}
function showAllResources() { state.referral={};document.querySelectorAll('#referral-filters select').forEach(select=>select.value='');state.category='';state.audience='All';state.query='';state.showAll=true;$('#search').value='';render();$('#resources').scrollIntoView({behavior:'smooth'}); }
function loadPublicFeed(url, timeoutMs=8000) {
  return new Promise((resolve,reject)=>{
    const callback='__processFeed_'+Math.random().toString(36).slice(2); const script=document.createElement('script'); let finished=false;
    const finish=(error,data)=>{if(finished)return;finished=true;clearTimeout(timer);script.remove();delete window[callback];error?reject(error):resolve(data);};
    const timer=setTimeout(()=>finish(new Error('Feed timeout')),timeoutMs);
    window[callback]=data=>{try{finish(null,{resources:parseFeed(data),categories:categoryList(data)});}catch(error){finish(error);}};
    const feed=new URL(url); if(feed.protocol!=='https:'){finish(new Error('HTTPS required'));return;} feed.searchParams.set('callback',callback); script.src=feed.href; script.async=true; script.referrerPolicy='no-referrer'; script.onerror=()=>finish(new Error('Feed unavailable')); document.head.append(script);
  });
}
async function init() {
  const requested=new URLSearchParams(location.search).get('category'); if(requested) state.category=requested;
  setupReferralFilters(); renderCategoryButtons(); $('#browse-all').addEventListener('click',showAllResources); $('#search').addEventListener('input',event=>{state.query=event.target.value.trim();state.category='';state.audience='All';render();}); $('#show-all').addEventListener('click',showAllResources);
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
  try { const response=await fetch('./resources.json',{cache:'no-store'}); if(!response.ok)throw new Error('Snapshot unavailable'); state.resources=parseFeed({resources:await response.json()}); } catch { state.resources=[]; }
  refreshReferralOptions();render();
  const feedUrl=String(window.PROCESS_RESOURCE_FEED_URL||'').trim(); if(!feedUrl){$('#feed-state').textContent='Preview list · live sheet sync pending';return;}
  let updating=false;
  const refresh=async()=>{ if(updating)return; updating=true; try{const live=await loadPublicFeed(feedUrl);state.resources=live.resources;state.categories=live.categories;refreshReferralOptions();if(state.category&&!state.categories.some(category=>category.name===state.category))state.category='';renderCategoryButtons();$('#feed-state').textContent='Updated from staff resource sheet';render();}catch{$('#feed-state').textContent='Live sheet unavailable · verify saved details with providers';}finally{updating=false;} };
  await refresh(); setInterval(()=>{if(!document.hidden)refresh();},5*60*1000); document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}

export { normalize, safeHttpUrl, safePhone, stale, parseFeed, sortResources, categoryList, loadPublicFeed, population, populationLabel, publicNotes, matchesPopulation, approximateLocation, groupedCategories, resourceCard };

const REFERRAL_FIELDS=[['servicesOffered','Services offered'],['insurancePlans','Insurance plans'],['intakeAccess','Intake access']];
export function referralTokens(value) {return [...new Set(String(value||'Not verified').split(';').map(x=>x.trim()).filter(Boolean))];}
export function matchesReferral(item,filters={}) {return REFERRAL_FIELDS.every(([key])=>!filters[key] || referralTokens(item[key]).some(value=>value.toLowerCase()===filters[key].toLowerCase()));}
function setupReferralFilters() {
  const target=document.querySelector('#referral-filters');
  for(const [key,label] of REFERRAL_FIELDS){const field=node('label','',label);const select=node('select');select.id='filter-'+key;select.dataset.field=key;field.append(select);target.append(field);select.addEventListener('change',()=>{state.referral[key]=select.value;state.showAll=true;render();});}
  document.querySelector('#clear-referral').addEventListener('click',()=>{state.referral={};refreshReferralOptions();render();});
}
function refreshReferralOptions(){
  for(const [key] of REFERRAL_FIELDS){const select=document.querySelector('#filter-'+key);if(!select)continue;const values=[...new Set(state.resources.flatMap(item=>referralTokens(item[key])))].sort();select.replaceChildren();for(const value of ['',...values]){const option=node('option','',value||'Any');option.value=value;select.append(option);}select.value=state.referral[key]||'';if(select.selectedIndex<0){select.value='';delete state.referral[key];}}
}
export function resourceKey(item) {return JSON.stringify([item.category,item.title,item.address||'']);}
const handoutSelection=new Set();
let handoutCatalog=[];
function ensureHandout() {
  if(document.querySelector('#handout-bar'))return;
  try{const saved=JSON.parse(sessionStorage.getItem('process-handout')||'[]');if(Array.isArray(saved))saved.filter(x=>typeof x==='string').forEach(x=>handoutSelection.add(x));}catch{}
  const bar=node('aside','handout-bar');bar.id='handout-bar';bar.setAttribute('aria-label','Your resource handout');
  const count=node('span');count.id='handout-count';count.setAttribute('aria-live','polite');
  const review=node('button','browse-button','Review handout');review.type='button';review.addEventListener('click',openHandout);
  const clear=node('button','browse-button','Clear');clear.type='button';clear.addEventListener('click',()=>{handoutSelection.clear();syncHandout();});bar.append(count,review,clear);document.body.append(bar);
  const dialog=node('dialog','handout-dialog');dialog.id='handout-dialog';dialog.setAttribute('aria-labelledby','handout-title');
  const header=node('div','handout-actions');const title=node('h2','','Your resource handout');title.id='handout-title';
  const close=node('button','browse-button','Close');close.type='button';close.addEventListener('click',()=>dialog.close());
  const print=node('button','browse-button','Print / save PDF');print.id='print-handout';print.type='button';print.addEventListener('click',()=>{document.body.classList.add('handout-print');window.print();});header.append(title,close,print);
  const intro=node('p','','The Process Recovery Center · Resource contacts and next steps. Confirm hours, eligibility, insurance, and availability before visiting.');
  const list=node('div');list.id='handout-items';dialog.append(header,intro,list);document.body.append(dialog);
  window.addEventListener('afterprint',()=>document.body.classList.remove('handout-print'));
  dialog.addEventListener('close',()=>document.body.classList.remove('handout-print'));
}
function updateHandoutCatalog(items){ensureHandout();handoutCatalog=items;syncHandout();}
function syncHandout(){
  try{sessionStorage.setItem('process-handout',JSON.stringify([...handoutSelection]));}catch{}
  const bar=document.querySelector('#handout-bar');if(!bar)return;bar.hidden=!handoutSelection.size;
  document.querySelector('#handout-count').textContent=handoutSelection.size+' selected';
  document.body.classList.toggle('has-handout',handoutSelection.size>0);
  for(const button of document.querySelectorAll('[data-handout-key]')){const selected=handoutSelection.has(button.dataset.handoutKey);button.textContent=selected?'✓ Added to handout':'Add to handout';button.setAttribute('aria-pressed',String(selected));}
  if(document.querySelector('#handout-dialog').open)renderHandout();
}
export function handoutButton(item){
  const button=node('button','handout-add');button.type='button';button.dataset.handoutKey=resourceKey(item);const selected=handoutSelection.has(resourceKey(item));button.textContent=selected?'✓ Added to handout':'Add to handout';button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label','Add or remove '+item.title+' from your handout');button.addEventListener('click',()=>{const key=resourceKey(item);handoutSelection.has(key)?handoutSelection.delete(key):handoutSelection.add(key);syncHandout();});return button;
}
function renderHandout(){
  const list=document.querySelector('#handout-items');list.replaceChildren();
  const items=handoutCatalog.filter(item=>handoutSelection.has(resourceKey(item)));
  const missing=[...handoutSelection].filter(key=>!items.some(item=>resourceKey(item)===key));
  for(const key of missing){const notice=node('p','handout-missing','A selected resource is no longer available in the current list.');const remove=node('button','browse-button','Remove unavailable selection');remove.type='button';remove.addEventListener('click',()=>{handoutSelection.delete(key);syncHandout();});notice.append(remove);list.append(notice);}
  for(const item of items){const article=node('article','handout-item');article.append(node('p','card-category',item.category),node('h3','',item.title));
    for(const text of [item.description,item.address,item.phone?'Phone: '+item.phone:'',item.howTo,publicNotes(item)])if(text)article.append(node('p','',text));
    if(item.url){const link=node('a','',item.url);link.href=item.url;link.referrerPolicy='no-referrer';article.append(link);}
    for(const [key,label] of REFERRAL_FIELDS)if(item[key]&&item[key]!=='Not verified')article.append(node('p','',label+': '+item[key]));
    if(item.lastVerified)article.append(node('p','verified-date','Details checked: '+item.lastVerified));
    const remove=node('button','browse-button handout-remove','Remove');remove.type='button';remove.setAttribute('aria-label','Remove '+item.title);remove.addEventListener('click',()=>{handoutSelection.delete(resourceKey(item));syncHandout();});article.append(remove);list.append(article);
  }
  if(!handoutSelection.size)list.append(node('p','','No resources selected. Close this window and add resources to your handout.'));
  document.querySelector('#print-handout').disabled=!items.length;
}
function openHandout(){renderHandout();document.querySelector('#handout-dialog').showModal();}

if (typeof document !== 'undefined' && document.querySelector('#category-grid')) init();
