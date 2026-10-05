import { parseFeed, safePhone, loadPublicFeed, populationLabel, matchesPopulation, approximateLocation, publicNotes, handoutButton, pinnedResource, alphabeticalResources, familyResource } from './app.js?v=20261005-education';

const TYPES = ['All','Programs','Sober Living','Medication','Doorways','Shelters','Food Pantries','Primary Care','Dental','Therapy','Family Support','Other'];
const state = { resources: [], type: 'All', query: '', population: 'All', sort: 'alphabetical' };
const PROCESS_ORIGIN={latitude:42.761492,longitude:-71.4665541};
export function distanceFromProcess(item) {
  if(!Number.isFinite(item.latitude)||!Number.isFinite(item.longitude))return Infinity;
  const rad=x=>x*Math.PI/180;
  const dlat=rad(item.latitude-PROCESS_ORIGIN.latitude),dlon=rad(item.longitude-PROCESS_ORIGIN.longitude);
  const a=Math.sin(dlat/2)**2+Math.cos(rad(PROCESS_ORIGIN.latitude))*Math.cos(rad(item.latitude))*Math.sin(dlon/2)**2;
  return 3958.7613*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
}
let map = null;
let layer = null;

export function mappable(resources) {
  return resources.filter(item => item.mapType && item.address && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

export function filterLocations(resources, type, query, selectedPopulation = 'All', sort = 'alphabetical') {
  const term = String(query || '').trim().toLocaleLowerCase();
  return mappable(resources).filter(item =>
    (type === 'All' || item.mapType === type || (type==='Family Support' && familyResource(item))) &&
    matchesPopulation(item, selectedPopulation) &&
    [item.title,item.category,item.description,item.address].join(' ').toLocaleLowerCase().includes(term)
  ).sort((a,b) => Number(pinnedResource(b))-Number(pinnedResource(a)) ||
    (sort==='distance' ? distanceFromProcess(a)-distanceFromProcess(b) : 0) || alphabeticalResources(a,b));
}

export function groupLocations(items) {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.latitude},${item.longitude}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.values()];
}

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

function directions(item) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(item.address);
}

function locationDetails(parent, item) {
  if (populationLabel(item)) parent.append(element('span','population-badge','Serves: ' + populationLabel(item)));
  if (approximateLocation(item)) {
    parent.append(element('p','approximate-note','Approximate city/town location. Contact the provider for the address before traveling.'));
  } else {
    addLink(parent,'Directions ↗',directions(item));
  }
}

function addLink(parent, text, href) {
  const link = element('a','',text);
  link.href = href;
  link.referrerPolicy = 'no-referrer';
  parent.append(link);
}

function card(item, marker) {
  const article = element('article','map-item');
  article.append(element('span','map-type',item.mapType), element('h2','',item.title));
  if (item.description) article.append(element('p','',item.description));
  const address = element('address','',item.address);
  article.append(address);
  if(state.sort==='distance') article.append(element('p','verified-date',`About ${distanceFromProcess(item).toFixed(1)} straight-line miles from Process${approximateLocation(item)?' · approximate town pin':''}${pinnedResource(item)?' · pinned first':''}`));
  if (item.howTo) article.append(element('p','access-details',item.howTo));
  if (publicNotes(item) && !approximateLocation(item)) article.append(element('p','service-notes',publicNotes(item)));
  if (item.lastVerified) article.append(element('p','verified-date','Details checked: '+item.lastVerified));
  if (populationLabel(item)) article.append(element('span','population-badge','Serves: ' + populationLabel(item)));
  if (approximateLocation(item)) article.append(element('p','approximate-note','Approximate city/town pin — not the property location. Contact the provider for the address.'));
  const actions = element('div','map-item-actions');
  if (marker) {
    const show = element('button','','Show on map');
    show.type = 'button';
    show.addEventListener('click',()=>{
      map.setView([item.latitude,item.longitude],Math.max(map.getZoom(),11));
      marker.openPopup();
      document.querySelector('#resource-map').scrollIntoView({behavior:'smooth',block:'center'});
    });
    actions.append(show);
  }
  if (!approximateLocation(item)) addLink(actions,'Directions ↗',directions(item));
  if (item.url) addLink(actions,'Provider website ↗',item.url);
  const phone = safePhone(item.phone);
  if (phone) addLink(actions,'Call '+item.phone,phone);
  actions.append(handoutButton(item));
  article.append(actions);
  return article;
}

function markerFor(items) {
  const item = items[0];
  const pin = items.every(x=>x.mapType===item.mapType) ? item.mapType.toLocaleLowerCase().replace(/[^a-z]+/g,'-') : 'other';
  const label = items.length > 1 ? `${items.length} resources near ${item.address}` : item.title;
  const icon = L.divIcon({className:'pin-shell',html:`<span class="resource-pin ${pin}${items.length>1?' grouped':''}">${items.length>1?items.length:''}</span>`,iconSize:[28,28],iconAnchor:[14,14]});
  const marker = L.marker([item.latitude,item.longitude],{icon,title:label,alt:label});
  const popup = element('div','map-popup');
  for (const resource of items) {
    const entry = element('section','popup-entry');
    entry.append(element('strong','',resource.title),element('span','',resource.address));
    locationDetails(entry,resource);
    if (resource.howTo) entry.append(element('p','access-details',resource.howTo));
    if (publicNotes(resource) && !approximateLocation(resource)) entry.append(element('p','service-notes',publicNotes(resource)));
    const phone=safePhone(resource.phone);
    if (phone) addLink(entry,'Call '+resource.phone,phone);
    if (resource.url) addLink(entry,'Provider website ↗',resource.url);
    popup.append(entry);
  }
  marker.bindPopup(popup,{maxHeight:320,maxWidth:320});
  layer.addLayer(marker);
  return marker;
}

