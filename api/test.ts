import { VercelRequest, VercelResponse } from '@vercel/node';
export default function(req: VercelRequest, res: VercelResponse) {
  res.json({ url: req.url, headers: req.headers });
}
