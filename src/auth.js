import { createRemoteJWKSet, jwtVerify } from 'jose';
import { HttpError } from './errors.js';
export function createTokenVerifier({issuer,audience,jwks}) {
 const keys=jwks || createRemoteJWKSet(new URL('/api/auth/jwks',issuer));
 return async token => {
  const {payload}=await jwtVerify(token,keys,{issuer,audience,algorithms:['EdDSA'],requiredClaims:['sub','exp','iat']});
  if(typeof payload.sub!=='string'||!payload.sub||typeof payload.email!=='string'||typeof payload.name!=='string') throw new Error('Invalid identity claims.');
  return {id:payload.sub,email:payload.email,name:payload.name};
 };
}
export function requireAuth(verifyToken) {
 return async (request,_response,next) => {
  const header=request.get('authorization');
  if(!header || !/^Bearer [^\s]+$/.test(header)) return next(new HttpError(401,'Sign in to continue.'));
  try {request.user=await verifyToken(header.slice(7));next();}catch{next(new HttpError(401,'Your session has expired. Please sign in again.'));}
 };
}
