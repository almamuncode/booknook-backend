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
