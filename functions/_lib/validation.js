export const approvedGames=['fortnite','call-of-duty','fivem','arc-raiders','fc-27','overwatch-2','dead-by-daylight','marvel-rivals','rust','apex-legends','hwid-spoofer'];
const slug=s=>typeof s==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(s);
export const safeURL=s=>typeof s==='string'&&!/[\s<>"'`\\\u0000-\u001f]/.test(s)&&(/^(https?:\/\/[^/]+|\/(?!\/)|#)/i.test(s));
export function safeHTML(html){
 if(typeof html!=='string'||html.length>200000)return false;
 const tags=new Set('div span p center a ul ol li strong br img h2 h3 h4 h5 code pre details summary em b i table thead tbody tr td th blockquote hr'.split(' '));
 let rest=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<\/?([a-z][a-z0-9]*)(\s[^<>]*?)?\s*\/?\s*>/gi,(full,tag,attrs='')=>{
  if(!tags.has(tag.toLowerCase()))return '<';
  let invalid=false;
  const tail=attrs.replace(/\s+([a-z-]+)\s*=\s*("[^"]*"|'[^']*')/gi,(_,name,quoted)=>{
   name=name.toLowerCase();const val=quoted.slice(1,-1);
   if(!['href','src','alt','title','target','rel','loading','dir'].includes(name))invalid=true;
   if(['href','src'].includes(name)&&(!safeURL(val)||/&(?:#|colon|Tab|NewLine)/i.test(val)))invalid=true;
   if(name==='target'&&!['_blank','_self'].includes(val))invalid=true;
   return '';
  });
  return invalid||tail.trim()?'<':'';
 });
 return !rest.includes('<');
}
export function validateCatalog(c){
 if(!c||!Array.isArray(c.games)||!Array.isArray(c.guides)||c.games.length!==approvedGames.length||c.guides.length>500)return 'Invalid catalog size';
 const gameSet=new Set(),ids=new Set(),routes=new Set();
 for(const g of c.games){
  if(!g||!approvedGames.includes(g.slug)||gameSet.has(g.slug)||typeof g.name!=='string'||!g.name.trim()||!Array.isArray(g.products)||!g.products.every(p=>typeof p==='string')||!Array.isArray(g.guides)||!Array.isArray(g.note)||g.note.length!==2||!g.note.every(n=>typeof n==='string')||(g.image&&!safeURL(g.image))||(g.glow&&!/^#[a-f0-9]{3,8}$/i.test(g.glow)))return 'Invalid game fields';
  gameSet.add(g.slug);
 }
 for(const g of c.guides){
  if(!g||!slug(g.id)||ids.has(g.id)||!gameSet.has(g.game)||typeof g.name!=='string'||!g.name.trim()||!/^\/solutions\/[a-zA-Z0-9-]+\/$/.test(g.route)||routes.has(g.route)||!Array.isArray(g.sections)||g.sections.length>200)return 'Invalid guide fields';
  ids.add(g.id);routes.add(g.route);const sections=new Set();
  for(const s of g.sections){if(!s||!slug(s.id)||sections.has(s.id)||typeof s.title!=='string'||!safeHTML(s.html))return 'Invalid section or unsafe HTML';sections.add(s.id);}
 }
 for(const g of c.games){if(g.guides.some(id=>!c.guides.some(d=>d.id===id&&d.game===g.slug))||c.guides.some(d=>d.game===g.slug&&!g.guides.includes(d.id)))return 'Guide association mismatch';}
 return null;
}
