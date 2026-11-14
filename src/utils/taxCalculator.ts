import {
  CENTRAL_FUEL_EXCISE,
  CarClass,
  CorridorId,
  DELHI_MCD_ECC_RATES,
  EmissionStandard,
  FuelType,
  GstMode,
  MUMBAI_URBAN_ADDONS,
  NE4_PLAZAS,
  NH48_PLAZAS,
  PaymentMethod,
  PermitType,
  RefuelStrategy,
  STATE_PROFILES,
  StateCode,
  TollPlaza,
  TripType,
  TruckClass,
  VehicleMode,
} from '../data/corridorData';

export interface TripConfig {
  vehicleMode: VehicleMode;
  carClass: CarClass;
  truckClass: TruckClass;
  fuelType: FuelType;
  mileage: number; // km per L, kg, or kWh
  corridor: CorridorId;
  tripType: TripType;
  paymentMethod: PaymentMethod;
  emissionStandard: EmissionStandard;
  permitType: PermitType;
  gstMode: GstMode;
  freightValue: number; // INR consignment or fare value
  refuelStrategy: RefuelStrategy;
  includeSeaLink: boolean;
  includeAtalSetu: boolean;
  isOverloaded: boolean;
}

export interface ComputedTollRow {
  id: string;
  name: string;
  highway: 'NH-48' | 'NE-4' | 'Urban';
  state: StateCode;
  kmFromDelhi: number;
  baseRate: number;
  appliedRate: number;
  note?: string;
}

export interface StateFuelBreakdown {
  state: StateCode;
  stateName: string;
  kmShare: number;
  fuelUnits: number;
  pumpPrice: number;
  fuelSpend: number;
  centralExcise: number;
  stateVat: number;
  totalFuelTax: number;
}

export interface TaxSummary {
  totalDistanceKm: number;
  effectiveOneWayKm: number;
  highwayTollsTotal: number;
  urbanAddonsTotal: number;
  totalTolls: number;
  delhiMcdAndEcc: number;
  stateBorderAndPermits: number;
  gstAmount: number;
  totalBorderAndGst: number;
  totalFuelSpend: number;
  centralFuelExcise: number;
  stateFuelVat: number;
  totalFuelTax: number;
  grandTotalTaxAndTolls: number;
  totalTripOutlay: number; // fuel spend + tolls + border/GST
  taxPerKm: number;
  plazas: ComputedTollRow[];
  fuelByState: StateFuelBreakdown[];
  warnings: string[];
  ewayBillRequired: boolean;
}

function getBaseRateForVehicle(plaza: TollPlaza, config: TripConfig): number {
  if (config.vehicleMode === 'bike') {
    return 0;
  }
  if (config.vehicleMode === 'car') {
    return plaza.carRate;
  }
  switch (config.truckClass) {
    case 'lcv_2axle':
      return plaza.lcvRate;
    case 'truck_2axle':
      return plaza.truck2AxleRate;
    case 'truck_3axle':
      return plaza.truck3AxleRate;
    case 'mav_4_6axle':
      return plaza.mavRate;
    case 'oversized_7axle':
      return plaza.oversizedRate;
  }
}

