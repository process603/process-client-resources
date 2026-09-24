const CATEGORIES = [
  { name: 'Housing & Sober Living', icon: '⌂', description: 'Homes & applications' },
  { name: 'Treatment Programs', icon: '✳', description: 'Care across New Hampshire' },
  { name: 'Benefits & NHEASY', icon: '▤', description: 'Coverage & assistance' },
  { name: 'Phone Assistance', icon: '☎', description: 'Phone applications' },
  { name: 'Medical Transportation', icon: '↗', description: 'Plan ride numbers' },
  { name: 'Health Insurance', icon: '✚', description: 'Your health plan' },
  { name: 'Medication Providers', icon: '✚', description: 'Medication support' },
  { name: 'IDs & Documents', icon: '▣', description: 'Cards & certificates' },
  { name: 'Legal & Court Forms', icon: '§', description: 'Forms & filing steps' },
  { name: 'Employment', icon: '▥', description: 'Jobs & support' },
  { name: 'Recovery Resources', icon: '♡', description: 'Meetings & help' },
  { name: 'Food & Financial Assistance', icon: '◒', description: 'Food & daily needs' }
];
const state = { resources: [], categories: CATEGORIES, category: '', audience: 'All', query: '' };
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
  return { category:text('category'), title:text('title'), description:text('description'), buttonText:text('buttonText'),
    url:safeHttpUrl(input.url), phone:text('phone'), howTo:text('howTo'), audience:['All','Men','Women'].includes(input.audience)?input.audience:'All',
    featured:input.featured === true, sortOrder:Number(input.sortOrder) || 999, lastVerified:text('lastVerified'), importantNotes:text('importantNotes'),
    mapType:['Programs','Sober Living','Medication','Respite','Other'].includes(input.mapType) ? input.mapType : '',
    address:text('address'), latitude:coordinate(input.latitude,-90,90), longitude:coordinate(input.longitude,-180,180) };
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
    name: String(category?.name || '').trim(),
    description: String(category?.description || '').trim(),
    sortOrder: Number(category?.sortOrder) || 999
  })).filter(category => {
    if (!category.name || seen.has(category.name)) return false;
    seen.add(category.name); return true;
  }).sort((a,b) => a.sortOrder-b.sortOrder || a.name.localeCompare(b.name))
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
  if (item.audience !== 'All') badges.append(node('span','badge',item.audience));
  if (stale(item.lastVerified)) badges.append(node('span','badge review','Check details'));
  top.append(badges);
  card.append(top,node('h3','',item.title),node('p','description',item.description));
  const actions = node('div','card-actions');
  if (item.url) {
    const link = node('a','action-link',(item.buttonText || 'Open resource') + ' ↗');
    link.href = item.url; link.referrerPolicy = 'no-referrer';
    actions.append(link);
  } else actions.append(node('span','missing-link','Ask your case manager for the link'));
  const phone = safePhone(item.phone);
  if (phone) { const call = node('a','call-link','Call ' + item.phone); call.href = phone; actions.append(call); }
  card.append(actions);
  if (item.howTo || item.importantNotes) {
    const details = node('details','card-detail');
    details.append(node('summary','','How do I do this?'));
    if (item.howTo) details.append(node('p','',item.howTo));
    if (item.importantNotes) details.append(node('p','important',item.importantNotes));
    card.append(details);
  }
  if (item.lastVerified) card.append(node('span','card-foot','Checked ' + item.lastVerified));
  return card;
}
function sortResources(a,b) {
  const ac = state.categories.findIndex(c=>c.name===a.category), bc = state.categories.findIndex(c=>c.name===b.category);
  return ac-bc || Number(b.featured)-Number(a.featured) || a.sortOrder-b.sortOrder || a.title.localeCompare(b.title);
}
function render() {
  const q = state.query.toLocaleLowerCase();
  const items = state.resources.filter(item =>
    (!state.category || item.category === state.category) &&
    (state.audience === 'All' || item.category !== 'Housing & Sober Living' || item.audience === 'All' || item.audience === state.audience) &&
    [item.title,item.description,item.category,item.howTo,item.importantNotes].join(' ').toLocaleLowerCase().includes(q)
  ).sort(sortResources);
  $('#resource-list').replaceChildren(...items.map(resourceCard));
  $('#result-count').textContent = `${items.length} resource${items.length === 1?'':'s'}`;
  $('#resources-heading').textContent = state.category || (state.query ? 'Search results' : 'All resources');
  $('#empty-state').hidden = items.length !== 0;
  $('#empty-state h3').textContent = state.category && !state.query ? 'No listings here yet' : 'No resources match';
  $('#empty-state p').textContent = state.category && !state.query ? 'Ask your case manager for help while this category grows.' : 'Try another term or return to all topics.';
  for (const button of $('#category-grid').querySelectorAll('button')) {
    button.setAttribute('aria-pressed',String(button.dataset.category === state.category));
  }
  const audience = $('#audience-filters'); audience.replaceChildren();
  if (state.category === 'Housing & Sober Living') for (const value of ['All','Men','Women']) {
    const button = node('button','',value === 'All'?'All housing':value);
    button.type='button'; button.setAttribute('aria-pressed',String(value===state.audience));
    button.addEventListener('click',()=>{state.audience=value;render();});audience.append(button);
  }
}
function renderCategoryButtons() {
  const grid=$('#category-grid'); grid.replaceChildren();
  for (const category of state.categories) {
    const button=node('button','topic');button.type='button';button.dataset.category=category.name;
    const icon=node('span','topic-icon',category.icon), bottom=node('span','topic-bottom'), names=node('span');
    names.append(node('strong','',category.name),node('small','',category.description));
    bottom.append(names,node('span','topic-arrow','↗'));button.append(icon,bottom);
    button.addEventListener('click',()=>{state.category=state.category===category.name?'':category.name;state.audience='All';state.query='';$('#search').value='';render();$('#resources').scrollIntoView({behavior:'smooth'});});
    grid.append(button);
  }
}
function loadPublicFeed(url, timeoutMs=8000) {
  return new Promise((resolve,reject)=>{
    const callback='__processFeed_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');let finished=false;
    const finish=(error,data)=>{if(finished)return;finished=true;clearTimeout(timer);script.remove();delete window[callback];error?reject(error):resolve(data);};
    const timer=setTimeout(()=>finish(new Error('Feed timeout')),timeoutMs);
    window[callback]=data=>{try{finish(null,{resources:parseFeed(data),categories:categoryList(data)});}catch(error){finish(error);}};
    const feed=new URL(url);if(feed.protocol!=='https:'){finish(new Error('HTTPS required'));return;}
    feed.searchParams.set('callback',callback);
    script.src=feed.href;script.async=true;script.referrerPolicy='no-referrer';script.onerror=()=>finish(new Error('Feed unavailable'));
    document.head.append(script);
  });
}
async function init() {
  renderCategoryButtons();
  $('#search').addEventListener('input',event=>{state.query=event.target.value.trim();state.category='';state.audience='All';render();});
  $('#show-all').addEventListener('click',()=>{state.category='';state.audience='All';state.query='';$('#search').value='';render();$('#search').focus();});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
  try { const response=await fetch('./resources.json',{cache:'no-store'}); if(!response.ok)throw new Error('Snapshot unavailable');state.resources=parseFeed({resources:await response.json()}); }
  catch { state.resources=[]; }
  render();
  const feedUrl=String(window.PROCESS_RESOURCE_FEED_URL||'').trim();
  if (!feedUrl) { $('#feed-state').textContent='Preview list · live sheet sync pending'; return; }
  let updating=false;
  const refresh=async()=>{
    if (updating) return;
    updating=true;
    try {
      const live=await loadPublicFeed(feedUrl);
      state.resources=live.resources;
      state.categories=live.categories;
      if (state.category && !state.categories.some(category=>category.name===state.category)) state.category='';
      renderCategoryButtons();
      $('#feed-state').textContent='Updated from staff resource sheet';
      render();
    } catch { $('#feed-state').textContent='Live sheet unavailable · verify saved details with providers'; }
    finally { updating=false; }
  };
  await refresh();
  setInterval(()=>{ if (!document.hidden) refresh(); },5*60*1000);
  document.addEventListener('visibilitychange',()=>{ if (!document.hidden) refresh(); });
}
if (typeof document !== 'undefined' && document.querySelector('#category-grid')) init();
export { normalize, safeHttpUrl, safePhone, stale, parseFeed, sortResources, categoryList, loadPublicFeed };
