import { gameRequest } from './service.js';
import { ensure } from './game.js';

// build.js embeds the same browser assets served by the local Node server.
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
    if(!url.pathname.startsWith('/api/')){
      const asset=assets[url.pathname];
      if(!Array.isArray(asset))return new Response('Página desconocida',{status:404});
      return new Response(asset[1],{headers:{...headers,'Content-Type':asset[0]+'; charset=utf-8'}});
    }
    try{
      const action=url.pathname.slice(5);
      ensure(request.method===(action==='state'?'GET':'POST'),'Método incorrecto.');
      const reader=request.body?.getReader(),decoder=new TextDecoder();
      let raw='',size=0;
      if(reader){
        for(;;){
          const {done,value}=await reader.read();
          if(done)break;
          size+=value.byteLength;
          if(size>8192){await reader.cancel();throw new Error('Petición demasiado grande.');}
          raw+=decoder.decode(value,{stream:true});
        }
        raw+=decoder.decode();
      }
      const db={
        first:(sql,...args)=>env.DB.prepare(sql).bind(...args).first(),
        run:async(sql,...args)=>(await env.DB.prepare(sql).bind(...args).run()).meta.changes
      };
      const result=await gameRequest(db,action,JSON.parse(raw||'{}'),url.searchParams.get('room')||'',request.headers.get('Authorization')?.replace(/^Bearer /,''));
      return Response.json(result,{headers});
    }catch(err){return Response.json({error:err.message},{status:400,headers});}
  }
};