export function calculateRouteTaxes(config: TripConfig): TaxSummary {
  const warnings: string[] = [];
  const rawPlazas = config.corridor === 'ne4_hybrid' ? NE4_PLAZAS : NH48_PLAZAS;
  const oneWayKm = config.corridor === 'ne4_hybrid' ? 1350 : 1420;
  const isRoundTrip = config.tripType !== 'one_way';
  const totalDistanceKm = isRoundTrip ? oneWayKm * 2 : oneWayKm;

  if (config.vehicleMode === 'bike' && config.corridor === 'ne4_hybrid') {
    warnings.push(
      'Two-wheelers are prohibited on the access-controlled Delhi–Mumbai Expressway (NE-4). Switch to NH-48 Classic for a legal bike route.'
    );
  }
  if (config.vehicleMode === 'bike' && (config.includeSeaLink || config.includeAtalSetu)) {
    warnings.push('Two-wheelers are prohibited on Bandra–Worli Sea Link and Atal Setu (MTHL).');
  }
  if (config.vehicleMode === 'truck' && config.includeSeaLink) {
    warnings.push('Heavy goods trucks are restricted on Bandra–Worli Sea Link; heavy freight must use Western Express Highway / arterial routes.');
  }
  if (config.vehicleMode !== 'bike' && config.paymentMethod === 'cash') {
    warnings.push('Cash / Non-FASTag lanes incur a statutory 2x toll penalty across NHAI plazas.');
  }
  if (config.vehicleMode === 'truck' && config.isOverloaded) {
    warnings.push('Overloading beyond permissible GVW attracts up to 10x penalty at NHAI weigh-in-motion toll plazas (modeled at 2x conservative surcharge here).');
  }

  // 1. Compute Toll Plazas
  const cashMultiplier = config.paymentMethod === 'cash' ? 2 : 1;
  const overloadMultiplier = config.vehicleMode === 'truck' && config.isOverloaded ? 2 : 1;

  const plazas: ComputedTollRow[] = rawPlazas.map((plaza) => {
    const baseRate = getBaseRateForVehicle(plaza, config);
    let tripMultiplier = 1;
    if (config.tripType === 'round_24h') {
      tripMultiplier = plaza.return24hMultiplier;
    } else if (config.tripType === 'round_standard') {
      tripMultiplier = 2;
    }

    const appliedRate = Math.round(baseRate * tripMultiplier * cashMultiplier * overloadMultiplier);
    return {
      id: plaza.id,
      name: plaza.name,
      highway: plaza.highway,
      state: plaza.state,
      kmFromDelhi: plaza.kmFromDelhi,
      baseRate,
      appliedRate,
      note: plaza.note,
    };
  });

  const highwayTollsTotal = plazas.reduce((sum, p) => sum + p.appliedRate, 0);

  // Urban Addons
  let urbanAddonsTotal = 0;
  const urbanMultiplier = config.tripType === 'one_way' ? 1 : 2;
  if (config.vehicleMode !== 'bike') {
    if (config.includeSeaLink) {
      const rate =
        config.vehicleMode === 'car'
          ? MUMBAI_URBAN_ADDONS.bandraWorliSeaLink.carRate
          : config.truckClass === 'lcv_2axle'
            ? MUMBAI_URBAN_ADDONS.bandraWorliSeaLink.lcvRate
            : MUMBAI_URBAN_ADDONS.bandraWorliSeaLink.truckRate;
      urbanAddonsTotal += rate * urbanMultiplier;
    }
    if (config.includeAtalSetu) {
      const rate =
        config.vehicleMode === 'car'
          ? MUMBAI_URBAN_ADDONS.atalSetuMthl.carRate
          : config.truckClass === 'lcv_2axle'
            ? MUMBAI_URBAN_ADDONS.atalSetuMthl.lcvRate
            : MUMBAI_URBAN_ADDONS.atalSetuMthl.truckRate;
      urbanAddonsTotal += rate * urbanMultiplier;
    }
  }

  const totalTolls = highwayTollsTotal + urbanAddonsTotal;

  // 2. State Border Taxes & Delhi MCD/ECC
  let delhiMcdAndEcc = 0;
  let stateBorderAndPermits = 0;
  const borderMultiplier = isRoundTrip ? 2 : 1;

  if (config.vehicleMode === 'car' && config.carClass === 'commercial_cab') {
    // Commercial cab pays state entry tax when crossing HR, RJ, GJ, MH + Delhi MCD on return
    delhiMcdAndEcc = STATE_PROFILES.DL.commercialCabBorderTax * (isRoundTrip ? 2 : 1);
    stateBorderAndPermits =
      (STATE_PROFILES.HR.commercialCabBorderTax +
        STATE_PROFILES.RJ.commercialCabBorderTax +
        STATE_PROFILES.GJ.commercialCabBorderTax +
        STATE_PROFILES.MH.commercialCabBorderTax) *
      borderMultiplier;
  } else if (config.vehicleMode === 'truck') {
    const mcdData = DELHI_MCD_ECC_RATES[config.truckClass];
    const ecc =
      config.emissionStandard === 'bs6_cng_ev' ? mcdData.eccBs6 : mcdData.eccOlder;
    // Outbound from Delhi + Inbound back if round trip (ECC charged per entry into Delhi; MCD toll per crossing)
    delhiMcdAndEcc = (mcdData.mcdToll + ecc) * (isRoundTrip ? 2 : 1);

    const statesCrossed: StateCode[] = ['HR', 'RJ', 'GJ', 'MH'];
    for (const st of statesCrossed) {
      const profile = STATE_PROFILES[st];
      stateBorderAndPermits += profile.truckBorderCheckpostFee * borderMultiplier;
      if (config.permitType === 'temporary') {
        stateBorderAndPermits += profile.truckTempPermitPerTrip * borderMultiplier;
      }
    }
  }

  // 3. GST Calculation
  let gstAmount = 0;
  if (config.vehicleMode === 'truck') {
    if (config.gstMode === 'rcm_5') {
      gstAmount = Math.round(config.freightValue * 0.05);
    } else if (config.gstMode === 'fcm_12') {
      gstAmount = Math.round(config.freightValue * 0.12);
    }
  } else if (config.vehicleMode === 'car' && config.carClass === 'commercial_cab') {
    if (config.gstMode !== 'none') {
      gstAmount = Math.round(config.freightValue * 0.05);
    }
  }

  const ewayBillRequired =
    config.vehicleMode === 'truck' && config.freightValue > 50000;

  const totalBorderAndGst = delhiMcdAndEcc + stateBorderAndPermits + gstAmount;

  // 4. Fuel & Embedded Fuel Tax (Central Excise + State VAT)
  const safeMileage = Math.max(config.mileage || 1, 0.5);
  const stateOrder: StateCode[] = ['DL', 'HR', 'RJ', 'GJ', 'MH'];

  const fuelByState: StateFuelBreakdown[] = stateOrder.map((code) => {
    const profile = STATE_PROFILES[code];
    const baseKm = config.corridor === 'ne4_hybrid' ? profile.corridorKmNe4 : profile.corridorKmNh48;
    const kmShare = isRoundTrip ? baseKm * 2 : baseKm;
    const fuelUnits = kmShare / safeMileage;

    let effectiveProfile = profile;
    if (config.refuelStrategy === 'delhi_start') {
      effectiveProfile = STATE_PROFILES.DL;
    } else if (config.refuelStrategy === 'cheapest_corridor') {
      // Simulate refueling strategically in DL/HR/GJ (lowest VAT states along corridor)
      effectiveProfile = code === 'RJ' ? STATE_PROFILES.HR : code === 'MH' ? STATE_PROFILES.GJ : profile;
    }

    let pumpPrice = effectiveProfile.petrolPrice;
    let centralExcisePerUnit = CENTRAL_FUEL_EXCISE.petrolPerLitre;
    let stateVatPerUnit = 0;

    if (config.fuelType === 'petrol') {
      pumpPrice = effectiveProfile.petrolPrice;
      centralExcisePerUnit = CENTRAL_FUEL_EXCISE.petrolPerLitre;
      // Retail Price = (Base + Excise + Dealer Commission) * (1 + VAT%)
      stateVatPerUnit = pumpPrice - pumpPrice / (1 + effectiveProfile.petrolVatRate / 100);
    } else if (config.fuelType === 'diesel') {
      pumpPrice = effectiveProfile.dieselPrice;
      centralExcisePerUnit = CENTRAL_FUEL_EXCISE.dieselPerLitre;
      stateVatPerUnit = pumpPrice - pumpPrice / (1 + effectiveProfile.dieselVatRate / 100);
    } else if (config.fuelType === 'cng') {
      pumpPrice = effectiveProfile.cngPrice;
      centralExcisePerUnit = pumpPrice * (CENTRAL_FUEL_EXCISE.cngTaxPercent / 100);
      stateVatPerUnit = 0; // CNG VAT exempt/minimal in most corridor states
    } else {
      // EV charging
      pumpPrice = effectiveProfile.evRatePerKwh;
      centralExcisePerUnit = pumpPrice * (CENTRAL_FUEL_EXCISE.evGstPercent / 100);
      stateVatPerUnit = 0;
    }

    const fuelSpend = fuelUnits * pumpPrice;
    const centralExcise = fuelUnits * centralExcisePerUnit;
    const stateVat = fuelUnits * stateVatPerUnit;

    return {
      state: code,
      stateName: profile.name,
      kmShare,
      fuelUnits,
      pumpPrice,
      fuelSpend,
      centralExcise,
      stateVat,
      totalFuelTax: centralExcise + stateVat,
    };
  });

  const totalFuelSpend = Math.round(fuelByState.reduce((s, r) => s + r.fuelSpend, 0));
  const centralFuelExcise = Math.round(fuelByState.reduce((s, r) => s + r.centralExcise, 0));
  const stateFuelVat = Math.round(fuelByState.reduce((s, r) => s + r.stateVat, 0));
  const totalFuelTax = centralFuelExcise + stateFuelVat;

  const grandTotalTaxAndTolls = totalTolls + totalBorderAndGst + totalFuelTax;
  const totalTripOutlay = totalTolls + totalBorderAndGst + totalFuelSpend;
  const taxPerKm = totalDistanceKm > 0 ? grandTotalTaxAndTolls / totalDistanceKm : 0;

  return {
    totalDistanceKm,
    effectiveOneWayKm: oneWayKm,
    highwayTollsTotal,
    urbanAddonsTotal,
    totalTolls,
    delhiMcdAndEcc,
    stateBorderAndPermits,
    gstAmount,
    totalBorderAndGst,
    totalFuelSpend,
    centralFuelExcise,
    stateFuelVat,
    totalFuelTax,
    grandTotalTaxAndTolls,
    totalTripOutlay,
    taxPerKm,
    plazas,
    fuelByState,
    warnings,
    ewayBillRequired,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}
