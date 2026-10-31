import { HttpError } from './errors.js';
export const categories = ['Fiction','Science','History','Kids','Others'];
export function objectId(value) {
 if(typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) throw new HttpError(400,'Invalid record ID.');
 return value;
}
function text(value, name, max) {
 if(typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new HttpError(400,`${name} is required and must be under ${max + 1} characters.`);
 return value.trim();
}
export function bookInput(body, partial = false) {
 if(!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400,'Send valid book information.');
 const result = {};
 for(const [key,max] of [['title',150],['author',100],['description',2000]]) if(!partial || key in body) result[key]=text(body[key],key,max);
 if(!partial || 'category' in body) { if(!categories.includes(body.category)) throw new HttpError(400,'Choose a valid category.'); result.category=body.category; }
 if(!partial || 'image' in body) {
  const image=text(body.image,'Cover image URL',2048);
  let parsed;try {parsed=new URL(image);}catch{throw new HttpError(400,'Provide a valid cover image URL.');}
  if(!['https:','http:'].includes(parsed.protocol)) throw new HttpError(400,'Cover images must use HTTP or HTTPS.');
  result.image=image;
 }
 if(!partial || 'totalCopies' in body) {
  if(!Number.isInteger(body.totalCopies) || body.totalCopies < 1 || body.totalCopies > 10000) throw new HttpError(400,'Total copies must be a whole number from 1 to 10000.');
  result.totalCopies=body.totalCopies;
 }
 if(!Object.keys(result).length) throw new HttpError(400,'Provide at least one book field to update.');
 return result;
}
export function listInput(query) {
 const filter={};
 if(query.category) { if(!categories.includes(query.category)) throw new HttpError(400,'Choose a valid category.');filter.category=query.category; }
 if(query.q) { if(typeof query.q !== 'string' || query.q.length > 150) throw new HttpError(400,'Search must be under 151 characters.');const escaped=query.q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');filter.$or=[{title:{$regex:escaped,$options:'i'}},{author:{$regex:escaped,$options:'i'}}]; }
 const limit=query.limit===undefined?100:Number(query.limit);
 if(!Number.isInteger(limit)||limit<1||limit>500) throw new HttpError(400,'Limit must be between 1 and 500.');
 return {filter,limit,mine:query.mine==='true'};
}
