// Registers every website with the router. New sites are added here.
import { registerSite } from '../net/router.js';
import { findr } from './findr.js';
import { vidder } from './vidder.js';
import { threadit } from './threadit.js';
import { blink } from './blink.js';
for (const s of [findr, vidder, threadit, blink]) registerSite(s);
