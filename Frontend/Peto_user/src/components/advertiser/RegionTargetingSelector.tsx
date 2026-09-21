import React, { useState, useMemo } from "react";
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  X,
  Globe2,
} from "lucide-react";
import { GEO_REGIONS } from "../../data/geoRegions";
import type { CountryData, StateData } from "../../data/geoRegions";

export interface RegionTargetingSelectorProps {
  selectedCountries: string[];
  selectedRegions: string[];
  onChange: (data: { countries: string[]; regions: string[] }) => void;
}

export const RegionTargetingSelector: React.FC<RegionTargetingSelectorProps> = ({
  selectedCountries,
  selectedRegions,
  onChange,
}) => {
  const availableCountries = useMemo(() => Object.values(GEO_REGIONS), []);
  const [activeCountryCode, setActiveCountryCode] = useState<string>(
    selectedCountries[0] || "IN"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({
    // Default expand first state of active country
    MH: true,
  });

  const activeCountry: CountryData =
    GEO_REGIONS[activeCountryCode] || availableCountries[0];

  // Helper to format region keys
  // District key: `${countryCode}:${stateCode}:${districtName}`
  // State all key: `${countryCode}:${stateCode}:ALL`
  const getDistrictKey = (countryCode: string, stateCode: string, district: string) =>
    `${countryCode}:${stateCode}:${district}`;

  const getStateAllKey = (countryCode: string, stateCode: string) =>
    `${countryCode}:${stateCode}:ALL`;

  // Check if a country is selected
  const isCountrySelected = (countryCode: string) =>
    selectedCountries.includes(countryCode);

  // Toggle country inclusion
  const toggleCountry = (countryCode: string) => {
    let nextCountries: string[];
    let nextRegions = [...selectedRegions];

    if (isCountrySelected(countryCode)) {
      nextCountries = selectedCountries.filter((c) => c !== countryCode);
      // Also remove all regions belonging to this country
      nextRegions = nextRegions.filter((r) => !r.startsWith(`${countryCode}:`));
    } else {
      nextCountries = [...selectedCountries, countryCode];
    }

    if (nextCountries.length > 0 && !nextCountries.includes(activeCountryCode)) {
      setActiveCountryCode(nextCountries[0]);
    }

    onChange({
      countries: nextCountries,
      regions: nextRegions,
    });
  };

  // Check state status: 'ALL' | 'SOME' | 'NONE'
  const getStateStatus = (countryCode: string, state: StateData): "ALL" | "SOME" | "NONE" => {
    const allKey = getStateAllKey(countryCode, state.code);
    if (selectedRegions.includes(allKey)) return "ALL";

    const selectedDistrictsInState = state.districts.filter((d) =>
      selectedRegions.includes(getDistrictKey(countryCode, state.code, d))
    );

    if (selectedDistrictsInState.length === 0) return "NONE";
    if (selectedDistrictsInState.length === state.districts.length) return "ALL";
    return "SOME";
  };

  // Toggle entire state (all districts)
  const toggleState = (countryCode: string, state: StateData) => {
    // Ensure country is selected
    const nextCountries = isCountrySelected(countryCode)
      ? selectedCountries
      : [...selectedCountries, countryCode];

    const currentStatus = getStateStatus(countryCode, state);
    const allKey = getStateAllKey(countryCode, state.code);
    const districtKeys = state.districts.map((d) => getDistrictKey(countryCode, state.code, d));

    let nextRegions = selectedRegions.filter(
      (r) => r !== allKey && !districtKeys.includes(r)
    );

    if (currentStatus !== "ALL") {
      // Select all for this state
      nextRegions.push(allKey);
      nextRegions.push(...districtKeys);
    }

    onChange({
      countries: nextCountries,
      regions: nextRegions,
    });
  };

  // Toggle specific district
  const toggleDistrict = (countryCode: string, state: StateData, district: string) => {
    // Ensure country is selected
    const nextCountries = isCountrySelected(countryCode)
      ? selectedCountries
      : [...selectedCountries, countryCode];

    const dKey = getDistrictKey(countryCode, state.code, district);
    const allKey = getStateAllKey(countryCode, state.code);
    const isSelected = selectedRegions.includes(dKey);

    let nextRegions = [...selectedRegions];

    if (isSelected) {
      // Deselect district
      nextRegions = nextRegions.filter((r) => r !== dKey && r !== allKey);
    } else {
      // Select district
      nextRegions.push(dKey);
      // Check if all districts in this state are now selected
      const allSelected = state.districts.every(
        (d) => d === district || nextRegions.includes(getDistrictKey(countryCode, state.code, d))
      );
      if (allSelected && !nextRegions.includes(allKey)) {
        nextRegions.push(allKey);
      }
    }

    onChange({
      countries: nextCountries,
      regions: nextRegions,
    });
  };

  // Select all states and districts for active country
  const selectEntireCountry = (country: CountryData) => {
    const nextCountries = isCountrySelected(country.code)
      ? selectedCountries
      : [...selectedCountries, country.code];

    let nextRegions = selectedRegions.filter((r) => !r.startsWith(`${country.code}:`));

    country.states.forEach((state) => {
      nextRegions.push(getStateAllKey(country.code, state.code));
      state.districts.forEach((d) => {
        nextRegions.push(getDistrictKey(country.code, state.code, d));
      });
    });

    onChange({
      countries: nextCountries,
      regions: nextRegions,
    });
  };

  // Clear active country targets
  const clearCountryTargets = (countryCode: string) => {
    const nextRegions = selectedRegions.filter((r) => !r.startsWith(`${countryCode}:`));
    onChange({
      countries: selectedCountries,
      regions: nextRegions,
    });
  };

  // Remove a specific region badge
  const removeRegion = (regionKey: string) => {
    const nextRegions = selectedRegions.filter((r) => r !== regionKey);
    onChange({
      countries: selectedCountries,
      regions: nextRegions,
    });
  };

  // Filtered states based on search query
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return activeCountry.states;
    const query = searchQuery.toLowerCase().trim();

    return activeCountry.states
      .map((state) => {
        const stateMatches = state.name.toLowerCase().includes(query);
        const matchedDistricts = state.districts.filter((d) =>
          d.toLowerCase().includes(query)
        );

        if (stateMatches) {
          return state;
        }

        if (matchedDistricts.length > 0) {
          return {
            ...state,
            districts: matchedDistricts,
          };
        }

        return null;
      })
      .filter((s): s is StateData => s !== null);
  }, [activeCountry, searchQuery]);

  // Selected regions summary counts
  const summary = useMemo(() => {
    let stateCount = 0;
    let districtCount = 0;

    const districtKeys = selectedRegions.filter((r) => !r.endsWith(":ALL"));
    districtCount = districtKeys.length;

    // Count unique states
    const statesSet = new Set<string>();
    selectedRegions.forEach((r) => {
      const parts = r.split(":");
      if (parts.length >= 2) {
        statesSet.add(`${parts[0]}:${parts[1]}`);
      }
    });
    stateCount = statesSet.size;

    return {
      countries: selectedCountries.length,
      states: stateCount,
      districts: districtCount,
    };
  }, [selectedCountries, selectedRegions]);

  return (
    <div className="space-y-4">
      {/* Header & Quick stats */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Globe2 size={16} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Target Geography & Drill-Down
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Targeting:</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {summary.countries} {summary.countries === 1 ? "Country" : "Countries"}
            </span>
            {summary.states > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                {summary.states} {summary.states === 1 ? "State" : "States"}
              </span>
            )}
            {summary.districts > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {summary.districts} {summary.districts === 1 ? "District" : "Districts"}
              </span>
            )}
          </div>
        </div>

        {/* Selected Countries Selector Bar */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-2">
            1. Select Target Countries:
          </label>
          <div className="flex flex-wrap gap-2">
            {availableCountries.map((c) => {
              const isSelected = isCountrySelected(c.code);
              const isActive = activeCountryCode === c.code;

              return (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => {
                    if (!isSelected) {
                      toggleCountry(c.code);
                    }
                    setActiveCountryCode(c.code);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? isActive
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-300"
                        : "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm">{c.flag}</span>
                  <span>{c.name}</span>
                  {isSelected && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCountry(c.code);
                      }}
                      className="ml-1 hover:text-red-300 transition-colors"
                      title="Remove country"
                    >
                      ×
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* State & District Explorer for Active Country */}
      {activeCountry && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeCountry.flag}</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {activeCountry.name} - States & Districts Drill-Down
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select individual states or expand to select specific districts/cities.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectEntireCountry(activeCountry)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition"
              >
                Select All in {activeCountry.name}
              </button>
              <button
                type="button"
                onClick={() => clearCountryTargets(activeCountry.code)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search bar inside country */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search states or districts in ${activeCountry.name} (e.g. Mumbai, Pune, Ernakulam, Austin)...`}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* States Accordion List */}
          <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredStates.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No states or districts matched "{searchQuery}" in {activeCountry.name}.
              </div>
            ) : (
              filteredStates.map((state) => {
                const status = getStateStatus(activeCountry.code, state);
                const isExpanded = expandedStates[state.code] || Boolean(searchQuery);

                // Count selected districts in this state
                const selectedDistricts = state.districts.filter((d) =>
                  selectedRegions.includes(
                    getDistrictKey(activeCountry.code, state.code, d)
                  )
                );

                return (
                  <div
                    key={state.code}
                    className="border border-slate-200 rounded-xl overflow-hidden transition"
                  >
                    {/* State Header Bar */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/70 hover:bg-slate-100/70 transition select-none">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Checkbox for whole state */}
                        <button
                          type="button"
                          onClick={() => toggleState(activeCountry.code, state)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                            status === "ALL"
                              ? "bg-amber-500 border-amber-500 text-white"
                              : status === "SOME"
                              ? "bg-amber-100 border-amber-400 text-amber-800 font-bold text-[10px]"
                              : "bg-white border-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {status === "ALL" && <Check size={12} strokeWidth={3} />}
                          {status === "SOME" && "—"}
                        </button>

                        <span
                          onClick={() =>
                            setExpandedStates((prev) => ({
                              ...prev,
                              [state.code]: !isExpanded,
                            }))
                          }
                          className="font-bold text-xs text-slate-800 cursor-pointer hover:text-amber-600 truncate"
                        >
                          {state.name}
                        </span>

                        <span className="text-[10px] font-semibold text-slate-400">
                          ({selectedDistricts.length}/{state.districts.length} districts)
                        </span>
                      </div>

                      {/* Expand / Collapse Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStates((prev) => ({
                            ...prev,
                            [state.code]: !isExpanded,
                          }))
                        }
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50"
                      >
                        {isExpanded ? (
                          <ChevronDown size={15} />
                        ) : (
                          <ChevronRight size={15} />
                        )}
                      </button>
                    </div>

                    {/* Districts Grid */}
                    {isExpanded && (
                      <div className="p-3 bg-white border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Districts / Cities ({state.districts.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleState(activeCountry.code, state)}
                            className="text-[10px] font-semibold text-amber-600 hover:underline"
                          >
                            {status === "ALL" ? "Deselect All" : "Select All"}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {state.districts.map((district) => {
                            const dKey = getDistrictKey(
                              activeCountry.code,
                              state.code,
                              district
                            );
                            const isSelected = selectedRegions.includes(dKey);

                            return (
                              <button
                                type="button"
                                key={district}
                                onClick={() =>
                                  toggleDistrict(activeCountry.code, state, district)
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                                  isSelected
                                    ? "bg-amber-50 text-amber-800 border-amber-300 font-bold shadow-2xs ring-1 ring-amber-300"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                }`}
                              >
                                {isSelected ? "✓ " : ""}
                                {district}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected Targets Chip Cloud */}
      {selectedRegions.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <MapPin size={13} className="text-amber-500" />
              <span>Targeted Locations ({selectedRegions.length}):</span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ countries: selectedCountries, regions: [] })}
              className="text-[11px] font-semibold text-red-600 hover:underline"
            >
              Clear All Locations
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {selectedRegions
              .filter((r) => !r.endsWith(":ALL"))
              .slice(0, 50)
              .map((reg) => {
                const parts = reg.split(":");
                const cCode = parts[0] || "";
                const sCode = parts[1] || "";
                const dName = parts.slice(2).join(":") || "";
                const country = GEO_REGIONS[cCode];

                return (
                  <span
                    key={reg}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs"
                  >
                    <span>{country?.flag || ""}</span>
                    <span className="font-semibold">{sCode}:</span>
                    <span>{dName}</span>
                    <button
                      type="button"
                      onClick={() => removeRegion(reg)}
                      className="ml-0.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                );
              })}

            {selectedRegions.filter((r) => !r.endsWith(":ALL")).length > 50 && (
              <span className="text-[10px] text-slate-500 font-bold self-center px-1">
                +{selectedRegions.filter((r) => !r.endsWith(":ALL")).length - 50} more
                locations targeted
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
