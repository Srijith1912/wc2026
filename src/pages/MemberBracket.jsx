import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useBracket from '../hooks/useBracket.js';
import { supabase } from '../lib/supabase.js';
import GroupStageTab from './bracketTabs/GroupStageTab.jsx';
import ThirdsTab from './bracketTabs/ThirdsTab.jsx';
import KnockoutTab from './bracketTabs/KnockoutTab.jsx';
import FullBracketTab from './bracketTabs/FullBracketTab.jsx';
import AwardsCard from '../components/AwardsCard.jsx';

const TABS = [
  { id: 'GROUPS', label: 'Group Stage' },
  { id: 'THIRDS', label: 'Best 8 Thirds' },
  { id: 'R32',    label: 'R32' },
  { id: 'R16',    label: 'R16' },
  { id: 'QF',     label: 'Quarters' },
  { id: 'SF',     label: 'Semis' },
  { id: 'FINAL',  label: 'Final + 3rd' },
  { id: 'FULL',   label: 'Full Bracket' },
];

export default function MemberBracket() {
  const { userId } = useParams();
  const [name, setName] = useState('');
  const [tab, setTab] = useState('GROUPS');
  const { loading, bracket, fixture } = useBracket(userId, { readOnly: true });

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle()
      .then(({ data }) => setName(data?.display_name || ''));
  }, [userId]);

  if (loading || !bracket) return <div className="text-muted">Loading…</div>;

  const setBracket = () => {}; // read-only no-op

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-muted">Viewing</div>
          <div className="display text-2xl text-gold">{name || 'Member'}</div>
        </div>
        <Link to="/group" className="btn-secondary text-sm">← Back to group</Link>
      </div>

      <AwardsCard bracket={bracket} setBracket={setBracket} locked readOnly />

      <div className="flex flex-wrap gap-1.5 mb-3">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap border
              ${tab === t.id ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'GROUPS' && <GroupStageTab bracket={bracket} setBracket={setBracket} locked readOnly />}
      {tab === 'THIRDS' && <ThirdsTab bracket={bracket} setBracket={setBracket} locked readOnly />}
      {['R32','R16','QF','SF','FINAL'].includes(tab) && (
        <KnockoutTab round={tab} bracket={bracket} fixture={fixture} setBracket={setBracket} locked readOnly />
      )}
      {tab === 'FULL' && <FullBracketTab bracket={bracket} fixture={fixture} />}
    </div>
  );
}
