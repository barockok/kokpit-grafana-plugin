import React from 'react';
import { css } from '@emotion/css';
import { PluginPage } from '@grafana/runtime';
import { useStyles2, TabsBar, Tab, Button } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { useWizardState } from '../hooks/useWizardState';
import { StepSLOBasics } from '../components/wizard/StepSLOBasics';
import { StepSLIQueries } from '../components/wizard/StepSLIQueries';
import { StepReview } from '../components/wizard/StepReview';
import { DashboardPreview } from '../components/preview/DashboardPreview';

const STEP_LABELS = ['SLO Definition', 'SLI Queries', 'Review & Export'];

function WizardPage() {
  const styles = useStyles2(getStyles);
  const wizard = useWizardState();

  const renderStep = () => {
    switch (wizard.step) {
      case 0:
        return <StepSLOBasics state={wizard.state} update={wizard.update} />;
      case 1:
        return (
          <StepSLIQueries
            state={wizard.state}
            update={wizard.update}
            updateSLI={wizard.updateSLI}
            addSLI={wizard.addSLI}
            removeSLI={wizard.removeSLI}
          />
        );
      case 2:
        return <StepReview state={wizard.state} update={wizard.update} />;
      default:
        return null;
    }
  };

  return (
    <PluginPage>
      <div className={styles.container}>
        <div className={styles.wizard}>
          <div className={styles.header}>
            <TabsBar>
              {STEP_LABELS.map((label, i) => (
                <Tab key={label} label={label} active={wizard.step === i} onChangeTab={() => wizard.goToStep(i)} />
              ))}
            </TabsBar>
            <Button variant="destructive" icon="repeat" size="sm" onClick={wizard.reset}>
              Start Over
            </Button>
          </div>
          <div className={styles.stepContent}>{renderStep()}</div>
          <div className={styles.nav}>
            {wizard.step > 0 && (
              <Button variant="secondary" onClick={wizard.prevStep}>
                Back
              </Button>
            )}
            {wizard.step < 2 && (
              <Button variant="primary" onClick={wizard.nextStep}>
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
    container: css({
      display: 'flex',
      gap: theme.spacing(2),
      height: '100%',
      minHeight: '600px',
    }),
    wizard: css({
      flex: '0 0 40%',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
      overflow: 'auto',
    }),
    header: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
    }),
    stepContent: css({
      flex: 1,
      overflow: 'auto',
    }),
    nav: css({
      display: 'flex',
      justifyContent: 'space-between',
      paddingTop: theme.spacing(1),
      borderTop: `1px solid ${theme.colors.border.weak}`,
    }),
    preview: css({
      flex: '0 0 58%',
      overflow: 'auto',
      borderLeft: `1px solid ${theme.colors.border.weak}`,
      paddingLeft: theme.spacing(2),
    }),
  };
}

export default WizardPage;
