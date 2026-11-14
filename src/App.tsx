import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Download } from 'lucide-react';
import BreakdownTabs from './components/BreakdownTabs';
import ConfigPanel from './components/ConfigPanel';
import CorridorMap from './components/CorridorMap';
import ModeComparisonTable from './components/ModeComparisonTable';
import {
  DEFAULT_MILEAGE,
  FuelType,
  StateCode,
  VehicleMode,
} from './data/corridorData';
import {
  TripConfig,
  calculateRouteTaxes,
  formatINR,
} from './utils/taxCalculator';

const INITIAL_CONFIG: TripConfig = {
  vehicleMode: 'car',
  carClass: 'private_car',
  truckClass: 'truck_3axle',
  fuelType: 'petrol',
  mileage: DEFAULT_MILEAGE.car.petrol,
  corridor: 'nh48',
  tripType: 'one_way',
  paymentMethod: 'fastag',
  emissionStandard: 'bs6_cng_ev',
  permitType: 'national',
  gstMode: 'rcm_5',
  freightValue: 85000,
  refuelStrategy: 'route_average',
  includeSeaLink: false,
  includeAtalSetu: false,
  isOverloaded: false,
};

export default function App() {
  const [config, setConfig] = useState<TripConfig>(INITIAL_CONFIG);
  const [selectedState, setSelectedState] = useState<StateCode | 'ALL'>('ALL');
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => calculateRouteTaxes(config), [config]);

  const handleUpdateConfig = (updates: Partial<TripConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleVehicleModeChange = (mode: VehicleMode) => {
    const defaultFuel: FuelType = mode === 'truck' ? 'diesel' : 'petrol';
    setConfig((prev) => ({
      ...prev,
      vehicleMode: mode,
      fuelType: defaultFuel,
      mileage: DEFAULT_MILEAGE[mode][defaultFuel],
      includeSeaLink: mode === 'bike' ? false : prev.includeSeaLink,
      includeAtalSetu: mode === 'bike' ? false : prev.includeAtalSetu,
      isOverloaded: mode === 'truck' ? prev.isOverloaded : false,
    }));
  };

  const handleFuelTypeChange = (fuel: FuelType) => {
    setConfig((prev) => ({
      ...prev,
      fuelType: fuel,
      mileage: DEFAULT_MILEAGE[prev.vehicleMode][fuel],
    }));
  };

  const handleReset = () => {
    setConfig(INITIAL_CONFIG);
    setSelectedState('ALL');
  };

  const handleExportCsv = () => {
    const lines: string[] = [
      'Category,Item,State,Highway,Distance Marker (km),Amount (INR)',
      ...summary.plazas.map(
        (p) =>
          `Toll Plaza,"${p.name}",${p.state},${p.highway},${p.kmFromDelhi},${p.appliedRate}`
      ),
      ...summary.fuelByState.map(
        (f) =>
          `Fuel Tax,"Central Excise + State VAT (${f.stateName})",${f.state},Corridor,${f.kmShare},${Math.round(
            f.totalFuelTax
          )}`
      ),
      `Border & Municipal,"Delhi MCD & ECC",DL,Border,0,${summary.delhiMcdAndEcc}`,
      `Border & Permits,"State Border & Permits",ALL,Corridor,${summary.totalDistanceKm},${summary.stateBorderAndPermits}`,
      `GST,"Goods/Passenger GST",ALL,Corridor,${summary.totalDistanceKm},${summary.gstAmount}`,
      `Total,"Grand Total Taxes & Tolls",ALL,All,${summary.totalDistanceKm},${summary.grandTotalTaxAndTolls}`,
    ];

    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `delhi-mumbai-tax-${config.vehicleMode}-${config.corridor}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = async () => {
    const modeLabel =
      config.vehicleMode === 'car'
        ? 'Car / SUV'
        : config.vehicleMode === 'bike'
          ? 'Bike (2-Wheeler)'
          : `Truck (${config.truckClass})`;
    const text = [
      `Delhi -> Mumbai Route Tax & Toll Estimate (${modeLabel})`,
      `Corridor: ${config.corridor === 'nh48' ? 'NH-48 Classic' : 'NE-4 Expressway Hybrid'} (${summary.totalDistanceKm} km)`,
      `Highway & Urban Tolls: ${formatINR(summary.totalTolls)}`,
      `Embedded Fuel Taxes (Excise + VAT): ${formatINR(summary.totalFuelTax)} (Total Fuel Spend: ${formatINR(summary.totalFuelSpend)})`,
      `State Border, MCD ECC & GST: ${formatINR(summary.totalBorderAndGst)}`,
      `Total Taxes & Tolls: ${formatINR(summary.grandTotalTaxAndTolls)} (₹${summary.taxPerKm.toFixed(2)}/km)`,
      `Total Trip Outlay (incl. Fuel): ${formatINR(summary.totalTripOutlay)}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in restricted context; ignore silently
    }
  };

  // Tax composition bar shares
  const totalForBar = Math.max(summary.grandTotalTaxAndTolls, 1);
  const compositionSegments = [
    {
      label: 'Highway & Urban Tolls',
      value: summary.totalTolls,
      colorClass: 'bg-blue-700',
    },
    {
      label: 'Central Fuel Excise',
      value: summary.centralFuelExcise,
      colorClass: 'bg-slate-700',
    },
    {
      label: 'State Fuel VAT',
      value: summary.stateFuelVat,
      colorClass: 'bg-sky-500',
    },
    {
      label: 'Border, Permits & ECC',
      value: summary.delhiMcdAndEcc + summary.stateBorderAndPermits,
      colorClass: 'bg-amber-600',
    },
    {
      label: 'GST (Freight / Cab)',
      value: summary.gstAmount,
      colorClass: 'bg-emerald-600',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 clean zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#calculator"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            MargTax
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#calculator"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Calculator
            </a>
            <a
              href="#corridor"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Corridor
            </a>
            <a
              href="#ledger"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Toll Ledger
            </a>
            <a
              href="#comparison"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Mode Comparison
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main
        id="calculator"
        className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6"
      >
        {/* Page Heading */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              Delhi to Mumbai Route Tax &amp; Toll Estimator
            </h1>
            <p className="text-sm text-slate-600 mt-1.5">
              <span>{summary.totalDistanceKm.toLocaleString('en-IN')} km</span>
              <span aria-hidden="true"> · </span>
              <span>DL, HR, RJ, GJ &amp; MH</span>
              <span aria-hidden="true"> · </span>
              <span>NHAI Tolls, State VAT, MCD ECC &amp; GST</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                Copied Summary
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                Copy Summary
              </>
            )}
          </button>
        </div>

        {/* Dynamic Regulatory / Route Warnings */}
        {(summary.warnings.length > 0 || summary.ewayBillRequired) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            {summary.warnings.map((warning, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="w-4 h-4 text-amber-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{warning}</span>
                </div>
                {config.vehicleMode === 'bike' &&
                  config.corridor === 'ne4_hybrid' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateConfig({ corridor: 'nh48' })}
                      className="px-3 py-1 text-xs font-semibold text-amber-950 bg-amber-200/80 hover:bg-amber-200 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Switch to NH-48
                    </button>
                  )}
              </div>
            ))}
            {summary.ewayBillRequired && (
              <div className="flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle
                  className="w-4 h-4 text-amber-700 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>
                  Inter-state consignment exceeds ₹50,000 — GST E-Way Bill (Form
                  EWB-01) is mandatory before transit across state borders.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Primary 12-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Configuration Column */}
          <div className="lg:col-span-4">
            <ConfigPanel
              config={config}
              onChange={handleUpdateConfig}
              onVehicleModeChange={handleVehicleModeChange}
              onFuelTypeChange={handleFuelTypeChange}
              onReset={handleReset}
            />
          </div>

          {/* Right Live Calculation & Breakdown Viewport */}
          <div className="lg:col-span-8 space-y-6">
            {/* 4-Column Metric Summary Strip */}
            <section
              aria-label="Estimated Tax Totals"
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                <div className="p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Total Taxes &amp; Tolls
                  </div>
                  <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-blue-700">
                    {formatINR(summary.grandTotalTaxAndTolls)}
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    ₹{summary.taxPerKm.toFixed(2)}/km tax burden
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Highway &amp; Urban Tolls
                  </div>
                  <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {formatINR(summary.totalTolls)}
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    {summary.plazas.length} plazas ·{' '}
                    {config.paymentMethod === 'fastag' ? 'FASTag' : 'Cash 2x'}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Embedded Fuel Tax
                  </div>
                  <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {formatINR(summary.totalFuelTax)}
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    Fuel spend: {formatINR(summary.totalFuelSpend)}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Border, ECC &amp; GST
                  </div>
                  <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {formatINR(summary.totalBorderAndGst)}
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    Outlay incl. fuel: {formatINR(summary.totalTripOutlay)}
                  </div>
                </div>
              </div>

              {/* Tax Composition Bar */}
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-slate-700">
                    Tax &amp; Toll Share Distribution
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    100% = {formatINR(summary.grandTotalTaxAndTolls)}
                  </span>
                </div>

                <div
                  className="h-2.5 w-full bg-slate-200 rounded-sm overflow-hidden flex"
                  role="img"
                  aria-label="Tax distribution bar"
                >
                  {compositionSegments.map((seg) => {
                    const pct = (seg.value / totalForBar) * 100;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={seg.label}
                        style={{ width: `${pct}%` }}
                        className={`${seg.colorClass} h-full`}
                        title={`${seg.label}: ${formatINR(seg.value)} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-600">
                  {compositionSegments.map((seg) => {
                    const pct = (seg.value / totalForBar) * 100;
                    return (
                      <div key={seg.label} className="flex items-center gap-1.5">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-xs ${seg.colorClass}`}
                          aria-hidden="true"
                        />
                        <span>{seg.label}</span>
                        <span className="font-mono tabular-nums text-slate-900 font-medium">
                          {formatINR(seg.value)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Interactive Corridor Schematic */}
            <CorridorMap
              corridor={config.corridor}
              selectedState={selectedState}
              onSelectState={setSelectedState}
              plazas={summary.plazas}
            />

            {/* Detailed Interactive Ledger */}
            <BreakdownTabs
              config={config}
              summary={summary}
              selectedState={selectedState}
              onSelectState={setSelectedState}
            />
          </div>
        </div>

        {/* Bottom Cross-Mode Comparison */}
        <ModeComparisonTable
          currentConfig={config}
          onSelectMode={handleVehicleModeChange}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            Indicative NHAI FASTag plaza tariffs, state fuel VAT/excise duties,
            Delhi MCD ECC slabs, and GTA GST rules for the Delhi–Mumbai
            corridor.
          </p>
          <p className="font-mono tabular-nums">
            NH-48 (1,420 km) · NE-4 (1,350 km)
          </p>
        </div>
      </footer>
    </div>
  );
}
