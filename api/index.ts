import app from "../server.js";
import querystring from "querystring";

export default function handler(req: any, res: any) {
  // Reconstruct the URL for Express
  const pathParam = req.query?.path;
  if (pathParam) {
    const query = { ...req.query };
    delete query.path;
    const qs = querystring.stringify(query);
    req.url = '/api/' + pathParam + (qs ? '?' + qs : '');
  }
  
  // Pass the Vercel request directly into our Express app
  return app(req, res);
}
