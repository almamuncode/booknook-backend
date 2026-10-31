import {getRuntime} from './runtime.js';
try {
 const {app,client}=await getRuntime();
 const server=app.listen(Number(process.env.PORT || 5000),()=>console.log('BookNook API is ready.'));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(async()=>{await client.close();process.exit(0);});});
}catch(error){console.error(error.name==='ConfigurationError'?error.message:'Could not start the API. Check database connectivity and deployment settings.');process.exitCode=1;}
