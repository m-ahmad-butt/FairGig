const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getFirstDefinedEnv(keys, defaultValue = undefined) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return defaultValue;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
}

function getExtensionFromMime(fileType) {
  if (fileType === 'image/jpeg') {
    return 'jpg';
  }

  if (fileType === 'image/png') {
    return 'png';
  }

  if (fileType === 'image/webp') {
    return 'webp';
  }

  return null;
}

function normalizeBucketName(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .replace(/^s3:\/\//i, '')
    .replace(/\/+$/g, '');
}

function buildS3Config() {
  const bucket = normalizeBucketName(
    getFirstDefinedEnv(['AWS_S3_BUCKET', 'S3_BUCKET', 'EVIDENCE_S3_BUCKET'])
  );
  const region = getFirstDefinedEnv(['AWS_REGION', 'S3_REGION', 'AWS_DEFAULT_REGION'], 'ap-south-1');

  if (!bucket) {
    const configError = new Error('S3 bucket is not configured. Set AWS_S3_BUCKET in environment variables.');
    configError.code = 'CONFIG_ERROR';
    throw configError;
  }

  if (bucket.includes('/')) {
    const configError = new Error('Invalid S3 bucket name. Use bucket name only (example: fast-ex-3059), without trailing slash or path.');
    configError.code = 'CONFIG_ERROR';
    throw configError;
  }

  const endpoint = getFirstDefinedEnv(['AWS_S3_ENDPOINT', 'S3_ENDPOINT']);
  const forcePathStyle = toBoolean(
    getFirstDefinedEnv(['AWS_S3_FORCE_PATH_STYLE', 'S3_FORCE_PATH_STYLE']),
    false
  );

  const expiresIn = Number(
    getFirstDefinedEnv(['AWS_S3_UPLOAD_EXPIRES_SECONDS', 'S3_UPLOAD_EXPIRES_SECONDS'], '900')
  );

  const keyPrefix = getFirstDefinedEnv(['EVIDENCE_S3_PREFIX', 'AWS_S3_PREFIX'], 'evidence').replace(/(^\/|\/$)/g, '');
  const publicBaseUrl = getFirstDefinedEnv(['EVIDENCE_PUBLIC_BASE_URL', 'AWS_S3_PUBLIC_BASE_URL', 'S3_PUBLIC_BASE_URL']);

  const clientConfig = {
    region,
    forcePathStyle
  };

  if (endpoint) {
    clientConfig.endpoint = endpoint;
  }

  const accessKeyId = getFirstDefinedEnv(['AWS_ACCESS_KEY_ID']);
  const secretAccessKey = getFirstDefinedEnv(['AWS_SECRET_ACCESS_KEY']);

  if (accessKeyId && secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId,
      secretAccessKey
    };
  }

  return {
    bucket,
    region,
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? Math.floor(expiresIn) : 900,
    keyPrefix,
    publicBaseUrl,
    endpoint,
    forcePathStyle,
    client: new S3Client(clientConfig)
  };
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/$/, '');
}

function buildPublicImageUrl({ bucket, region, key, publicBaseUrl, endpoint, forcePathStyle }) {
  if (publicBaseUrl) {
    return `${trimTrailingSlash(publicBaseUrl)}/${key}`;
  }

  if (endpoint) {
    const normalizedEndpoint = trimTrailingSlash(endpoint);
    if (forcePathStyle) {
      return `${normalizedEndpoint}/${bucket}/${key}`;
    }

    const endpointUrl = new URL(normalizedEndpoint);
    return `${endpointUrl.protocol}//${bucket}.${endpointUrl.host}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function buildObjectKey({ sessionId, workerId, fileType, keyPrefix }) {
  const extension = getExtensionFromMime(fileType);
  if (!extension) {
    const validationError = new Error('Unsupported file type. Allowed: image/jpeg, image/png, image/webp.');
    validationError.code = 'VALIDATION_ERROR';
    throw validationError;
  }

  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const safeWorker = String(workerId || 'worker').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSession = String(sessionId || 'session').replace(/[^a-zA-Z0-9_-]/g, '');

  return `${keyPrefix}/${safeWorker}/${safeSession}-${timestamp}-${randomSuffix}.${extension}`;
}

async function createEvidenceUploadUrls({ sessionId, workerId, fileType }) {
  const normalizedFileType = String(fileType || '').toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.has(normalizedFileType)) {
    const validationError = new Error('Unsupported file type. Allowed: image/jpeg, image/png, image/webp.');
    validationError.code = 'VALIDATION_ERROR';
    throw validationError;
  }

  const config = buildS3Config();
  const key = buildObjectKey({
    sessionId,
    workerId,
    fileType: normalizedFileType,
    keyPrefix: config.keyPrefix
  });

  const putCommand = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: normalizedFileType
  });

  const uploadUrl = await getSignedUrl(config.client, putCommand, {
    expiresIn: config.expiresIn
  });

  const imageUrl = buildPublicImageUrl({
    bucket: config.bucket,
    region: config.region,
    key,
    publicBaseUrl: config.publicBaseUrl,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle
  });

  return {
    uploadUrl,
    imageUrl,
    key,
    expiresIn: config.expiresIn
  };
}

async function uploadEvidenceBuffer({ sessionId, workerId, fileType, buffer }) {
  const normalizedFileType = String(fileType || '').toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.has(normalizedFileType)) {
    const validationError = new Error('Unsupported file type. Allowed: image/jpeg, image/png, image/webp.');
    validationError.code = 'VALIDATION_ERROR';
    throw validationError;
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const validationError = new Error('Image payload is required.');
    validationError.code = 'VALIDATION_ERROR';
    throw validationError;
  }

  const config = buildS3Config();
  const key = buildObjectKey({
    sessionId,
    workerId,
    fileType: normalizedFileType,
    keyPrefix: config.keyPrefix
  });

  const putCommand = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
    ContentType: normalizedFileType
  });

  await config.client.send(putCommand);

  const imageUrl = buildPublicImageUrl({
    bucket: config.bucket,
    region: config.region,
    key,
    publicBaseUrl: config.publicBaseUrl,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle
  });

  return {
    imageUrl,
    key
  };
}

module.exports = {
  createEvidenceUploadUrls,
  uploadEvidenceBuffer
};
