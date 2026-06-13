import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { Router } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const specPath = path.resolve(__dirname, '../openapi/spec.yaml');
const swaggerDocument = YAML.load(specPath);

const swaggerRouter = Router();

swaggerRouter.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'FinTap API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

export { swaggerRouter };
