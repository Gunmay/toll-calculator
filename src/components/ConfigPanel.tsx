import { Bike, Car, RotateCcw, Truck } from 'lucide-react';
import {
  CarClass,
  CorridorId,
  DELHI_MCD_ECC_RATES,
  EmissionStandard,
  FuelType,
  GstMode,
  PaymentMethod,
  PermitType,
  RefuelStrategy,
  TripType,
  TruckClass,
  VehicleMode,
} from '../data/corridorData';
import { TripConfig } from '../utils/taxCalculator';

interface ConfigPanelProps {
  config: TripConfig;
  onChange: (updates: Partial<TripConfig>) => void;
  onVehicleModeChange: (mode: VehicleMode) => void;
  onFuelTypeChange: (fuel: FuelType) => void;
  onReset: () => void;
}

export default function ConfigPanel({
  config,
  onChange,
  onVehicleModeChange,
  onFuelTypeChange,
  onReset,
}: ConfigPanelProps) {
  const fuelUnitLabel =
    config.fuelType === 'ev'
      ? 'km/kWh'
      : config.fuelType === 'cng'
        ? 'km/kg'
        : 'km/L';

  const isCommercial =
    config.vehicleMode === 'truck' ||
    (config.vehicleMode === 'car' && config.carClass === 'commercial_cab');

  return (
    <aside
      aria-label="Trip & Tax Parameters"
      className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200"
    >
      {/* Header */}
      <div className="p-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Trip Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adjust vehicle class, route &amp; fuel specs
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>

      {/* 1. Vehicle Mode */}
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Mode of Transportation
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'car', label: 'Car', Icon: Car },
                { id: 'bike', label: 'Bike', Icon: Bike },
                { id: 'truck', label: 'Truck', Icon: Truck },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = config.vehicleMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onVehicleModeChange(id)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-class for Car or Truck */}
        {config.vehicleMode === 'car' && (
          <div>
            <label
              htmlFor="car-class"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Registration Category
            </label>
            <select
              id="car-class"
              value={config.carClass}
              onChange={(e) =>
                onChange({ carClass: e.target.value as CarClass })
              }
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="private_car">Private Car / SUV (White Plate)</option>
              <option value="commercial_cab">
                Commercial Taxi / Cab (Yellow Plate)
              </option>
            </select>
          </div>
        )}

        {config.vehicleMode === 'truck' && (
          <div>
            <label
              htmlFor="truck-class"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Truck Axle &amp; GVW Class
            </label>
            <select
              id="truck-class"
              value={config.truckClass}
              onChange={(e) =>
                onChange({ truckClass: e.target.value as TruckClass })
              }
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {(Object.keys(DELHI_MCD_ECC_RATES) as TruckClass[]).map((key) => (
                <option key={key} value={key}>
                  {DELHI_MCD_ECC_RATES[key].label}
                </option>
              ))}
            </select>
          </div>
        )}

        {config.vehicleMode === 'bike' && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
            Two-wheelers are exempt from NHAI highway tolls on NH-48, but
            incur embedded Central Excise &amp; State VAT on fuel.
          </p>
        )}
      </div>

      {/* 2. Corridor, Trip & Payment */}
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Highway Corridor
          </label>
          <div className="grid grid-cols-1 gap-2">
            {[
              {
                id: 'nh48' as CorridorId,
                title: 'NH-48 Classic Route',
                meta: '1,420 km · Via Jaipur, Udaipur, Ahmedabad',
              },
              {
                id: 'ne4_hybrid' as CorridorId,
                title: 'Delhi–Mumbai Expressway (NE-4)',
                meta: '1,350 km · Via Sohna, Dausa, Kota, Vadodara',
              },
            ].map((route) => {
              const active = config.corridor === route.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => onChange({ corridor: route.id })}
                  className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900">
                    {route.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                    {route.meta}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="trip-type"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Journey Type
            </label>
            <select
              id="trip-type"
              value={config.tripType}
              onChange={(e) =>
                onChange({ tripType: e.target.value as TripType })
              }
              className="w-full h-10 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="one_way">One-Way</option>
              <option value="round_24h">Round Trip (&lt;24h)</option>
              <option value="round_standard">Round Trip (&gt;24h)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Toll Payment
            </label>
            <select
              id="payment-method"
              value={config.paymentMethod}
              onChange={(e) =>
                onChange({ paymentMethod: e.target.value as PaymentMethod })
              }
              disabled={config.vehicleMode === 'bike'}
              className="w-full h-10 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="fastag">FASTag (Standard)</option>
              <option value="cash">Cash (2x Penalty)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Fuel & Mileage */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="fuel-type"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Fuel / Energy
            </label>
            <select
              id="fuel-type"
              value={config.fuelType}
              onChange={(e) => onFuelTypeChange(e.target.value as FuelType)}
              className="w-full h-10 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="cng">CNG</option>
              <option value="ev">Electric (EV)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="mileage-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Efficiency ({fuelUnitLabel})
            </label>
            <input
              id="mileage-input"
              type="number"
              min={0.5}
              max={120}
              step={0.5}
              value={config.mileage}
              onChange={(e) =>
                onChange({ mileage: Math.max(0.5, Number(e.target.value) || 1) })
              }
              className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="refuel-strategy"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Refueling Tax Strategy
          </label>
          <select
            id="refuel-strategy"
            value={config.refuelStrategy}
            onChange={(e) =>
              onChange({ refuelStrategy: e.target.value as RefuelStrategy })
            }
            className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
          >
            <option value="route_average">
              State-by-State Actual Corridor Mix
            </option>
            <option value="cheapest_corridor">
              Optimize Refueling in Low-VAT States (HR / GJ)
            </option>
            <option value="delhi_start">Delhi Pump Rates Baseline</option>
          </select>
        </div>
      </div>

      {/* 4. Commercial, Border & GST Options */}
      {isCommercial && (
        <div className="p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-900">
            Commercial Permits, ECC &amp; GST
          </h3>

          {config.vehicleMode === 'truck' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="emission-std"
                    className="block text-xs font-medium text-slate-600 mb-1.5"
                  >
                    Emission Class
                  </label>
                  <select
                    id="emission-std"
                    value={config.emissionStandard}
                    onChange={(e) =>
                      onChange({
                        emissionStandard: e.target.value as EmissionStandard,
                      })
                    }
                    className="w-full h-10 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="bs6_cng_ev">BS-VI / CNG / EV</option>
                    <option value="bs4_older">BS-IV or Older (2x ECC)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="permit-type"
                    className="block text-xs font-medium text-slate-600 mb-1.5"
                  >
                    Inter-State Permit
                  </label>
                  <select
                    id="permit-type"
                    value={config.permitType}
                    onChange={(e) =>
                      onChange({ permitType: e.target.value as PermitType })
                    }
                    className="w-full h-10 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="national">National Permit</option>
                    <option value="temporary">Temporary State Permits</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.isOverloaded}
                  onChange={(e) => onChange({ isOverloaded: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                Simulate overloaded GVW surcharge (2x NHAI WIM rate)
              </label>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="freight-val"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                {config.vehicleMode === 'truck'
                  ? 'Freight / Cargo Value (₹)'
                  : 'Cab Fare Value (₹)'}
              </label>
              <input
                id="freight-val"
                type="number"
                min={0}
                step={1000}
                value={config.freightValue}
                onChange={(e) =>
                  onChange({
                    freightValue: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="gst-mode"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                GST Regime
              </label>
              <select
                id="gst-mode"
                value={config.gstMode}
                onChange={(e) =>
                  onChange({ gstMode: e.target.value as GstMode })
                }
                className="w-full h-10 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="none">No GST / Exempt</option>
                <option value="rcm_5">
                  {config.vehicleMode === 'truck'
                    ? '5% GST (GTA RCM)'
                    : '5% Cab GST'}
                </option>
                {config.vehicleMode === 'truck' && (
                  <option value="fcm_12">12% GST (GTA FCM + ITC)</option>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 5. Mumbai Urban Connectors */}
      {config.vehicleMode !== 'bike' && (
        <div className="p-5 space-y-2.5">
          <span className="block text-xs font-semibold text-slate-700">
            Mumbai City Connectors (Optional)
          </span>
          <label className="flex items-center justify-between gap-2 text-xs text-slate-700 cursor-pointer select-none py-1">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.includeSeaLink}
                onChange={(e) =>
                  onChange({ includeSeaLink: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              Bandra–Worli Sea Link
            </span>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {config.vehicleMode === 'car' ? '₹100' : '₹160–210'}
            </span>
          </label>
          <label className="flex items-center justify-between gap-2 text-xs text-slate-700 cursor-pointer select-none py-1">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.includeAtalSetu}
                onChange={(e) =>
                  onChange({ includeAtalSetu: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              Atal Setu (MTHL)
            </span>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {config.vehicleMode === 'car' ? '₹250' : '₹400–830'}
            </span>
          </label>
        </div>
      )}
    </aside>
  );
}
