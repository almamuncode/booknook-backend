export class HttpError extends Error {
 constructor(status, message) { super(message); this.status = status; }
}
export function errorHandler(error, _request, response, _next) {
 if (error.code === 11000) return response.status(409).json({message:'You already have an active borrow for this book.'});
 if (error.type === 'entity.parse.failed') return response.status(400).json({message:'Send a valid JSON body.'});
 if (error.type === 'entity.too.large') return response.status(413).json({message:'The request is too large.'});
 const status = error instanceof HttpError ? error.status : 500;
 if (status === 500) console.error('Request failed:', error.name);
 response.status(status).json({message:status === 500 ? 'The library could not complete this request.' : error.message});
}
