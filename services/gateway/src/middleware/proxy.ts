import axios, { AxiosError } from 'axios';
import http from 'http';
import https from 'https';
import { Request, Response, NextFunction } from 'express';
import { ROUTE_MAP } from '../config/routes.js';
import { ServiceUnavailableError } from '@fintap/shared';

const PROXY_TIMEOUT = 30_000; // 30 seconds (for file uploads)

// Global keep-alive agents to reduce TCP handshake overhead in serverless
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });

export async function proxyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const matchedRoute = ROUTE_MAP.find(r => req.path.startsWith(r.prefix));
  if (!matchedRoute) {
    return next(); // 404 fallthrough
  }

  const serviceUrl = process.env[matchedRoute.target];
  if (!serviceUrl) {
    return next(new ServiceUnavailableError('Service not configured', 'SERVICE_NOT_CONFIGURED'));
  }

  // Determine the downstream path based on strip mode
  let targetPath: string;
  if (matchedRoute.strip === 'full') {
    targetPath = req.path.replace(matchedRoute.prefix, '') || '/';
  } else {
    targetPath = req.path.replace('/api', '') || '/';
  }

  // Append query string
  const queryString = req.originalUrl.includes('?') ? req.originalUrl.split('?')[1] : '';
  const fullPath = queryString ? `${targetPath}?${queryString}` : targetPath;

  const contentType = req.headers['content-type'] || 'application/json';
  const isMultipart = contentType.includes('multipart/form-data');

  if (isMultipart) {
    // For multipart requests, pipe raw request to downstream service
    await pipeMultipart(req, res, serviceUrl, fullPath);
  } else {
    // For JSON requests, use axios with parsed body
    await proxyJson(req, res, next, serviceUrl, fullPath, contentType);
  }
}

/**
 * Pipe a multipart/form-data request directly to the downstream service
 * using native http module to avoid body parsing issues.
 */
function pipeMultipart(req: Request, res: Response, serviceUrl: string, path: string): Promise<void> {
  return new Promise((resolve) => {
    const url = new URL(serviceUrl);

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path,
      method: req.method,
      headers: {
        ...filterHeaders(req.headers),
        'x-user-id': (req.headers['x-user-id'] as string) || '',
        'x-user-role': (req.headers['x-user-role'] as string) || '',
        'x-user-email': (req.headers['x-user-email'] as string) || '',
        'x-request-id': (req.headers['x-request-id'] as string) || '',
        'x-internal-service': 'true',
      },
      timeout: PROXY_TIMEOUT,
      agent: url.protocol === 'https:' ? httpsAgent : httpAgent,
    };

    const requestModule = url.protocol === 'https:' ? https : http;

    const proxyReq = requestModule.request(options, (proxyRes) => {
      let body = '';
      proxyRes.on('data', (chunk) => { body += chunk; });
      proxyRes.on('end', () => {
        try {
          const data = JSON.parse(body);
          res.status(proxyRes.statusCode || 500).json(data);
        } catch {
          res.status(proxyRes.statusCode || 500).send(body);
        }
        resolve();
      });
    });

    proxyReq.on('error', () => {
      res.status(503).json({ status: 'error', message: 'Service unavailable', code: 'SERVICE_UNREACHABLE' });
      resolve();
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(503).json({ status: 'error', message: 'Service unavailable', code: 'SERVICE_TIMEOUT' });
      resolve();
    });

    // Pipe the incoming request directly to the proxy request
    req.pipe(proxyReq);
  });
}

/**
 * Proxy JSON/urlencoded requests using axios with the parsed body.
 */
async function proxyJson(
  req: Request,
  res: Response,
  next: NextFunction,
  serviceUrl: string,
  path: string,
  contentType: string
): Promise<void> {
  try {
    const response = await axios({
      method: req.method as any,
      url: `${serviceUrl}${path}`,
      data: req.body,
      headers: {
        'content-type': contentType,
        'x-user-id': (req.headers['x-user-id'] as string) || '',
        'x-user-role': (req.headers['x-user-role'] as string) || '',
        'x-user-email': (req.headers['x-user-email'] as string) || '',
        'x-request-id': (req.headers['x-request-id'] as string) || '',
        'x-internal-service': 'true',
      },
      timeout: PROXY_TIMEOUT,
      validateStatus: () => true,
      httpAgent,
      httpsAgent,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    const axiosErr = error as AxiosError;
    if (axiosErr.code === 'ECONNABORTED') {
      res.status(503).json({ status: 'error', message: 'Service unavailable', code: 'SERVICE_TIMEOUT' });
    } else if (axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ENOTFOUND') {
      res.status(503).json({ status: 'error', message: 'Service unavailable', code: 'SERVICE_UNREACHABLE' });
    } else {
      next(error);
    }
  }
}

/**
 * Filter request headers to only pass through relevant ones for multipart proxy.
 */
function filterHeaders(headers: http.IncomingHttpHeaders): Record<string, string> {
  const forwarded: Record<string, string> = {};
  const allowedHeaders = ['content-type', 'content-length', 'transfer-encoding'];

  for (const key of allowedHeaders) {
    if (headers[key]) {
      forwarded[key] = headers[key] as string;
    }
  }

  return forwarded;
}
