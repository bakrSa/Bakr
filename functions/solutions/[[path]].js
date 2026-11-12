// Newly authored guides share the existing shell; their content remains in GitHub.
export async function onRequestGet({request,env}){
 const url=new URL(request.url);
 const catalogResponse=await env.ASSETS.fetch(new URL('/assets/catalog.json',url));
 if(!catalogResponse.ok)return new Response('Documentation temporarily unavailable',{status:503});
 const catalog=await catalogResponse.json();
 const found=catalog.guides.some(g=>g.route.replace(/\/$/,'')===url.pathname.replace(/\/$/,''));
 const shell=await env.ASSETS.fetch(new URL('/index.html',url));
 return new Response(shell.body,{status:found?200:404,headers:shell.headers});
}
