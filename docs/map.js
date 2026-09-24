import { parseFeed, safePhone, loadPublicFeed } from './app.js';

const TYPES = ['All','Programs','Sober Living','Medication','Respite','Other'];
const state = { resources: [], type: 'All', query: '' };
let map = null;
let layer = null;

export function mappable(resources) {
  return resources.filter(item => item.mapType && item.address && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

export function filterLocations(resources, type, query) {
  const term = String(query || '').trim().toLocaleLowerCase();
  return mappable(resources).filter(item =>
    (type === 'All' || item.mapType === type) &&
    [item.title,item.category,item.description,item.address].join(' ').toLocaleLowerCase().includes(term)
  ).sort((a,b) => a.title.localeCompare(b.title));
}

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

function directions(item) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${item.latitude},${item.longitude}`);
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
  addLink(actions,'Directions ↗',directions(item));
  if (item.url) addLink(actions,'Provider website ↗',item.url);
  const phone = safePhone(item.phone);
  if (phone) addLink(actions,'Call '+item.phone,phone);
  article.append(actions);
  return article;
}

function markerFor(item) {
  const pin = item.mapType.toLocaleLowerCase().replace(/[^a-z]+/g,'-');
  const icon = L.divIcon({className:'pin-shell',html:`<span class="resource-pin ${pin}"></span>`,iconSize:[20,20],iconAnchor:[10,10]});
  const marker = L.marker([item.latitude,item.longitude],{icon,title:item.title,alt:item.title});
  const popup = element('div','map-popup');
  popup.append(element('strong','',item.title),element('span','',item.address));
  addLink(popup,'Directions ↗',directions(item));
  marker.bindPopup(popup);
  layer.addLayer(marker);
  return marker;
}

function render() {
  const items = filterLocations(state.resources,state.type,state.query);
  const list = document.querySelector('#map-results');
  const count = document.querySelector('#map-count');
  count.textContent = `${items.length} location${items.length===1?'':'s'} shown`;
  if (layer) layer.clearLayers();
  const bounds=[];
  const cards=items.map(item=>{
    let marker=null;
    if (layer) {marker=markerFor(item);bounds.push([item.latitude,item.longitude]);}
    return card(item,marker);
  });
  if (cards.length) list.replaceChildren(...cards);
  else {
    const empty=element('p','map-empty','No verified map locations match these filters. Try another type or browse the full resource list.');
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
  const filters=document.querySelector('#map-filters');
  for (const type of TYPES) {
    const button=element('button','',type);
    button.type='button';button.dataset.type=type;
    button.addEventListener('click',()=>{state.type=type;render();});
    filters.append(button);
  }
  document.querySelector('#map-search').addEventListener('input',event=>{state.query=event.target.value;render();});
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
