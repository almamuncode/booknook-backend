import {readFile} from 'node:fs/promises';
import {MongoClient} from 'mongodb';
if(!process.env.MONGODB_URI)throw new Error('Set MONGODB_URI in .env before seeding.');
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
try {
 await client.connect();const books=client.db(process.env.MONGODB_DB || 'booknook').collection('books');
 await books.createIndex({seedKey:1},{unique:true,sparse:true});
 const seeds=JSON.parse(await readFile(new URL('./seed-books.json',import.meta.url),'utf8'));
 for(const [index,book] of seeds.entries()) {
  const seedKey=book.seedKey || `booknook-${index+1}`;
  await books.updateOne({seedKey},{$setOnInsert:{...book,seedKey,ownerId:process.env.SEED_OWNER_ID || 'booknook-community',ownerName:process.env.SEED_OWNER_NAME || 'BookNook Community',ownerEmail:process.env.SEED_OWNER_EMAIL || '',createdAt:book.createdAt?new Date(book.createdAt):new Date(Date.UTC(2026,9,25+index)),updatedAt:new Date()}},{upsert:true});
 }
 console.log(`${seeds.length} catalog books are ready. Existing books and copy counts were preserved.`);
}finally{await client.close();}
