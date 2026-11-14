import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  DELHI_MCD_ECC_RATES,
  STATE_PROFILES,
  StateCode,
} from '../data/corridorData';
import { TaxSummary, TripConfig, formatINR } from '../utils/taxCalculator';

interface BreakdownTabsProps {
  config: TripConfig;
  summary: TaxSummary;
  selectedState: StateCode | 'ALL';
  onSelectState: (state: StateCode | 'ALL') => void;
}

type ActiveTab = 'tolls' | 'fuel' | 'compliance';

export default function BreakdownTabs({
  config,
  summary,
  selectedState,
  onSelectState,
}: BreakdownTabsProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tolls');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlazas = useMemo(() => {
    return summary.plazas.filter((plaza) => {
      const matchesState =
        selectedState === 'ALL' || plaza.state === selectedState;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        plaza.name.toLowerCase().includes(q) ||
        plaza.highway.toLowerCase().includes(q) ||
        (plaza.note && plaza.note.toLowerCase().includes(q));
      return matchesState && matchesSearch;
    });
  }, [summary.plazas, selectedState, searchQuery]);

  const fuelUnitShort =
    config.fuelType === 'ev'
      ? 'kWh'
      : config.fuelType === 'cng'
        ? 'kg'
        : 'L';

  return (
    <section
      id="ledger"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Tab Header */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Tax breakdown views"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          {(
            [
              { id: 'tolls', label: `Toll Ledger (${summary.plazas.length})` },
              { id: 'fuel', label: 'Fuel & State VAT' },
              { id: 'compliance', label: 'Statutory Rules' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'tolls' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter plaza..."
                aria-label="Filter toll plazas"
                className="h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-44"
              />
            </div>

            <select
              aria-label="Filter by state"
              value={selectedState}
              onChange={(e) =>
                onSelectState(e.target.value as StateCode | 'ALL')
              }
              className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All States</option>
              <option value="HR">Haryana (HR)</option>
              <option value="RJ">Rajasthan (RJ)</option>
              <option value="GJ">Gujarat (GJ)</option>
              <option value="MH">Maharashtra (MH)</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Toll Plaza Ledger */}
      {activeTab === 'tolls' && (
        <div className="overflow-x-auto">
          {filteredPlazas.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-900">
                No toll plazas match your current filter
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Clear the state filter or search query to inspect all plazas.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  onSelectState('ALL');
                }}
                className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Plaza / Section</th>
                  <th className="py-2.5 px-3">Highway</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3 text-right">Marker</th>
                  <th className="py-2.5 px-3 text-right">1-Way Rate</th>
                  <th className="py-2.5 px-4 text-right">Applied Toll</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPlazas.map((plaza) => (
                  <tr
                    key={plaza.id}
                    className="hover:bg-slate-50/90 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">
                        {plaza.name}
                      </div>
                      {plaza.note && (
                        <div className="text-[11px] text-slate-500">
                          {plaza.note}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {plaza.highway}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {STATE_PROFILES[plaza.state].name}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {plaza.kmFromDelhi} km
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                      {formatINR(plaza.baseRate)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(plaza.appliedRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900">
                  <td colSpan={4} className="py-3 px-4">
                    Filtered Highway Plazas ({filteredPlazas.length})
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                    {formatINR(
                      filteredPlazas.reduce((s, p) => s + p.baseRate, 0)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-700">
                    {formatINR(
                      filteredPlazas.reduce((s, p) => s + p.appliedRate, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Fuel & State VAT */}
      {activeTab === 'fuel' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">State</th>
                <th className="py-2.5 px-3 text-right">Distance</th>
                <th className="py-2.5 px-3 text-right">
                  Volume ({fuelUnitShort})
                </th>
                <th className="py-2.5 px-3 text-right">Pump Rate</th>
                <th className="py-2.5 px-3 text-right">Central Excise</th>
                <th className="py-2.5 px-3 text-right">State VAT</th>
                <th className="py-2.5 px-4 text-right">Total Fuel Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {summary.fuelByState.map((row) => (
                <tr key={row.state} className="hover:bg-slate-50/90">
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    {row.stateName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {row.kmShare} km
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {row.fuelUnits.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    ₹{row.pumpPrice.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(row.centralExcise)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(row.stateVat)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {formatINR(row.totalFuelTax)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900">
                <td className="py-3 px-4">Total Corridor Fuel Taxes</td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  {summary.totalDistanceKm} km
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  {summary.fuelByState
                    .reduce((s, r) => s + r.fuelUnits, 0)
                    .toFixed(1)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                  Spend: {formatINR(summary.totalFuelSpend)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  {formatINR(summary.centralFuelExcise)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  {formatINR(summary.stateFuelVat)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-700">
                  {formatINR(summary.totalFuelTax)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Tab 3: Statutory & Compliance Rules */}
      {activeTab === 'compliance' && (
        <div id="guide" className="p-5 divide-y divide-slate-100 space-y-4">
          <div className="pb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              1. NHAI Toll Rules &amp; Vehicle Exemptions
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Under the National Highways Fee (Determination of Rates and
              Collection) Rules, two-wheelers are exempt at open NH-48 toll
              plazas, whereas private cars, commercial cabs, and multi-axle
              trucks pay axle-graded tariffs. Paying in cash without an active
              FASTag triggers a mandatory 2x penalty at every plaza.
            </p>
          </div>

          <div className="py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              2. Delhi MCD Toll &amp; Environment Compensation Charge (ECC)
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Private cars and two-wheelers do not pay Delhi MCD border tolls.
              Commercial cabs and goods trucks crossing Delhi NCT borders are
              levied MCD Toll plus Supreme Court–mandated ECC (₹
              {DELHI_MCD_ECC_RATES[config.truckClass].eccBs6}–₹
              {DELHI_MCD_ECC_RATES[config.truckClass].eccOlder} depending on
              axle class and BS-VI compliance).
            </p>
          </div>

          <div className="py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              3. Inter-State Permits, Checkposts &amp; GST E-Way Bill
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Commercial goods transport between Delhi, Haryana, Rajasthan,
              Gujarat, and Maharashtra requires either a valid National Permit
              or state-wise temporary permits at border checkposts. For
              inter-state cargo exceeding ₹50,000 in consignment value, a GST
              E-Way Bill is mandatory before dispatch, alongside 5% RCM or 12%
              FCM GTA GST.
            </p>
          </div>

          <div className="pt-4">
            <h3 className="text-sm font-semibold text-slate-900">
              4. Embedded Fuel Excise &amp; State VAT Strategy
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Petrol and diesel remain outside GST. Every litre includes Central
              Excise + Road &amp; Infra Cess (₹19.90/L petrol, ₹15.80/L diesel)
              plus State VAT ranging from ~13.7% in Gujarat to ~26% in
              Rajasthan. Refueling in Haryana or Gujarat noticeably lowers
              indirect fuel tax on long hauls.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
