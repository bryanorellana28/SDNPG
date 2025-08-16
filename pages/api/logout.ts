import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    serialize('token', '', { path: '/', httpOnly: true, maxAge: -1 })
  );
  res.status(200).json({ message: 'logged out' });
}
