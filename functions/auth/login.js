export async function onRequestGet({request,env}) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.ADMIN_SESSION_SECRET || !env.GITHUB_ADMIN_LOGIN) return new Response("Admin login is not configured.",{status:503});
  if (new URL(request.url).origin !== "https://bakr-sa.pages.dev") return new Response("Use the production admin URL.", {status:403});
  const state=crypto.randomUUID().replaceAll("-","");
  const url=new URL(request.url);
  const redirect=new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id",env.GITHUB_CLIENT_ID);
  redirect.searchParams.set("redirect_uri",url.origin+"/auth/callback");
  redirect.searchParams.set("scope","repo");
  redirect.searchParams.set("state",state);
  return new Response(null,{status:302,headers:{"Location":redirect.toString(),"Set-Cookie":`bakr_oauth_state=${state}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,"Cache-Control":"no-store"}});
}