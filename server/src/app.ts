import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import type { Adapters } from './adapters/types';
import type { AssessmentService } from './pipeline/assessmentService';
import type { ReleasePolicy } from './policy/policy';
import type { Store } from './store/store';
import { newId } from './util/ids';

export interface AppDeps {
  store: Store;
  adapters: Adapters;
  service: AssessmentService;
  policy: () => ReleasePolicy;
  webDist?: string;
}

const WaiverInput = z.object({
  jiraKey: z.string().min(1),
  release: z.string().min(1),
  approvedBy: z.string().min(1),
  approverRole: z.string().min(1),
  justification: z.string().min(10),
  expiresAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
});

const ExecutionInput = z.object({ executionId: z.string().min(1) });

type Handler = (req: Request, res: Response) => Promise<unknown> | unknown;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);

export function createApp({ store, adapters, service, policy, webDist }: AppDeps): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/api/executions', wrap(async (_req, res) => {
    const executions = await adapters.results.listExecutions();
    res.json(executions.map((e) => ({ ...e, assessed: store.hasAssessmentForExecution(e.executionId) })));
  }));

  app.get('/api/assessments', (_req, res) => res.json(store.listAssessments()));

  app.get('/api/assessments/latest', (_req, res) => {
    const a = store.latestAssessment();
    if (!a) return res.status(404).json({ error: 'No assessments yet' });
    res.json(a);
  });

  app.get('/api/assessments/:id', (req, res) => {
    const a = store.getAssessment(req.params.id);
    if (!a) return res.status(404).json({ error: 'Assessment not found' });
    res.json(a);
  });

  app.post('/api/assessments', wrap(async (req, res) => {
    const { executionId } = ExecutionInput.parse(req.body);
    res.status(201).json(await service.assess(executionId));
  }));

  /** Called by CI / Allure when an automation execution completes (FR-01). */
  app.post('/api/webhooks/execution-completed', wrap(async (req, res) => {
    const { executionId } = ExecutionInput.parse(req.body);
    const a = await service.assess(executionId);
    res.status(202).json({ assessmentId: a.id, decision: a.decision.decision });
  }));

  app.get('/api/policy', (_req, res) => res.json(policy()));

  app.get('/api/waivers', (_req, res) => res.json(store.listWaivers()));

  app.post('/api/waivers', (req, res) => {
    const input = WaiverInput.parse(req.body);
    const waiver = { id: newId('WVR'), approvedAt: new Date().toISOString(), ...input };
    store.addWaiver(waiver);
    res.status(201).json(waiver);
  });

  app.get('/api/artifacts/:id', (req, res) => {
    const a = store.getArtifact(req.params.id);
    if (!a) return res.status(404).json({ error: 'Artifact not found' });
    res.type(a.contentType).send(a.content);
  });

  if (webDist && fs.existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    const message = (err as Error).message ?? 'Internal error';
    const status = /not found/i.test(message) ? 404 : 500;
    res.status(status).json({ error: message });
  });

  return app;
}
