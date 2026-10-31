import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import deploymentApp,{createDeploymentApp} from '../index.js';
async function request(app,path) {
 const server=createServer(app);
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{return await fetch(`http://127.0.0.1:${server.address().port}${path}`).then(async response=>({status:response.status,body:await response.json()}));}
 finally{await new Promise(resolve=>server.close(resolve));}
}
test('deployment exports an app without connecting at import time',()=>assert.equal(typeof deploymentApp,'function'));
test('service root responds even if the database is unavailable',async()=>{
 const result=await request(createDeploymentApp(()=>{throw new Error('Unavailable');}),'/');
 assert.equal(result.status,200);assert.equal(result.body.service,'BookNook API');
});
test('initialization failures return sanitized JSON rather than crashing the function',async()=>{
 const error=new Error('private connection details');error.name='TestConnectionError';
 const result=await request(createDeploymentApp(async()=>{throw error;}),'/books');
 assert.equal(result.status,503);assert.equal(JSON.stringify(result.body).includes('private connection details'),false);
});
test('readiness waits for initialization and book requests reach the API',async()=>{
 let initialized=0;
 const app=createDeploymentApp(async()=>{initialized++;return {app:(_req,res)=>res.json([{title:'A real book'}])};});
 assert.deepEqual(await request(app,'/health'),{status:200,body:{status:'ready'}});
 assert.deepEqual(await request(app,'/books'),{status:200,body:[{title:'A real book'}]});
 assert.equal(initialized,2);
});
