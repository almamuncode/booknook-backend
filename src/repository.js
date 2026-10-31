import { ObjectId } from 'mongodb';
import { HttpError } from './errors.js';
export function createRepository(client, db) {
 const books=db.collection('books');const borrows=db.collection('borrows');
 const id=value=>new ObjectId(value);
 async function transaction(work) {
  const session=client.startSession();
  try{return await session.withTransaction(()=>work(session));}finally{await session.endSession();}
 }
 return {
  async initialize() {
   await books.createIndex({createdAt:-1,_id:-1});
   await books.createIndex({ownerId:1,createdAt:-1});
   await borrows.createIndex({userId:1,bookId:1},{unique:true});
   await borrows.createIndex({bookId:1});
  },
  async listBooks({filter,limit},user) {return books.find({...filter,...(user?{ownerId:user.id}:{})},{projection:user?{}:{ownerEmail:0}}).sort({createdAt:-1,_id:-1}).limit(limit).toArray();},
  async getBook(bookId) {const book=await books.findOne({_id:id(bookId)});if(!book)throw new HttpError(404,'Book not found.');return book;},
  async addBook(data,user) {
   const book={...data,availableCopies:data.totalCopies,ownerId:user.id,ownerName:user.name,ownerEmail:user.email,createdAt:new Date(),updatedAt:new Date()};
   const result=await books.insertOne(book);return {...book,_id:result.insertedId};
  },
  async updateBook(bookId,data,user) {
   return transaction(async session=>{
    const book=await books.findOne({_id:id(bookId)},{session});
    if(!book)throw new HttpError(404,'Book not found.');if(book.ownerId!==user.id)throw new HttpError(403,'You can only edit your own books.');
    const borrowed=book.totalCopies-book.availableCopies;
    if(data.totalCopies!==undefined && data.totalCopies<borrowed)throw new HttpError(409,'Total copies cannot be below the number currently borrowed.');
    const update={...data,updatedAt:new Date()};if(data.totalCopies!==undefined)update.availableCopies=data.totalCopies-borrowed;
    return books.findOneAndUpdate({_id:book._id,ownerId:user.id},{$set:update},{session,returnDocument:'after'});
   });
  },
  async deleteBook(bookId,user) {
   return transaction(async session=>{
    const book=await books.findOne({_id:id(bookId)},{session});
    if(!book)throw new HttpError(404,'Book not found.');if(book.ownerId!==user.id)throw new HttpError(403,'You can only delete your own books.');
    if(book.availableCopies<book.totalCopies || await borrows.findOne({bookId:book._id},{session}))throw new HttpError(409,'Return all borrowed copies before deleting this book.');
    await books.deleteOne({_id:book._id,ownerId:user.id},{session});return {message:'Book deleted.'};
   });
  },
  async borrowBook(bookId,user) {
   return transaction(async session=>{
    if(await borrows.findOne({bookId:id(bookId),userId:user.id},{session}))throw new HttpError(409,'You already have an active borrow for this book.');
    const book=await books.findOneAndUpdate({_id:id(bookId),availableCopies:{$gt:0}},{$inc:{availableCopies:-1}},{session,returnDocument:'after'});
    if(!book) {if(!await books.findOne({_id:id(bookId)},{session}))throw new HttpError(404,'Book not found.');throw new HttpError(409,'This book is currently unavailable.');}
    const borrowedAt=new Date();const dueAt=new Date(borrowedAt.getTime()+7*86400000);
    const borrow={bookId:book._id,title:book.title,image:book.image,userId:user.id,userName:user.name,userEmail:user.email,borrowedAt,dueAt};
    const result=await borrows.insertOne(borrow,{session});return {...borrow,_id:result.insertedId};
   });
  },
  async listBorrows(user) {return borrows.find({userId:user.id}).sort({borrowedAt:-1}).toArray();},
  async returnBook(borrowId,user) {
   return transaction(async session=>{
    const borrow=await borrows.findOneAndDelete({_id:id(borrowId),userId:user.id},{session});
    if(!borrow)throw new HttpError(404,'Borrow record not found.');
    const update=await books.updateOne({_id:borrow.bookId},{$inc:{availableCopies:1}},{session});
    if(!update.matchedCount)throw new HttpError(409,'The original book could not be found.');
    return {message:'Book returned.'};
   });
  }
 };
}
