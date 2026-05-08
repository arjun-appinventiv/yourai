import React, { useEffect, useMemo, useState } from 'react';
import { type WorkflowRun, type WorkflowTemplate } from '../../../lib/workflow';
import { retryStep } from '../../../lib/workflowRunner';
import WorkflowStepItem from './WorkflowStepItem';

export default function WorkflowStepTimeline({
  run,
  template,
}: {
  run: WorkflowRun;
  template: WorkflowTemplate;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (run.status !== 'running') {
      setElapsed(0);
      return;
    }
    const activeStep = run.steps[run.currentStepIndex];
    if (!activeStep?.startedAt) return;
    const start = new Date(activeStep.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [run]);

  const retryFromStep = useMemo(() => {
    return (stepIndex: number, nextInstruction?: string) => {
      const nextTemplate: WorkflowTemplate = {
        ...template,
        steps: template.steps.map((step, index) => ({
          ...step,
          instruction: index === stepIndex && nextInstruction ? nextInstruction : step.instruction,
        })),
      };
      retryStep(run.id, stepIndex, {
        template: nextTemplate,
        uploadedDocs: run.uploadedDocs,
        userId: run.userId,
        userName: '',
        workspaceId: run.workspaceId,
        workspaceName: run.workspaceId ? 'Workspace' : null,
      });
    };
  }, [run, template]);

  return (
    <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
      {run.steps.map((step, index) => (
        <WorkflowStepItem
          key={step.stepId}
          step={step}
          stepNumber={index + 1}
          isLast={index === run.steps.length - 1}
          templateStep={template.steps[index]}
          elapsed={index === run.currentStepIndex && step.status === 'running' ? elapsed : null}
          onRetryStep={(nextInstruction) => retryFromStep(index, nextInstruction)}
        />
      ))}
    </div>
  );
}
