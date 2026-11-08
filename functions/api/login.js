// The former password sessions were incompatible with the GitHub admin panel.
export async function onRequestPost(){return Response.json({error:"Use GitHub sign-in at /admin/"},{status:410,headers:{"Cache-Control":"no-store"}})}
