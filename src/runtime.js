import { MongoClient } from 'mongodb';
import { createApp } from './app.js';
import { createRepository } from './repository.js';
import { createTokenVerifier } from './auth.js';
function required(name) {
 if(process.env[name])return process.env[name];
 const error=new Error(`Configure ${name} before starting the API.`);
 error.name='ConfigurationError';throw error;
}
let runtimePromise;
// Reuse the connection and initialization across warm serverless requests.
// A failed initialization clears the cache so a later request can retry.
export function getRuntime() {
 if(!runtimePromise)runtimePromise=initialize().catch(error=>{runtimePromise=undefined;throw error;});
 return runtimePromise;
}
async function initialize() {
 const uri=required('MONGODB_URI');
 const frontendURL=required('FRONTEND_URL');
 const verifyToken=createTokenVerifier({issuer:required('AUTH_ISSUER'),audience:required('AUTH_AUDIENCE')});
 const client=new MongoClient(uri,{serverSelectionTimeoutMS:10000,maxPoolSize:10});
 try {
  await client.connect();
  const repository=createRepository(client,client.db(process.env.MONGODB_DB || 'booknook'));
  await repository.initialize();
  return {app:createApp({repository,verifyToken,frontendURL}),client};
 }catch(error){await client.close();throw error;}
}
