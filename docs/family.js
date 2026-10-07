import {parseFeed,loadPublicFeed,resourceCard,familyResource,alphabeticalResources} from './app.js?v=20261007-feed';

export function familySection(item) {
  if(/DCYF information|Legal information|Child safety reporting/i.test(item.servicesOffered||'')) return 'dcyf';
  if(/Family housing|Substance use treatment/i.test(item.servicesOffered||'')) return 'housing';
  return 'parenting';
}
export function familyResources(resources) {return resources.filter(familyResource).sort(alphabeticalResources);}
async function init() {
  const status=document.querySelector('#family-feed-state');
  const render=resources=>{
    const items=familyResources(resources);
    for(const section of ['housing','parenting','dcyf']) {
      const target=document.querySelector('#family-'+section);
      target.replaceChildren(...items.filter(item=>familySection(item)===section).map(resourceCard));
      if(!target.childNodes.length){const p=document.createElement('p');p.textContent='No listings available in this section. Ask your case manager for help.';target.append(p);}
    }
  };
  document.querySelector('#print-family').addEventListener('click',()=>window.print());
  try {const response=await fetch('./resources.json',{cache:'no-store'});if(!response.ok)throw new Error('Snapshot unavailable');render(parseFeed({resources:await response.json()}));status.textContent='Saved resource list';}
  catch {render([]);status.textContent='Resource list unavailable';}
  const url=String(window.PROCESS_RESOURCE_FEED_URL||'').trim();if(!url)return;
  let updating=false;
  const refresh=async()=>{if(updating)return;updating=true;try{const live=await loadPublicFeed(url);render(live.resources);status.textContent='Updated from staff resource sheet';}catch{status.textContent='Live sheet unavailable · verify saved details with providers';}finally{updating=false;}};
  await refresh();setInterval(()=>{if(!document.hidden)refresh();},5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
if(typeof document!=='undefined'&&document.querySelector('#family-main'))init();
