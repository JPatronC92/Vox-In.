import React from 'react';
import { createBrowserRouter, Navigate, useOutletContext } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { ViewCapture } from './components/mobile/views/ViewCapture';
import { ViewVisual } from './components/mobile/views/ViewVisual';
import { ViewReport } from './components/mobile/views/ViewReport';

// Define the context shape based on RootLayout's Outlet context
interface RootContextType {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  processAudioSource: (blob: Blob) => Promise<void>;

  report: any;
  localAnalysis: any;
  selection: { start: number; end: number } | null;
  setSelection: (sel: { start: number; end: number } | null) => void;
  handleRunAnalysis: () => void;

  status: string;
  isTranscribing: boolean;
  preTranscription: string;
  seekTo: (time: number) => void;
  logs: string[];
}

const useRootContext = () => useOutletContext<RootContextType>();

const CaptureWrapper = () => {
  const { isRecording, startRecording, stopRecording, processAudioSource } = useRootContext();
  return (
    <ViewCapture
      isRecording={isRecording}
      startRecording={startRecording}
      stopRecording={stopRecording}
      processAudioSource={processAudioSource}
    />
  );
};

const VisualWrapper = () => {
  const { isRecording, report, localAnalysis, selection, setSelection, handleRunAnalysis } =
    useRootContext();
  return (
    <ViewVisual
      isRecording={isRecording}
      report={report}
      localAnalysis={localAnalysis}
      selection={selection}
      setSelection={setSelection}
      handleRunAnalysis={handleRunAnalysis}
    />
  );
};

const ReportWrapper = () => {
  const {
    status,
    isTranscribing,
    preTranscription,
    handleRunAnalysis,
    report,
    seekTo,
    localAnalysis,
    logs,
  } = useRootContext();
  return (
    <ViewReport
      status={status}
      isTranscribing={isTranscribing}
      preTranscription={preTranscription}
      handleRunAnalysis={handleRunAnalysis}
      report={report}
      seekTo={seekTo}
      localAnalysis={localAnalysis}
      logs={logs}
    />
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/capture" replace />,
      },
      {
        path: 'capture',
        element: <CaptureWrapper />,
      },
      {
        path: 'visual',
        element: <VisualWrapper />,
      },
      {
        path: 'report',
        element: <ReportWrapper />,
      },
    ],
  },
]);
