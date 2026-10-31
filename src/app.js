import express from 'express';
import cors from 'cors';
import { requireAuth } from './auth.js';
import { bookInput, listInput, objectId } from './validation.js';
import { HttpError, errorHandler } from './errors.js';
export function createApp({repository,verifyToken,frontendURL}) {
 const app=express();app.disable('x-powered-by');
 app.use(cors({origin:frontendURL,methods:['GET','POST','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization']}));
 app.use(express.json({limit:'32kb'}));
 const protect=requireAuth(verifyToken);
 app.get('/books',async(req,res,next)=>{
  const input=listInput(req.query);
  if(input.mine)return protect(req,res,async error=>{if(error)return next(error);try{res.json(await repository.listBooks(input,req.user));}catch(failure){next(failure);}});
  res.json(await repository.listBooks(input));
 });
 app.get('/books/:id',protect,async(req,res)=>res.json(await repository.getBook(objectId(req.params.id))));
 app.post('/books',protect,async(req,res)=>res.status(201).json(await repository.addBook(bookInput(req.body),req.user)));
 app.patch('/books/:id',protect,async(req,res)=>res.json(await repository.updateBook(objectId(req.params.id),bookInput(req.body,true),req.user)));
 app.delete('/books/:id',protect,async(req,res)=>res.json(await repository.deleteBook(objectId(req.params.id),req.user)));
 app.post('/borrows',protect,async(req,res)=>res.status(201).json(await repository.borrowBook(objectId(req.body?.bookId),req.user)));
 app.get('/borrows',protect,async(req,res)=>res.json(await repository.listBorrows(req.user)));
 app.delete('/borrows/:id',protect,async(req,res)=>res.json(await repository.returnBook(objectId(req.params.id),req.user)));
 app.use((_req,_res,next)=>next(new HttpError(404,'API route not found.')));
 app.use(errorHandler);return app;
}
