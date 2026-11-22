// Deploy: supabase functions deploy send-push
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto oficial).
import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers:cors});
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
 const userClient=createClient(url,anon,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}});
 const {data:{user}}=await userClient.auth.getUser();if(!user)return new Response('Unauthorized',{status:401,headers:cors});
 const {data:profile}=await userClient.from('profiles').select('role,approved').eq('id',user.id).single();
 if(!profile?.approved||!['admin','conselho_administrativo'].includes(profile.role))return new Response('Forbidden',{status:403,headers:cors});
 const {announcement_id}=await req.json();
 const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:notice,error:noticeError}=await service.from('announcements').select('id,title').eq('id',announcement_id).single();
 if(noticeError||!notice)return new Response('Announcement not found',{status:404,headers:cors});
 webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!,Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!);
 const {data:subscriptions,error}=await service.from('push_subscriptions').select('id,subscription,profiles!inner(approved)').eq('profiles.approved',true);
 if(error)return Response.json({error:'Falha ao consultar inscrições'},{status:500,headers:cors});
 let sent=0,failed=0;
 for(const item of subscriptions||[]){try{await webpush.sendNotification(item.subscription,JSON.stringify({title:'Novo comunicado da capela',body:'Abra o app para ler as novidades da comunidade.',tag:notice.id}));sent++;}catch(e){failed++;if([404,410].includes(e.statusCode))await service.from('push_subscriptions').delete().eq('id',item.id)}}
 return Response.json({sent,failed},{headers:cors});
});