function render() {
  const items = filterLocations(state.resources,state.type,state.query,state.population,state.sort);
  const list = document.querySelector('#map-results');
  const count = document.querySelector('#map-count');
  count.textContent = `${items.length} location${items.length===1?'':'s'} shown`;
  const context=document.querySelector('#map-context');
  context.replaceChildren();
  if (state.type==='Shelters') {
    context.append(element('p','','Call before traveling: a pin does not mean a bed is available. Some pins mark intake or resource offices; check the access instructions.'));
    addLink(context,'Call 211 for shelter referrals','tel:211');
  } else if (state.type==='Food Pantries') {
    context.append(element('p','','Pantries and meal sites have different schedules and eligibility rules. Hours below are published schedules, not live opening status. Check for holiday or weather changes.'));
    addLink(context,'NH Food Bank: find more food','https://nhfoodbank.org/find-food/food-map/');
    addLink(context,'Mobile pantry schedule','https://nhfoodbank.org/find-food/mobile-food-pantry-schedule/');
  }
  if (['Primary Care','Therapy'].includes(state.type)) {
    context.append(element('p','','These pins show public practices and intake locations, not live appointment availability. Confirm your exact insurance plan, age eligibility, location, and intake requirements before visiting.'));
    addLink(context,'How to arrange care',state.type==='Primary Care'?'./care.html?type=primary-care':'./care.html?type=therapy');
  }
  context.hidden=!context.childNodes.length;
  if(state.type==='Family Support') {
    context.append(element('p','','Family housing, parenting support, and treatment have different eligibility and referral routes. Some pins show a town or public office rather than a residence or visit location. Call before traveling.'));
    addLink(context,'Family support: where to start','./family.html');context.hidden=false;
  }
  document.querySelector('#print-summary').textContent=[state.type==='All'?'All resource locations':state.type,state.query?`Search: ${state.query}`:'',state.population!=='All'?`Population: ${state.population}`:'',state.sort==='distance'?'Closest to Process · approximate straight-line miles from 21 Factory St; town pins are approximate; Process and Rise Above pinned first':'Alphabetical · Process and Rise Above pinned first',`${items.length} locations`].filter(Boolean).join(' · ');
  if (layer) layer.clearLayers();
  const bounds=[];
  const markers = new Map();
  if (layer) for (const group of groupLocations(items)) {
    const marker=markerFor(group);
    bounds.push([group[0].latitude,group[0].longitude]);
    group.forEach(item=>markers.set(item,marker));
  }
  const cards=items.map(item=>card(item,markers.get(item)));
  if (cards.length) list.replaceChildren(...cards);
  else {
    const empty=element('p','map-empty','No locations match these filters. Try another type or population, or browse the full resource list.');
    addLink(empty,'Browse all resources ↗','./');
    list.replaceChildren(empty);
  }
  if (map && bounds.length>1) map.fitBounds(bounds,{padding:[35,35],maxZoom:11});
  else if (map && bounds.length===1) map.setView(bounds[0],10);
  else if (map) map.setView([43.8,-71.6],7);
  document.querySelectorAll('#map-filters button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.type===state.type)));
}

function setupMap() {
  if (!window.L) {document.querySelector('#map-fallback').hidden=false;return;}
  map = L.map('resource-map',{scrollWheelZoom:false}).setView([43.8,-71.6],7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
}

async function init() {
  setupMap();
  const initialType=new URLSearchParams(window.location.search).get('type');
  if (TYPES.includes(initialType)) state.type=initialType;
  if(new URLSearchParams(window.location.search).get('sort')==='distance')state.sort='distance';
  document.querySelector('#map-sort').value=state.sort;
  document.querySelector('#map-sort').addEventListener('change',event=>{state.sort=event.target.value;const url=new URL(window.location.href);if(state.sort==='distance')url.searchParams.set('sort','distance');else url.searchParams.delete('sort');window.history.replaceState(null,'',url);render();});
  document.querySelector('#print-list').addEventListener('click',()=>window.print());
  const filters=document.querySelector('#map-filters');
  for (const type of TYPES) {
    const button=element('button','',type);
    button.type='button';button.dataset.type=type;
    button.addEventListener('click',()=>{state.type=type;const url=new URL(window.location.href);if(type==='All')url.searchParams.delete('type');else url.searchParams.set('type',type);window.history.replaceState(null,'',url);render();});
    filters.append(button);
  }
  document.querySelector('#map-search').addEventListener('input',event=>{state.query=event.target.value;render();});
  document.querySelector('#map-population').addEventListener('change',event=>{state.population=event.target.value;render();});
  try {
    const response=await fetch('./resources.json',{cache:'no-store'});
    if (!response.ok) throw new Error('Saved resources unavailable');
    state.resources=parseFeed({resources:await response.json()});
  } catch {state.resources=[];}
  render();
  const feedUrl=String(window.PROCESS_RESOURCE_FEED_URL||'').trim();
  if (!feedUrl){document.querySelector('#map-feed-state').textContent='Preview locations · live sheet sync pending';return;}
  let updating=false;
  const refresh=async()=>{
    if (updating) return;
    updating=true;
    try {
      const live=await loadPublicFeed(feedUrl);
      state.resources=live.resources;
      document.querySelector('#map-feed-state').textContent='Updated from staff resource sheet';
      render();
    } catch {document.querySelector('#map-feed-state').textContent='Live sheet unavailable · showing saved locations';}
    finally {updating=false;}
  };
  await refresh();
  setInterval(()=>{if(!document.hidden)refresh();},5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}

if (typeof document !== 'undefined' && document.querySelector('#resource-map')) {
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, {once:true});
}
