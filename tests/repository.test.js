import test from 'node:test';
import assert from 'node:assert/strict';
import {ObjectId} from 'mongodb';
import {createRepository} from '../src/repository.js';
const bookId='123456789012345678901234';
const user={id:'reader-id',name:'Reader',email:'reader@example.com'};
function fixture(books,borrows) {
 const session={withTransaction:async work=>work(),endSession:async()=>{}};
 const repo=createRepository({startSession:()=>session},{collection:name=>name==='books'?books:borrows});
 return {repo,session};
}
test('another reader cannot edit a book',async()=>{
 let updated=false;const {repo}=fixture({findOne:async()=>({ownerId:'other'}),findOneAndUpdate:async()=>{updated=true;}},{});
 await assert.rejects(()=>repo.updateBook(bookId,{title:'Changed'},user),error=>error.status===403);assert.equal(updated,false);
});
test('total copies cannot fall below active borrows',async()=>{
 const {repo}=fixture({findOne:async()=>({ownerId:user.id,totalCopies:5,availableCopies:1})},{});
 await assert.rejects(()=>repo.updateBook(bookId,{totalCopies:3},user),error=>error.status===409);
});
test('out-of-stock borrowing never inserts a borrow',async()=>{
 let inserted=false;let condition;const {repo}=fixture({findOneAndUpdate:async filter=>{condition=filter;return null;},findOne:async()=>({_id:new ObjectId(bookId),availableCopies:0})},{findOne:async()=>null,insertOne:async()=>{inserted=true;}});
 await assert.rejects(()=>repo.borrowBook(bookId,user),error=>error.status===409);assert.equal(inserted,false);assert.deepEqual(condition.availableCopies,{$gt:0});
});
test('a duplicate active borrow never decrements the stock',async()=>{
 let changed=false;const {repo}=fixture({findOneAndUpdate:async()=>{changed=true;}},{findOne:async()=>({userId:user.id})});
 await assert.rejects(()=>repo.borrowBook(bookId,user),error=>error.status===409);assert.equal(changed,false);
});
test('a successful borrow uses the same transaction and verified user',async()=>{
 const book={_id:new ObjectId(bookId),title:'A book',image:'https://example.com/a.jpg',availableCopies:1};let increment,inserted,updateSession,insertSession;
 const {repo,session}=fixture({findOneAndUpdate:async(_filter,update,options)=>{increment=update;updateSession=options.session;return book;}},{findOne:async()=>null,insertOne:async(record,options)=>{inserted=record;insertSession=options.session;return{insertedId:new ObjectId()};}});
 await repo.borrowBook(bookId,user);assert.deepEqual(increment,{$inc:{availableCopies:-1}});assert.equal(updateSession,session);assert.equal(insertSession,session);assert.equal(inserted.userId,user.id);assert.equal(inserted.dueAt-inserted.borrowedAt,7*86400000);
});
test('returning someone else’s borrow cannot increment stock',async()=>{
 let changed=false,filter;const {repo}=fixture({updateOne:async()=>{changed=true;}},{findOneAndDelete:async query=>{filter=query;return null;}});
 await assert.rejects(()=>repo.returnBook(bookId,user),error=>error.status===404);assert.equal(changed,false);assert.equal(filter.userId,user.id);
});
test('a book with active borrows cannot be deleted',async()=>{
 const {repo}=fixture({findOne:async()=>({_id:new ObjectId(bookId),ownerId:user.id,totalCopies:2,availableCopies:1})},{});
 await assert.rejects(()=>repo.deleteBook(bookId,user),error=>error.status===409);
});
test('paginated books use matching filters for rows and totals and redact private email',async()=>{
 let found,counted,projection,offset,size,sort;
 const cursor={sort:value=>{sort=value;return cursor;},skip:value=>{offset=value;return cursor;},limit:value=>{size=value;return cursor;},toArray:async()=>[{title:'Page three'}]};
 const {repo}=fixture({find:(query,options)=>{found=query;projection=options.projection;return cursor;},countDocuments:async query=>{counted=query;return 37;}},{});
 const result=await repo.listBooks({filter:{category:'Science'},limit:12,page:3});
 assert.deepEqual(found,{category:'Science'});assert.deepEqual(counted,found);assert.deepEqual(projection,{ownerEmail:0});assert.deepEqual(sort,{createdAt:-1,_id:-1});assert.equal(offset,24);assert.equal(size,12);
 assert.deepEqual(result,{books:[{title:'Page three'}],total:37,page:3,pageSize:12,totalPages:4});
});
test('legacy latest-books requests remain arrays without a count query',async()=>{
 const cursor={sort:()=>cursor,limit:()=>cursor,toArray:async()=>[{title:'Latest'}]};
 const {repo}=fixture({find:()=>cursor},{});
 assert.deepEqual(await repo.listBooks({filter:{},limit:6}),[{title:'Latest'}]);
});
