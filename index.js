import express from 'express';
import {getRuntime} from './src/runtime.js';

// The root entry takes precedence over the internal src/app.js factory in Vercel.
export function createDeploymentApp(loadRuntime=getRuntime) {
 const app=express();app.disable('x-powered-by');
 app.get('/',(_request,response)=>response.json({service:'BookNook API',books:'/books',health:'/health'}));
 app.use(async(request,response,next)=>{
  try {
   const runtime=await loadRuntime();
   if(request.method==='GET'&&request.path==='/health')return response.json({status:'ready'});
   return runtime.app(request,response,next);
  }catch(error){
   console.error('BookNook initialization failed:',error.name==='ConfigurationError'?error.message:error.name);
   response.status(503).json({message:'The library database is unavailable. Please try again shortly.'});
  }
 });
 return app;
}
export default createDeploymentApp();
