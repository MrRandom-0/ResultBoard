import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowLeft, ArrowRight, Check, MousePointer2, PanelRight, ShieldCheck } from 'lucide-react';
import { Logo } from '../../src/components/Logo';
import { useAppState } from '../../src/hooks/use-app-state';
import { useTheme } from '../../src/hooks/use-theme';
import '../../src/styles/base.css';
import './style.css';

const steps = [
  { icon: MousePointer2, title: 'Decide as you search', copy: 'Keep, Maybe, or Reject appears beside organic Google results—right where you are already evaluating them.' },
  { icon: PanelRight, title: 'A board that stays useful', copy: 'Review saved results in the side panel. Search, filter, tag, annotate, compare, and change your mind anytime.' },
  { icon: ShieldCheck, title: 'Private by default', copy: 'Your projects and saved query context stay in Chrome storage on this device. This build has no account, analytics, or cloud service.' }
];

function App() {
  const { state, error, loading, dispatch } = useAppState();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('My research');
  useTheme(state?.settings.theme, state?.settings.fontSize, state?.settings.accentColor, state?.settings.animationSpeed);
  if (loading || !state) return <div className="spinner" />;

  const finish = async () => {
    if (!state.activeProjectId) await dispatch({ type: 'CREATE_PROJECT', name });
    await dispatch({ type: 'UPDATE_SETTINGS', patch: { onboardingComplete: true } });
    window.location.href = chrome.runtime.getURL('/board.html');
  };
  const content = steps[step];
  const last = step === steps.length;

  return (
    <main>
      <header><Logo /><span>{step + 1} of {steps.length + 1}</span></header>
      <div className="progress">{[0, 1, 2, 3].map((index) => <i key={index} className={index <= step ? 'active' : ''} />)}</div>
      {!last && content ? (
        <section><div className="art"><content.icon size={38} /></div><h1>{content.title}</h1><p>{content.copy}</p></section>
      ) : (
        <section><div className="art done"><Check size={38} /></div><h1>Create your first project</h1><p>Projects keep each search focused. Create as many local projects as your research needs.</p><label>Project name<input autoFocus value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label></section>
      )}
      {error && <div className="error" role="alert">{error}</div>}
      <footer>
        {step > 0 ? <button className="button" onClick={() => setStep(step - 1)}><ArrowLeft size={15} /> Back</button> : <span />}
        {last ? <button className="button primary" disabled={!name.trim()} onClick={() => void finish()}>Open ResultBoard <ArrowRight size={15} /></button> : <button className="button primary" onClick={() => setStep(step + 1)}>Continue <ArrowRight size={15} /></button>}
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
