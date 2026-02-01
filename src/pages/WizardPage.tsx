import React, { useCallback } from 'react';
import { css } from '@emotion/css';
import { PluginPage } from '@grafana/runtime';
import { useStyles2, TabsBar, Tab, Button } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { useWizardState } from '../hooks/useWizardState';
import { StepWelcome } from '../components/wizard/StepWelcome';
import { StepSLOBasics } from '../components/wizard/StepSLOBasics';
import { StepSLIQueries, useWeightValidation } from '../components/wizard/StepSLIQueries';
import { StepReview } from '../components/wizard/StepReview';
import { DashboardPreview } from '../components/preview/DashboardPreview';
import type { WizardState } from '../lib/yaml-generator';

const STEP_LABELS = ['SLO Definition', 'SLI Queries', 'Review & Export'];

function WizardPage() {
  const styles = useStyles2(getStyles);
  const wizard = useWizardState();
  const weightsValid = useWeightValidation(wizard.state);
  const canProceed = wizard.step !== 2 || weightsValid;

  const handleStartFresh = useCallback(() => {
    wizard.goToStep(1);
  }, [wizard]);

  const handleImport = useCallback((imported: WizardState) => {
    wizard.setFullState(imported);
    wizard.goToStep(1);
  }, [wizard]);

  // Step 0: Welcome — full-width centered, no tabs/preview
  if (wizard.step === 0) {
    return (
      <PluginPage>
        <div className={styles.welcomeContainer}>
          <StepWelcome onStartFresh={handleStartFresh} onImport={handleImport} />
        </div>
      </PluginPage>
    );
  }

  const renderStep = () => {
    switch (wizard.step) {
      case 1:
        return <StepSLOBasics state={wizard.state} update={wizard.update} />;
      case 2:
        return (
          <StepSLIQueries
            state={wizard.state}
            update={wizard.update}
            updateSLI={wizard.updateSLI}
            addSLI={wizard.addSLI}
            removeSLI={wizard.removeSLI}
          />
        );
      case 3:
        return <StepReview state={wizard.state} update={wizard.update} onReset={wizard.reset} />;
      default:
        return null;
    }
  };

  return (
    <PluginPage>
      <div className={styles.container}>
        <div className={styles.wizard}>
          <TabsBar>
            {STEP_LABELS.map((label, i) => (
              <Tab
                key={label}
                label={label}
                active={wizard.step === i + 1}
                onChangeTab={() => wizard.goToStep(i + 1)}
              />
            ))}
          </TabsBar>
          <div className={styles.stepContent}>{renderStep()}</div>
          <div className={styles.nav}>
            {wizard.step > 1 && (
              <Button variant="secondary" onClick={wizard.prevStep}>
                Back
              </Button>
            )}
            {wizard.step < 3 && (
              <Button variant="primary" onClick={wizard.nextStep} disabled={!canProceed}>
                Next
              </Button>
            )}
          </div>
        </div>
        <div className={styles.preview}>
          <DashboardPreview state={wizard.state} />
        </div>
      </div>
    </PluginPage>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    welcomeContainer: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 'calc(100vh - 160px)',
      minHeight: '400px',
    }),
    container: css({
      display: 'flex',
      gap: theme.spacing(2),
      height: 'calc(100vh - 160px)',
      minHeight: '400px',
    }),
    wizard: css({
      flex: '0 0 40%',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
      overflow: 'hidden',
    }),
    stepContent: css({
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
    }),
    nav: css({
      display: 'flex',
      justifyContent: 'space-between',
      flexShrink: 0,
      paddingTop: theme.spacing(1),
      borderTop: `1px solid ${theme.colors.border.weak}`,
    }),
    preview: css({
      flex: '0 0 58%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderLeft: `1px solid ${theme.colors.border.weak}`,
      paddingLeft: theme.spacing(2),
    }),
  };
}

export default WizardPage;
