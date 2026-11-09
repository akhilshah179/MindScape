// Object storage for user PDFs and their extracted text.
//   STORAGE_DRIVER=s3    -> AWS S3 (S3_BUCKET + AWS credentials). Private objects, SSE-S3 encryption.
//   STORAGE_DRIVER=local -> files under STORAGE_LOCAL_DIR (default backend/uploads). Development only:
//                           files persist on this machine's disk but not across hosts/containers.
// Default: s3 when a bucket and AWS credentials are configured, otherwise local (with a loud warning).
//
// Files are always served through the backend after an ownership check; buckets stay private.
import '../config/env.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand, HeadBucketCommand } from '@aws-sdk/client-s3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BUCKET = process.env.S3_BUCKET || process.env.VITE_S3_BUCKET || ''
const REGION = process.env.S3_REGION || process.env.VITE_S3_REGION || process.env.AWS_REGION || 'ap-south-1'
const hasAwsCreds = Boolean((process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) || process.env.AWS_PROFILE)

export const STORAGE_MODE = (process.env.STORAGE_DRIVER || (BUCKET && hasAwsCreds ? 's3' : 'local')).toLowerCase()
const LOCAL_ROOT = path.resolve(process.env.STORAGE_LOCAL_DIR || path.join(__dirname, '..', 'uploads'))

const s3 = STORAGE_MODE === 's3' ? new S3Client({ region: REGION }) : null
if (STORAGE_MODE === 's3' && !BUCKET) throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET.')
if (!['s3', 'local'].includes(STORAGE_MODE)) throw new Error(`Unknown STORAGE_DRIVER "${STORAGE_MODE}"`)

const safeSegment = (s) => String(s || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || '_'

/** Deterministic object keys: users/<userId>/files/<fileId>/<name> */
export const objectKeys = (userId, fileId) => {
  const base = `users/${safeSegment(userId)}/files/${safeSegment(fileId)}`
  return { pdf: `${base}/original.pdf`, text: `${base}/text.json` }
}

function localPath(key) {
  const p = path.resolve(LOCAL_ROOT, key)
  if (!p.startsWith(LOCAL_ROOT + path.sep)) throw new Error('Invalid storage key')
  return p
}

export async function putObject(key, body, contentType, metadata = {}) {
  if (s3) {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: body, ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, encodeURIComponent(String(v)).slice(0, 512)]))
    }))
    return
  }
  const p = localPath(key)
  await fs.promises.mkdir(path.dirname(p), { recursive: true })
  const tmp = `${p}.tmp`
  await fs.promises.writeFile(tmp, body)
  await fs.promises.rename(tmp, p)
}

/**
 * Open an object for streaming, honouring an HTTP Range header ("bytes=start-end").
 * Returns { stream, size, start, end, partial } or null if the object doesn't exist.
 */
export async function getObjectStream(key, rangeHeader, knownSize) {
  if (s3) {
    try {
      const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: rangeHeader || undefined }))
      const total = out.ContentRange ? Number(out.ContentRange.split('/')[1]) : Number(out.ContentLength)
      const [start, end] = out.ContentRange
        ? out.ContentRange.replace(/^bytes /, '').split('/')[0].split('-').map(Number)
        : [0, total - 1]
      return { stream: out.Body, size: total, start, end, partial: Boolean(out.ContentRange) }
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null
      if (err.name === 'InvalidRange') return { invalidRange: true, size: knownSize }
      throw err
    }
  }
  return openLocalFile(localPath(key), rangeHeader)
}

export async function openLocalFile(p, rangeHeader) {
  let stat
  try { stat = await fs.promises.stat(p) } catch { return null }
  const size = stat.size
  let start = 0, end = size - 1, partial = false
  const m = rangeHeader && /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  if (m) {
    if (m[1] === '' && m[2] !== '') { start = Math.max(0, size - Number(m[2])) }
    else { start = Number(m[1]); if (m[2] !== '') end = Math.min(Number(m[2]), size - 1) }
    if (start > end || start >= size) return { invalidRange: true, size }
    partial = true
  }
  return { stream: fs.createReadStream(p, { start, end }), size, start, end, partial }
}

export async function getObjectBuffer(key) {
  const r = await getObjectStream(key)
  if (!r || r.invalidRange) return null
  const chunks = []
  for await (const c of r.stream) chunks.push(c)
  return Buffer.concat(chunks)
}

export async function deleteObjects(keys) {
  if (!keys.length) return
  if (s3) {
    const out = await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true } }))
    if (out.Errors?.length) throw new Error(`S3 delete failed: ${out.Errors.map(e => e.Message).join('; ')}`)
    return
  }
  for (const k of keys) await fs.promises.rm(localPath(k), { force: true })
  // tidy empty directory
  await fs.promises.rmdir(path.dirname(localPath(keys[0]))).catch(() => {})
}

/** Legacy records (pre-S3) stored an absolute local path. Resolve it only inside the uploads root. */
export function legacyLocalPath(fileRecord) {
  if (!fileRecord?.storedPath) return null
  const p = path.resolve(fileRecord.storedPath)
  return p.startsWith(LOCAL_ROOT + path.sep) ? p : null
}

export async function checkStorage() {
  if (s3) {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
    return { driver: 's3', bucket: BUCKET, region: REGION }
  }
  await fs.promises.mkdir(LOCAL_ROOT, { recursive: true })
  return { driver: 'local', dir: LOCAL_ROOT }
}
