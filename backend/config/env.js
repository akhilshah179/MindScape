// Single place that loads environment variables. Import this first.
// Root .env is shared with the Vite frontend; backend/.env (if present) overrides nothing already set.
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })
dotenv.config({ path: path.join(__dirname, '..', '.env') })
