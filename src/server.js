import { MongoClient } from 'mongodb';
import { createApp } from './app.js';
import { createRepository } from './repository.js';
import { createTokenVerifier } from './auth.js';
function required(name) {if(!process.env[name])throw new Error(`Configure ${name} in .env before starting the API.`);return process.env[name];}
const client=new MongoClient(required('MONGODB_URI'),{serverSelectionTimeoutMS:10000});
try {
 await client.connect();const db=client.db(process.env.MONGODB_DB || 'booknook');
 const repository=createRepository(client,db);await repository.initialize();
 const verifyToken=createTokenVerifier({issuer:required('AUTH_ISSUER'),audience:required('AUTH_AUDIENCE')});
 const app=createApp({repository,verifyToken,frontendURL:required('FRONTEND_URL')});
 const server=app.listen(Number(process.env.PORT || 5000),()=>console.log('BookNook API is ready.'));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(async()=>{await client.close();process.exit(0);});});
} catch(error) {console.error(error.name==='MongoServerSelectionError'?'Could not connect to MongoDB. Check the connection and network access.':error.message);await client.close();process.exitCode=1;}
