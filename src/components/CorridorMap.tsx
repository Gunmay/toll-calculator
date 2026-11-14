import { CorridorId, STATE_PROFILES, StateCode } from '../data/corridorData';
import { ComputedTollRow, formatINR } from '../utils/taxCalculator';

interface CorridorMapProps {
  corridor: CorridorId;
  selectedState: StateCode | 'ALL';
  onSelectState: (state: StateCode | 'ALL') => void;
  plazas: ComputedTollRow[];
}

const CORRIDOR_STATES: { code: StateCode; city: string }[] = [
  { code: 'DL', city: 'New Delhi' },
  { code: 'HR', city: 'Gurugram / Sohna' },
  { code: 'RJ', city: 'Jaipur / Kota / Udaipur' },
  { code: 'GJ', city: 'Ahmedabad / Vadodara / Surat' },
  { code: 'MH', city: 'Palghar / Mumbai' },
];

export default function CorridorMap({
  corridor,
  selectedState,
  onSelectState,
  plazas,
}: CorridorMapProps) {
  return (
    <section
      id="corridor"
      aria-label="Delhi to Mumbai Route Corridor"
      className="bg-white border border-slate-200 rounded-xl p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            State-by-State Corridor Breakdown
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {corridor === 'nh48'
              ? 'NH-48 Classic via Jaipur, Udaipur, Ahmedabad & Surat'
              : 'Delhi–Mumbai Expressway (NE-4) via Dausa, Kota & Vadodara'}
            <span aria-hidden="true"> · </span>
            Click a state segment to filter the toll ledger
          </p>
        </div>
        {selectedState !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelectState('ALL')}
            className="text-xs font-medium text-blue-700 hover:text-blue-900 underline underline-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Show all 5 states
          </button>
        )}
      </div>

      {/* Horizontal corridor strip */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {CORRIDOR_STATES.map((item, idx) => {
          const profile = STATE_PROFILES[item.code];
          const km =
            corridor === 'ne4_hybrid'
              ? profile.corridorKmNe4
              : profile.corridorKmNh48;
          const statePlazas = plazas.filter((p) => p.state === item.code);
          const stateTollTotal = statePlazas.reduce(
            (sum, p) => sum + p.appliedRate,
            0
          );
          const isSelected = selectedState === item.code;

          return (
            <button
              key={item.code}
              type="button"
              onClick={() => onSelectState(isSelected ? 'ALL' : item.code)}
              className={`text-left p-3 rounded-lg border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-slate-900">
                  {idx + 1}. {profile.name}
                </span>
                <span className="font-mono text-[11px] font-medium text-slate-500 tabular-nums">
                  {item.code}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 truncate mb-2.5">
                {item.city}
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-baseline justify-between gap-1">
                <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                  {formatINR(stateTollTotal)}
                </span>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {km} km · {statePlazas.length}{' '}
                  {statePlazas.length === 1 ? 'plaza' : 'plazas'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
