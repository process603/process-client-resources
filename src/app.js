const CATEGORIES = [
  { name: 'Housing & Sober Living', icon: '⌂', description: 'Homes & applications' },
  { name: 'Shelters', icon: '⌂', description: 'Shelter & housing access' },
  { name: 'Treatment Programs', icon: '✳', description: 'Care across New Hampshire' },
  { name: 'Primary Care', icon: '✚', description: 'Find a doctor & get started' },
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
  {name:'Health & Treatment', categories:['Primary Care','Therapy & Counseling','Treatment Programs','Medication Providers']},
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
const state = { resources: [], categories: CATEGORIES, category: '', audience: 'All', query: '', showAll:false };
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
    mapType:['Programs','Sober Living','Medication','Doorways','Shelters','Food Pantries','Primary Care','Therapy','Other'].includes(input.mapType) ? input.mapType : '',
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
  return payload.resources.map(item => normalize(item, allowed)).filter(Boolean);
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
  card.append(actions);
  const notes=publicNotes(item);
  if (item.howTo || notes) { const details=node('details','card-detail'); details.append(node('summary','','How do I do this?')); if(item.howTo) details.append(node('p','',item.howTo)); if(notes) details.append(node('p','important',notes)); card.append(details); }
  return card;
}
function sortResources(a,b) {
  const ac=state.categories.findIndex(c=>c.name===a.category), bc=state.categories.findIndex(c=>c.name===b.category);
  return ac-bc || Number(b.featured)-Number(a.featured) || a.sortOrder-b.sortOrder || a.title.localeCompare(b.title);
}
function render() {
  const q=state.query.toLocaleLowerCase();
  const items=state.resources.filter(item => (!state.category || item.category===state.category) && matchesPopulation(item,state.audience) && [item.title,item.description,item.category,item.howTo,publicNotes(item),item.address].join(' ').toLocaleLowerCase().includes(q)).sort(sortResources);
  const preview=!state.category&&!state.query&&!state.showAll;
  const startingCategories=['Housing & Sober Living','Shelters','Food Pantries','Primary Care','Therapy & Counseling','Benefits & NHEASY','Treatment Programs','Recovery Resources','Safety & Survivor Support'];
  const displayed=preview?startingCategories.map(category=>items.find(item=>item.category===category)).filter(Boolean):items;
  $('#resource-list').replaceChildren(...displayed.map(resourceCard));
  $('#browse-all').hidden=!preview;
  $('#category-guide').hidden=!['Primary Care','Therapy & Counseling'].includes(state.category);
  $('#category-guide').href=state.category==='Primary Care'?'./care.html?type=primary-care':'./care.html?type=therapy';
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
function showAllResources() { state.category='';state.audience='All';state.query='';state.showAll=true;$('#search').value='';render();$('#resources').scrollIntoView({behavior:'smooth'}); }
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
  renderCategoryButtons(); $('#browse-all').addEventListener('click',showAllResources); $('#search').addEventListener('input',event=>{state.query=event.target.value.trim();state.category='';state.audience='All';render();}); $('#show-all').addEventListener('click',showAllResources);
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
  try { const response=await fetch('./resources.json',{cache:'no-store'}); if(!response.ok)throw new Error('Snapshot unavailable'); state.resources=parseFeed({resources:await response.json()}); } catch { state.resources=[]; }
  render();
  const feedUrl=String(window.PROCESS_RESOURCE_FEED_URL||'').trim(); if(!feedUrl){$('#feed-state').textContent='Preview list · live sheet sync pending';return;}
  let updating=false;
  const refresh=async()=>{ if(updating)return; updating=true; try{const live=await loadPublicFeed(feedUrl);state.resources=live.resources;state.categories=live.categories;if(state.category&&!state.categories.some(category=>category.name===state.category))state.category='';renderCategoryButtons();$('#feed-state').textContent='Updated from staff resource sheet';render();}catch{$('#feed-state').textContent='Live sheet unavailable · verify saved details with providers';}finally{updating=false;} };
  await refresh(); setInterval(()=>{if(!document.hidden)refresh();},5*60*1000); document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
if (typeof document !== 'undefined' && document.querySelector('#category-grid')) init();
export { normalize, safeHttpUrl, safePhone, stale, parseFeed, sortResources, categoryList, loadPublicFeed, population, populationLabel, publicNotes, matchesPopulation, approximateLocation, groupedCategories, resourceCard };