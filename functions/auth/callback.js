const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
async function encrypt(payload,secret) {
  const key=await crypto.subtle.importKey("raw",await crypto.subtle.digest("SHA-256",enc.encode(secret)),{name:"AES-GCM"},false,["encrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(JSON.stringify(payload))));
  return b64(iv)+"."+b64(cipher);
}
export async function onRequestGet({request,env}) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.ADMIN_SESSION_SECRET || !env.GITHUB_ADMIN_LOGIN) return new Response("Admin login is not configured.",{status:503});
  if (new URL(request.url).origin !== "https://bakr-sa.pages.dev") return new Response("Use the production admin URL.",{status:403});
  const url=new URL(request.url),code=url.searchParams.get("code"),state=url.searchParams.get("state");
  const cookies=Object.fromEntries((request.headers.get("Cookie")||"").split(";").map(s=>s.trim().split("=")));
  if(!code||!state||state!==cookies.bakr_oauth_state)return new Response("Invalid OAuth state.",{status:403});
  const tokenResponse=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:url.origin+"/auth/callback"})});
  const token=await tokenResponse.json();
  if(!token.access_token)return new Response("GitHub login failed.",{status:401});
  const headers={"Authorization":"Bearer "+token.access_token,"Accept":"application/vnd.github+json","User-Agent":"BAKR-Admin"};
  const [userResponse,repoResponse]=await Promise.all([fetch("https://api.github.com/user",{headers}),fetch("https://api.github.com/repos/bakrSa/Bakr",{headers})]);
  if(!userResponse.ok||!repoResponse.ok)return new Response("GitHub access denied.",{status:403});
  const user=await userResponse.json(),repo=await repoResponse.json();
  if(!((String(user.id)==="353833868"&&user.login.toLowerCase()===env.GITHUB_ADMIN_LOGIN.toLowerCase())||(String(user.id)==="354216726"&&user.login.toLowerCase()==="asiri1112"))||!repo.permissions?.push)return new Response("This account is not authorized.",{status:403});
  const session=await encrypt({token:token.access_token,login:user.login,id:String(user.id),exp:Date.now()+8*60*60*1000},env.ADMIN_SESSION_SECRET);
  const response = new Response(null,{status:302,headers:{"Location":"/admin/","Set-Cookie":`bakr_admin=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
  response.headers.append("Set-Cookie","bakr_oauth_state=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return response;
}