import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import useBracket from '../hooks/useBracket.js';
import Countdown from '../components/Countdown.jsx';
import SaveIndicator from '../components/SaveIndicator.jsx';
import AwardsCard from '../components/AwardsCard.jsx';
import GroupStageTab from './bracketTabs/GroupStageTab.jsx';
import ThirdsTab from './bracketTabs/ThirdsTab.jsx';
import KnockoutTab from './bracketTabs/KnockoutTab.jsx';
import FullBracketTab from './bracketTabs/FullBracketTab.jsx';
import { GROUP_LOCK_UTC, KO_LOCK_UTC, groupLocked, knockoutLocked } from '../lib/dates.js';

const TABS = [
  { id: 'GROUPS', label: 'Group Stage',  phase: 'group' },
  { id: 'THIRDS', label: 'Best 8 Thirds', phase: 'group' },
  { id: 'R32',    label: 'R32',          phase: 'ko'    },
  { id: 'R16',    label: 'R16',          phase: 'ko'    },
  { id: 'QF',     label: 'Quarters',     phase: 'ko'    },
  { id: 'SF',     label: 'Semis',        phase: 'ko'    },
  { id: 'FINAL',  label: 'Final + 3rd',  phase: 'ko'    },
  { id: 'FULL',   label: 'Full Bracket', phase: 'view'  },
];

export default function Bracket() {
  const { user } = useAuth();
  const [tab, setTab] = useState('GROUPS');
  const { loading, bracket, fixture, setBracket, saving, savedAt, error } = useBracket(user?.id);

  const gLocked = groupLocked();
  const kLocked = knockoutLocked();

  if (loading || !bracket) {
    return (
      <div className="space-y-3">
        <div className="card animate-pulse h-20" />
        <div className="card animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Countdown target={GROUP_LOCK_UTC} label="Group stage locks in" />
        <Countdown target={KO_LOCK_UTC}    label="Knockout bracket locks in" />
      </div>

      <AwardsCard bracket={bracket} setBracket={setBracket} locked={gLocked} />

      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap border
                ${tab === t.id ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <SaveIndicator saving={saving} savedAt={savedAt} error={error} />
      </div>

      {tab === 'GROUPS' && (
        <>
          {gLocked && <LockBanner text="Group stage picks locked (deadline passed)." />}
          <GroupStageTab bracket={bracket} setBracket={setBracket} locked={gLocked} />
        </>
      )}
      {tab === 'THIRDS' && (
        <>
          {gLocked && <LockBanner text="Side bet locked (deadline passed)." />}
          <ThirdsTab bracket={bracket} setBracket={setBracket} locked={gLocked} />
        </>
      )}
      {(tab === 'R32' || tab === 'R16' || tab === 'QF' || tab === 'SF' || tab === 'FINAL') && (
        <>
          {kLocked && <LockBanner text="Knockout bracket locked (deadline passed)." />}
          <KnockoutTab
            round={tab}
            bracket={bracket}
            fixture={fixture}
            setBracket={setBracket}
            locked={kLocked}
          />
        </>
      )}
      {tab === 'FULL' && <FullBracketTab bracket={bracket} fixture={fixture} />}
    </div>
  );
}

function LockBanner({ text }) {
  return (
    <div className="card mb-3 border-red-700/40 bg-red-900/10 text-red-300 text-sm">
      🔒 {text}
    </div>
  );
}
