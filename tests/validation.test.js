import test from 'node:test';
import assert from 'node:assert/strict';
import {bookInput,listInput,objectId} from '../src/validation.js';
const valid={title:' A book ',author:'Author',category:'Fiction',description:'A story.',image:'https://example.com/cover.jpg',totalCopies:2};
test('book validation trims input and excludes client-supplied ownership',()=>{const result=bookInput({...valid,ownerId:'someone',availableCopies:900});assert.equal(result.title,'A book');assert.equal(result.ownerId,undefined);assert.equal(result.availableCopies,undefined);});
test('invalid copies, category and data-URL images are rejected',()=>{for(const patch of [{totalCopies:0},{totalCopies:1.5},{category:'Invalid'},{image:'data:image/png;base64,abc'}])assert.throws(()=>bookInput({...valid,...patch}));});
test('partial updates cannot submit only ownership',()=>{assert.throws(()=>bookInput({ownerId:'other'},true));assert.deepEqual(bookInput({title:'New title'},true),{title:'New title'});});
test('search escapes regular-expression metacharacters',()=>{const result=listInput({q:'a.*(book)',limit:'6'});assert.equal(result.limit,6);assert.equal(result.filter.$or[0].title.$regex,'a\\.\\*\\(book\\)');});
test('query and ID validation reject malformed inputs',()=>{for(const query of [{limit:'0'},{limit:'1.2'},{category:'Fake'},{q:[]}])assert.throws(()=>listInput(query));assert.throws(()=>objectId('not-an-id'));assert.equal(objectId('123456789012345678901234'),'123456789012345678901234');});
test('pagination validates page numbers and keeps legacy requests unpaginated',()=>{
 assert.equal(listInput({page:'3',limit:'12'}).page,3);
 assert.equal(listInput({limit:'6'}).page,undefined);
 for(const page of ['0','-1','1.5','not-a-page','100001'])assert.throws(()=>listInput({page}));
});
