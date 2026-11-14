import { DEFAULT_MILEAGE, VehicleMode } from '../data/corridorData';
import {
  TripConfig,
  calculateRouteTaxes,
  formatINR,
} from '../utils/taxCalculator';

interface ModeComparisonTableProps {
  currentConfig: TripConfig;
  onSelectMode: (mode: VehicleMode) => void;
}

export default function ModeComparisonTable({
  currentConfig,
  onSelectMode,
}: ModeComparisonTableProps) {
  const modes: {
    mode: VehicleMode;
    label: string;
    spec: string;
    fuel: 'petrol' | 'diesel';
  }[] = [
    {
      mode: 'bike',
      label: 'Bike (Two-Wheeler)',
      spec: 'Petrol · 42 km/L · NHAI Toll Exempt',
      fuel: 'petrol',
    },
    {
      mode: 'car',
      label: 'Car / SUV (Private LMV)',
      spec: 'Petrol · 16 km/L · FASTag Standard',
      fuel: 'petrol',
    },
    {
      mode: 'truck',
      label: 'Truck (3-Axle Commercial)',
      spec: 'Diesel · 4.2 km/L · National Permit + ECC',
      fuel: 'diesel',
    },
  ];

  const rows = modes.map((item) => {
    const sampleConfig: TripConfig = {
      ...currentConfig,
      vehicleMode: item.mode,
      fuelType:
        currentConfig.vehicleMode === item.mode
          ? currentConfig.fuelType
          : item.fuel,
      mileage:
        currentConfig.vehicleMode === item.mode
          ? currentConfig.mileage
          : DEFAULT_MILEAGE[item.mode][item.fuel],
      corridor:
        item.mode === 'bike' && currentConfig.corridor === 'ne4_hybrid'
          ? 'nh48'
          : currentConfig.corridor,
      truckClass:
        currentConfig.vehicleMode === 'truck'
          ? currentConfig.truckClass
          : 'truck_3axle',
    };
    const result = calculateRouteTaxes(sampleConfig);
    return { ...item, result };
  });

  return (
    <section
      id="comparison"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Cross-Mode Tax Comparison (Delhi to Mumbai)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Side-by-side tax incidence for Bike, Car, and Truck on the selected
            corridor. Click any row to load that mode.
          </p>
        </div>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          {currentConfig.tripType === 'one_way' ? 'One-Way' : 'Round Trip'}
          <span aria-hidden="true"> · </span>
          {currentConfig.paymentMethod === 'fastag' ? 'FASTag' : 'Cash 2x'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
              <th className="py-2.5 px-5">Vehicle Mode</th>
              <th className="py-2.5 px-3 text-right">Highway Tolls</th>
              <th className="py-2.5 px-3 text-right">Border, ECC &amp; GST</th>
              <th className="py-2.5 px-3 text-right">Fuel Excise &amp; VAT</th>
              <th className="py-2.5 px-3 text-right">Total Tax Paid</th>
              <th className="py-2.5 px-5 text-right">Tax / km</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {rows.map(({ mode, label, spec, result }) => {
              const isCurrent = currentConfig.vehicleMode === mode;
              return (
                <tr
                  key={mode}
                  onClick={() => onSelectMode(mode)}
                  className={`cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-blue-50/60 hover:bg-blue-50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3 px-5">
                    <div className="font-semibold text-slate-900">
                      {label}
                      {isCurrent && (
                        <span className="ml-2 text-[11px] font-medium text-blue-700">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {spec}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(result.totalTolls)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(result.totalBorderAndGst)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(result.totalFuelTax)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {formatINR(result.grandTotalTaxAndTolls)}
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-slate-600">
                    ₹{result.taxPerKm.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
