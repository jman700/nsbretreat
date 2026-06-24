import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export default function handler(req, res) {
  const html = readFileSync(join(process.cwd(), '_guestpage.html'), 'utf-8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}
