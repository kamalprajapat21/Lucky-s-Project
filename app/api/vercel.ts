import { handle } from 'hono/vercel';
import { app } from './app';

// Export the Hono app with Vercel adapter
export default handle(app);