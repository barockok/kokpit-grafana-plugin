import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';

const WizardPage = React.lazy(() => import('../../pages/WizardPage'));

function App(props: AppRootProps) {
  return (
    <Routes>
      <Route path="*" element={<WizardPage />} />
    </Routes>
  );
}

export default App;
