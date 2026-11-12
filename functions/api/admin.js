import {validateCatalog} from '../_lib/validation.js';
const enc=new TextEncoder();
const decode=s=>Uint8Array.from(atob(s.replaceAll("-","+").replaceAll("_","/")),c=>c.charCodeAt(0));
async function session(request,env){
 const cookie=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("bakr_admin="));
 if(!cookie||!env.ADMIN_SESSION_SECRET)return null;
 try{
  const [iv,data]=cookie.slice(11).split(".");
  const key=await crypto.subtle.importKey("raw",await crypto.subtle.digest("SHA-256",enc.encode(env.ADMIN_SESSION_SECRET)),{name:"AES-GCM"},false,["decrypt"]);
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(iv)},key,decode(data));
  const obj=JSON.parse(new TextDecoder().decode(plain));
  if(!((obj.id==="353833868"&&obj.login.toLowerCase()===env.GITHUB_ADMIN_LOGIN.toLowerCase())||(obj.id==="354216726"&&obj.login.toLowerCase()==="asiri1112"))||!Number.isFinite(obj.exp)||obj.exp<=Date.now()||typeof obj.token!=="string")return null;
  const access=await fetch('https://api.github.com/repos/bakrSa/Bakr',{headers:githubHeaders(obj.token)});
  if(!access.ok||!(await access.json()).permissions?.push)return null;
  return obj;
 }catch{return null}
}
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const path="assets/catalog.json",api="https://api.github.com/repos/bakrSa/Bakr/contents/"+path;
function githubHeaders(token){return {"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json","User-Agent":"BAKR-Admin"}}
export async function onRequestGet({request,env}){
 const s=await session(request,env);if(!s)return json({error:"Login required"},401);
 if(new URL(request.url).searchParams.has('media')){
  const r=await fetch('https://api.github.com/repos/bakrSa/Bakr/contents/assets/uploads?ref=main',{headers:githubHeaders(s.token)});
  if(r.status===404)return json({images:[]});if(!r.ok)return json({error:'Unable to load images'},r.status);
  const files=await r.json();return json({images:files.filter(f=>f.type==='file').map(f=>({name:f.name,path:'/'+f.path}))});
 }
 const r=await fetch(api+"?ref=main",{headers:githubHeaders(s.token)});
 if(!r.ok)return json({error:"Unable to load catalog"},r.status);
 const f=await r.json();
 const bytes=Uint8Array.from(atob(f.content.replace(/\s/g,"")),c=>c.charCodeAt(0));
 return json({login:s.login,sha:f.sha,catalog:JSON.parse(new TextDecoder().decode(bytes))});
}
export async function onRequestPost({request,env}){
 const s=await session(request,env);if(!s)return json({error:"Login required"},401);
 if(request.headers.get("Origin")!==new URL(request.url).origin)return json({error:"Invalid origin"},403);
 if(Number(request.headers.get("Content-Length")||0)>2000000)return json({error:"Payload too large"},413);
 let body;try{const raw=await request.text();if(enc.encode(raw).length>2000000)return json({error:"Payload too large"},413);body=JSON.parse(raw)}catch{return json({error:"Invalid JSON"},400)}
 if(body?.action==='upload'){
  if(typeof body.content!=='string'||body.content.length>1400000||!/^image\/(png|jpeg|webp)$/.test(body.type))return json({error:'Use PNG, JPEG or WebP up to 1 MB'},400);
  let bytes;try{bytes=decode(body.content)}catch{return json({error:'Invalid image'},400)}
  const magic=Array.from(bytes.slice(0,12));
  const valid=body.type==='image/png'?magic.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':body.type==='image/jpeg'?magic[0]===255&&magic[1]===216&&magic[2]===255:String.fromCharCode(...magic.slice(0,4))==='RIFF'&&String.fromCharCode(...magic.slice(8,12))==='WEBP';
  if(!valid||bytes.length>1048576)return json({error:'Invalid image format or size'},400);
  const path='assets/uploads/'+crypto.randomUUID()+'.'+({ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[body.type]);
  const r=await fetch('https://api.github.com/repos/bakrSa/Bakr/contents/'+path,{method:'PUT',headers:{...githubHeaders(s.token),'Content-Type':'application/json'},body:JSON.stringify({message:'Upload BAKR documentation image',content:body.content,branch:'main'})});
  if(!r.ok)return json({error:'Image upload failed'},r.status);const result=await r.json();return json({ok:true,path:'/'+path,commit:result.commit.sha});
 }
 if(!body||typeof body.sha!=="string"||!/^[0-9a-f]{40}$/.test(body.sha)||!body.catalog||!Array.isArray(body.catalog.games)||!Array.isArray(body.catalog.guides))return json({error:"Invalid catalog"},400);
 if(body.catalog.games.length>100||body.catalog.guides.length>500)return json({error:"Catalog limit exceeded"},400);
 const validation=validateCatalog(body.catalog);if(validation)return json({error:validation},400);
 const serialized=JSON.stringify(body.catalog,null,2)+"\n";
 if(serialized.length>1500000)return json({error:"Catalog too large"},413);
 const bytes=enc.encode(serialized);
 let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const r=await fetch(api,{method:"PUT",headers:{...githubHeaders(s.token),"Content-Type":"application/json"},body:JSON.stringify({message:"Update BAKR content via admin panel",content:btoa(binary),sha:body.sha,branch:"main"})});
 const result=await r.json();
 if(!r.ok)return json({error:result.message||"GitHub update failed"},r.status);
 return json({ok:true,sha:result.content.sha,commit:result.commit.sha});
}