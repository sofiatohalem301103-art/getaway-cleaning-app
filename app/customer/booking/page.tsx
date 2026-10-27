'use client';

import React, { useState, useEffect, Suspense, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ==========================================
// 1. TYPES & DATA STRUCTURES
// ==========================================
export interface PricingInfo {
  general: number;
  turnover: number;
  note: string;
}

export interface PropertyCategory {
  category: string;
  pricing: PricingInfo;
  items: string[];
}

const PROPERTY_DATA: PropertyCategory[] = [
  {
    category: '1 Bedroom Apartment',
    pricing: { general: 40, turnover: 70, note: '' },
    items: [
      'Beautiful Apartment in Harbour Paphos | Central',
      'Breathtaking Seaview Apartment | Lighthouse Beach',
      'Harbour Lights Seaview One Bedroom Apt | Paphos',
      'One Bedroom Apartment | Lighthouse Beach',
      'One Bedroom Apartment in Universal Paphos',
      'Stylish One Bedroom Apartment at Paphos Harbour',
    ],
  },
  {
    category: '2 Bedroom Apartment / House',
    pricing: { general: 70, turnover: 120, note: '' },
    items: ['Cozy Nerina Cottage | Harbour Paphos'],
  },
  {
    category: '3 Bedroom Apartment / House',
    pricing: { general: 90, turnover: 150, note: '' },
    items: [
      'Modern Poolside Villa | Paphos',
      'Stylish Poolside Villa | Paphos',
      'Tropical Paradise | Harbour Paphos | Center',
    ],
  },
];

const INPUT_BASE_CLASSES =
  'w-full px-3.5 py-3 bg-white border border-[#E2E8F0] rounded-xl text-base font-medium text-[#1E2B37] focus:outline-none focus:border-[#006AFF] focus:ring-1 focus:ring-[#006AFF] transition-colors box-border touch-manipulation';

// ==========================================
// 2. SUB-COMPONENTS
// ==========================================

/** SECTION 1: Service Type Selector Component **/
interface ServiceTypeSelectorProps {
  selectedService: 'holiday' | 'private';
  onSelectService: (service: 'holiday' | 'private') => void;
}

const ServiceTypeSelector: React.FC<ServiceTypeSelectorProps> = ({
  selectedService,
  onSelectService,
}) => (
  <div className="space-y-3">
    <div>
      <h2 className="text-base sm:text-lg font-bold text-[#1E2B37]">Select Service Type</h2>
      <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
        Please select the service type you require
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <button
        type="button"
        onClick={() => onSelectService('holiday')}
        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
          selectedService === 'holiday'
            ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
        }`}
      >
        <span className="text-sm sm:text-base font-bold block">
          Holiday Home Guest
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectService('private')}
        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
          selectedService === 'private'
            ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
        }`}
      >
        <span className="text-sm sm:text-base font-bold block">
          Private Home / Office Cleaning
        </span>
      </button>
    </div>
  </div>
);

/** SECTION 2 (Holiday): Property Selection Component **/
interface PropertySelectionProps {
  selectedProperty: string;
  onSelectProperty: (property: string) => void;
}

const PropertySelection: React.FC<PropertySelectionProps> = ({
  selectedProperty,
  onSelectProperty,
}) => (
  <div className="pt-5 border-t border-[#E2E8F0] space-y-2.5">
    <div>
      <label htmlFor="property-select" className="text-base sm:text-lg font-bold text-[#1E2B37] block">
        Select Property
      </label>
      <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
        Choose your property to reveal exact program pricing
      </p>
    </div>

    <select
      id="property-select"
      value={selectedProperty}
      onChange={(e) => onSelectProperty(e.target.value)}
      className={`${INPUT_BASE_CLASSES} cursor-pointer truncate`}
    >
      <option value="">-- Please Select a Property --</option>
      {PROPERTY_DATA.map((group) => (
        <optgroup key={group.category} label={`--- ${group.category} ---`}>
          {group.items.map((property) => (
            <option key={property} value={property}>
              {property}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  </div>
);

/** SECTION 3 (Holiday): Cleaning Program Selection Component **/
interface ProgramSelectionProps {
  selectedProgram: 'general' | 'turnover' | null;
  onSelectProgram: (program: 'general' | 'turnover') => void;
  currentPropertyInfo: PropertyCategory | undefined;
}

const ProgramSelection: React.FC<ProgramSelectionProps> = ({
  selectedProgram,
  onSelectProgram,
  currentPropertyInfo,
}) => (
  <div className="pt-5 border-t border-[#E2E8F0] space-y-2.5">
    <div>
      <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
        Select Cleaning Program
      </label>
      <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
        Choose the cleaning option that suits your needs
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
      <button
        type="button"
        onClick={() => onSelectProgram('general')}
        className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between w-full box-border touch-manipulation active:scale-[0.99] ${
          selectedProgram === 'general'
            ? 'bg-[#EAF3F9] border-[#006AFF]'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <div className="space-y-1.5 w-full">
          <div className="flex justify-between items-center gap-2">
            <span className={`text-sm sm:text-base font-bold ${selectedProgram === 'general' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
              General Cleaning
            </span>
            <span className="text-base sm:text-lg font-black text-[#006AFF] shrink-0">
              {currentPropertyInfo ? `€${currentPropertyInfo.pricing.general}` : '€'}
            </span>
          </div>
          {currentPropertyInfo?.pricing.note && (
            <p className="text-xs text-[#8E9B9E]">
              {currentPropertyInfo.pricing.note}
            </p>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectProgram('turnover')}
        className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between w-full box-border touch-manipulation active:scale-[0.99] ${
          selectedProgram === 'turnover'
            ? 'bg-[#EAF3F9] border-[#006AFF]'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <div className="space-y-1.5 w-full">
          <div className="flex justify-between items-start gap-2">
            <span className={`text-sm sm:text-base font-bold ${selectedProgram === 'turnover' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
              Turnover Cleaning
            </span>
            <span className="text-base sm:text-lg font-black text-[#006AFF] shrink-0">
              {currentPropertyInfo ? `€${currentPropertyInfo.pricing.turnover}` : '€'}
            </span>
          </div>
          <p className="text-xs text-[#8E9B9E] leading-relaxed break-words">
            Cleaning & change all sheets and towels
          </p>
        </div>
      </button>
    </div>
  </div>
);

/** SECTION 2 (Private): Location & Details Form Component **/
interface PrivateHomeFormProps {
  selectedPrivateProgram: 'general' | 'deep' | 'office' | 'garden' | null;
  propertyType: 'house' | 'apartment' | null;
  bedrooms: string | null;
  bathrooms: string | null;
  balconies: string | null;
  officeSquareMeters: string | null;
  officeToilets: string | null;
  officeBalconies: string | null;
  officeCleanWindows: 'yes' | 'no' | null;
  officeWindowsCount: string | null;
  gardenSquareMeters: string | null;
  gardenType: 'weeds' | 'trees' | 'other' | null;
  gardenOtherDetails: string;
  address: string;
  buildingComplex: string;
  apartmentHouseNo: string;
  mapLink: string;
  onPrivateProgramChange: (program: 'general' | 'deep' | 'office' | 'garden') => void;
  onPropertyTypeChange: (type: 'house' | 'apartment') => void;
  onBedroomsChange: (num: string) => void;
  onBathroomsChange: (num: string) => void;
  onBalconiesChange: (num: string) => void;
  onOfficeSquareMetersChange: (val: string) => void;
  onOfficeToiletsChange: (val: string) => void;
  onOfficeBalconiesChange: (val: string) => void;
  onOfficeCleanWindowsChange: (val: 'yes' | 'no') => void;
  onOfficeWindowsCountChange: (val: string) => void;
  onGardenSquareMetersChange: (val: string) => void;
  onGardenTypeChange: (type: 'weeds' | 'trees' | 'other') => void;
  onGardenOtherDetailsChange: (val: string) => void;
  onAddressChange: (val: string) => void;
  onBuildingComplexChange: (val: string) => void;
  onApartmentHouseNoChange: (val: string) => void;
  onMapLinkChange: (val: string) => void;
}

const PrivateHomeForm: React.FC<PrivateHomeFormProps> = ({
  selectedPrivateProgram,
  propertyType,
  bedrooms,
  bathrooms,
  balconies,
  officeSquareMeters,
  officeToilets,
  officeBalconies,
  officeCleanWindows,
  officeWindowsCount,
  gardenSquareMeters,
  gardenType,
  gardenOtherDetails,
  address,
  buildingComplex,
  apartmentHouseNo,
  mapLink,
  onPrivateProgramChange,
  onPropertyTypeChange,
  onBedroomsChange,
  onBathroomsChange,
  onBalconiesChange,
  onOfficeSquareMetersChange,
  onOfficeToiletsChange,
  onOfficeBalconiesChange,
  onOfficeCleanWindowsChange,
  onOfficeWindowsCountChange,
  onGardenSquareMetersChange,
  onGardenTypeChange,
  onGardenOtherDetailsChange,
  onAddressChange,
  onBuildingComplexChange,
  onApartmentHouseNoChange,
  onMapLinkChange,
}) => {
  const bedroomOptions = [
    { label: '1 Bedroom', value: '1' },
    { label: '2 Bedrooms', value: '2' },
    { label: '3 Bedrooms', value: '3' },
    { label: '4 Bedrooms', value: '4' },
    { label: '5 Bedrooms or More', value: '5+' },
  ];

  const bathroomOptions = [
    { label: '1 Bathroom', value: '1' },
    { label: '2 Bathrooms', value: '2' },
    { label: '3 Bathrooms', value: '3' },
    { label: '4 Bathrooms', value: '4' },
    { label: '5 Bathrooms or More', value: '5+' },
  ];

  const balconyOptions = [
    { label: '1 Balcony / Verandah', value: '1' },
    { label: '2 Balconies / Verandahs', value: '2' },
    { label: '3 Balconies / Verandahs', value: '3' },
    { label: '4 Balconies / Verandahs or More', value: '4+' },
  ];

  const officeSquareMetersOptions = [
    { label: 'Less than 100 m²', value: 'less_than_100' },
    { label: '100 m²', value: '100' },
    { label: '200 m²', value: '200' },
    { label: 'More than 300 m²', value: 'more_than_300' },
  ];

  const officeToiletOptions = [
    { label: '1 Toilet', value: '1' },
    { label: '2 Toilets', value: '2' },
    { label: '3 Toilets', value: '3' },
    { label: '4 Toilets', value: '4' },
    { label: 'More than 5 Toilets', value: 'more_than_5' },
  ];

  const officeBalconyOptions = [
    { label: '1 Balcony', value: '1' },
    { label: '2 Balconies', value: '2' },
    { label: '3 Balconies', value: '3' },
    { label: '4 Balconies', value: '4' },
    { label: 'More than 5 Balconies', value: 'more_than_5' },
  ];

  const officeWindowCountOptions = [
    { label: '1 Window', value: '1' },
    { label: '2 Windows', value: '2' },
    { label: 'More Than 3 Windows', value: 'more_than_3' },
  ];

  const gardenSquareMetersOptions = [
    { label: '50 m²', value: '50' },
    { label: '100 m²', value: '100' },
    { label: '200 m²', value: '200' },
    { label: 'More than 300 m²', value: 'more_than_300' },
  ];

  const gardenTypeOptions = [
    { label: 'Weeds', value: 'weeds' },
    { label: 'Trees', value: 'trees' },
    { label: 'Other', value: 'other' },
  ];

  return (
    <div className="pt-5 border-t border-[#E2E8F0] space-y-5">
      <div className="space-y-1.5">
        <div>
          <label htmlFor="address-input" className="text-base font-bold text-[#1E2B37] block">
            Address
          </label>
          <p className="text-xs text-[#8E9B9E]">
            Please enter street name, area, or full address
          </p>
        </div>
        <textarea
          id="address-input"
          rows={3}
          placeholder="Enter street name, area, city..."
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          className={`${INPUT_BASE_CLASSES} resize-none`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5">
          <label htmlFor="building-input" className="text-base font-bold text-[#1E2B37] block">
            Building / Complex
          </label>
          <p className="text-xs text-[#8E9B9E]">
            Enter building, condo, or complex name
          </p>
          <input
            id="building-input"
            type="text"
            placeholder="e.g. Sunset Heights / Phase 2"
            value={buildingComplex}
            onChange={(e) => onBuildingComplexChange(e.target.value)}
            className={INPUT_BASE_CLASSES}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="unit-input" className="text-base font-bold text-[#1E2B37] block">
            Apartment / House No.
          </label>
          <p className="text-xs text-[#8E9B9E]">
            Enter apartment, unit, or house number
          </p>
          <input
            id="unit-input"
            type="text"
            placeholder="e.g. Apt 302 / House 12B"
            value={apartmentHouseNo}
            onChange={(e) => onApartmentHouseNoChange(e.target.value)}
            className={INPUT_BASE_CLASSES}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div>
          <label htmlFor="map-input" className="text-base font-bold text-[#1E2B37] block">
            Google Maps Link
          </label>
          <p className="text-xs text-[#8E9B9E]">
            Paste location URL from Google Maps for precise navigation
          </p>
        </div>
        <input
          id="map-input"
          type="url"
          placeholder="https://maps.google.com/..."
          value={mapLink}
          onChange={(e) => onMapLinkChange(e.target.value)}
          className={INPUT_BASE_CLASSES}
        />
      </div>

      <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
        <div>
          <label className="text-base font-bold text-[#1E2B37] block">
            Select Service Program
          </label>
          <p className="text-xs text-[#8E9B9E]">
            Choose the service type that matches your requirements
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
          <button
            type="button"
            onClick={() => onPrivateProgramChange('general')}
            className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
              selectedPrivateProgram === 'general'
                ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
            }`}
          >
            <span className="text-sm sm:text-base font-bold block">
              General Cleaning
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPrivateProgramChange('deep')}
            className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
              selectedPrivateProgram === 'deep'
                ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
            }`}
          >
            <span className="text-sm sm:text-base font-bold block">
              Deep Cleaning
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPrivateProgramChange('office')}
            className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
              selectedPrivateProgram === 'office'
                ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
            }`}
          >
            <span className="text-sm sm:text-base font-bold block">
              Office Cleaning
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPrivateProgramChange('garden')}
            className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
              selectedPrivateProgram === 'garden'
                ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
            }`}
          >
            <span className="text-sm sm:text-base font-bold block">
              Garden Cleaning <span className="text-xs font-normal text-[#8E9B9E] block sm:inline">(Upon Request)</span>
            </span>
          </button>
        </div>
      </div>

      {(selectedPrivateProgram === 'general' || selectedPrivateProgram === 'deep') && (
        <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
          <div>
            <label className="text-base font-bold text-[#1E2B37] block">
              Choose Type Of Property
            </label>
            <p className="text-xs text-[#8E9B9E]">
              Select whether your property is a house or an apartment
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
            <button
              type="button"
              onClick={() => onPropertyTypeChange('house')}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                propertyType === 'house'
                  ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                  : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
              }`}
            >
              <span className="text-sm sm:text-base font-bold block">
                House
              </span>
            </button>

            <button
              type="button"
              onClick={() => onPropertyTypeChange('apartment')}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                propertyType === 'apartment'
                  ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                  : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
              }`}
            >
              <span className="text-sm sm:text-base font-bold block">
                Apartment
              </span>
            </button>
          </div>
        </div>
      )}

      {(selectedPrivateProgram === 'general' || selectedPrivateProgram === 'deep') && propertyType && (
        <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
          <div>
            <label className="text-base font-bold text-[#1E2B37] block">
              Choose How Many Bedroom(s)
            </label>
            <p className="text-xs text-[#8E9B9E]">
              Select the number of bedrooms in your property
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1">
            {bedroomOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onBedroomsChange(opt.value)}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                  bedrooms === opt.value
                    ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                }`}
              >
                <span className="text-sm sm:text-base font-bold block">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(selectedPrivateProgram === 'general' || selectedPrivateProgram === 'deep') && propertyType && (
        <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
          <div>
            <label className="text-base font-bold text-[#1E2B37] block">
              Choose How Many Bathroom(s)
            </label>
            <p className="text-xs text-[#8E9B9E]">
              Select the number of bathrooms in your property
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1">
            {bathroomOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onBathroomsChange(opt.value)}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                  bathrooms === opt.value
                    ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                }`}
              >
                <span className="text-sm sm:text-base font-bold block">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(selectedPrivateProgram === 'general' || selectedPrivateProgram === 'deep') && propertyType && (
        <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
          <div>
            <label className="text-base font-bold text-[#1E2B37] block">
              Choose How Many Balconies / Verandahs
            </label>
            <p className="text-xs text-[#8E9B9E]">
              Select the number of balconies or verandahs in your property
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
            {balconyOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onBalconiesChange(opt.value)}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                  balconies === opt.value
                    ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                }`}
              >
                <span className="text-sm sm:text-base font-bold block">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedPrivateProgram === 'office' && (
        <>
          <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base font-bold text-[#1E2B37] block">
                How Many Square Meters (m²)?
              </label>
              <p className="text-xs text-[#8E9B9E]">
                Select the approximate total area of your office
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
              {officeSquareMetersOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onOfficeSquareMetersChange(opt.value)}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                    officeSquareMeters === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                  }`}
                >
                  <span className="text-sm sm:text-base font-bold block">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base font-bold text-[#1E2B37] block">
                How Many Toilets?
              </label>
              <p className="text-xs text-[#8E9B9E]">
                Select the number of toilets in your office
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1">
              {officeToiletOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onOfficeToiletsChange(opt.value)}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                    officeToilets === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                  }`}
                >
                  <span className="text-sm sm:text-base font-bold block">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base font-bold text-[#1E2B37] block">
                How Many Balconies?
              </label>
              <p className="text-xs text-[#8E9B9E]">
                Select the number of balconies in your office
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1">
              {officeBalconyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onOfficeBalconiesChange(opt.value)}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                    officeBalconies === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                  }`}
                >
                  <span className="text-sm sm:text-base font-bold block">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base font-bold text-[#1E2B37] block">
                Would you like to clean the windows?
              </label>
              <p className="text-xs text-[#8E9B9E]">
                Select whether window cleaning service is needed
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
              <button
                type="button"
                onClick={() => onOfficeCleanWindowsChange('yes')}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                  officeCleanWindows === 'yes'
                    ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                }`}
              >
                <span className="text-sm sm:text-base font-bold block">
                  Yes
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOfficeCleanWindowsChange('no')}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                  officeCleanWindows === 'no'
                    ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                }`}
              >
                <span className="text-sm sm:text-base font-bold block">
                  No
                </span>
              </button>
            </div>
          </div>

          {officeCleanWindows === 'yes' && (
            <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
              <div>
                <label className="text-base font-bold text-[#1E2B37] block">
                  How Many Windows?
                </label>
                <p className="text-xs text-[#8E9B9E]">
                  Select the number of windows to clean
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
                {officeWindowCountOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onOfficeWindowsCountChange(opt.value)}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                      officeWindowsCount === opt.value
                        ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                        : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                    }`}
                  >
                    <span className="text-sm sm:text-base font-bold block">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedPrivateProgram === 'garden' && (
        <>
          <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base font-bold text-[#1E2B37] block">
                How Many Square Meters (m²)?
              </label>
              <p className="text-xs text-[#8E9B9E]">
                Select the approximate total area of your garden
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
              {gardenSquareMetersOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onGardenSquareMetersChange(opt.value)}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                    gardenSquareMeters === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF] font-bold text-[#006AFF]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                  }`}
                >
                  <span className="text-sm sm:text-base font-bold block">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base font-bold text-[#1E2B37] block">
                Select Type Of Garden
              </label>
              <p className="text-xs text-[#8E9B9E]">
                Choose what type of garden work is required
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
              {gardenTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onGardenTypeChange(opt.value as 'weeds' | 'trees' | 'other')}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation active:scale-[0.99] ${
                    gardenType === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD] text-[#1E2B37]'
                  }`}
                >
                  <span className="text-sm sm:text-base font-bold block">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            {gardenType === 'other' && (
              <div className="pt-2 space-y-1.5">
                <label htmlFor="garden-other-details" className="text-sm font-semibold text-[#1E2B37] block">
                  Please Specify Other Details
                </label>
                <input
                  id="garden-other-details"
                  type="text"
                  placeholder="Please specify other details..."
                  value={gardenOtherDetails}
                  onChange={(e) => onGardenOtherDetailsChange(e.target.value)}
                  className={INPUT_BASE_CLASSES}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/** SECTION 4 (Common): Date Selection Component **/
interface DateSelectionProps {
  selectedDate: string;
  minDate: string;
  onDateChange: (val: string) => void;
}

const DateSelection: React.FC<DateSelectionProps> = ({
  selectedDate,
  minDate,
  onDateChange,
}) => (
  <div className="pt-5 border-t border-[#E2E8F0] space-y-2.5 w-full max-w-full">
    <div>
      <label htmlFor="service-date" className="text-base font-bold text-[#1E2B37] block">
        Select Service Date
      </label>
      <p className="text-xs text-[#8E9B9E]">
        Please choose a date starting from tomorrow
      </p>
    </div>

    <div className="w-full">
      <input
        id="service-date"
        type="date"
        min={minDate}
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        className={`${INPUT_BASE_CLASSES} cursor-pointer block appearance-none min-w-0 max-w-full`}
        required
      />
    </div>
  </div>
);

/** SECTION 5 (Common): Time Slot Selection Component **/
interface TimeSelectionProps {
  selectedTime: 'morning' | 'afternoon' | null;
  onSelectTime: (time: 'morning' | 'afternoon') => void;
}

const TimeSelection: React.FC<TimeSelectionProps> = ({
  selectedTime,
  onSelectTime,
}) => (
  <div className="pt-5 border-t border-[#E2E8F0] space-y-2.5">
    <div>
      <label className="text-base font-bold text-[#1E2B37] block">
        Select Time
      </label>
      <p className="text-xs text-[#8E9B9E]">
        Choose your preferred time slot for the service
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
      <button
        type="button"
        onClick={() => onSelectTime('morning')}
        className={`p-3.5 sm:p-4 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center w-full box-border touch-manipulation active:scale-[0.99] ${
          selectedTime === 'morning'
            ? 'bg-[#EAF3F9] border-[#006AFF]'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <div className="space-y-0.5 w-full">
          <span className={`text-sm sm:text-base font-bold block ${selectedTime === 'morning' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
            Morning
          </span>
          <span className="text-xs text-[#8E9B9E] block">
            09:00 - 12:00 hrs
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectTime('afternoon')}
        className={`p-3.5 sm:p-4 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center w-full box-border touch-manipulation active:scale-[0.99] ${
          selectedTime === 'afternoon'
            ? 'bg-[#EAF3F9] border-[#006AFF]'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <div className="space-y-0.5 w-full">
          <span className={`text-sm sm:text-base font-bold block ${selectedTime === 'afternoon' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
            Afternoon
          </span>
          <span className="text-xs text-[#8E9B9E] block">
            13:00 - 16:00 hrs
          </span>
        </div>
      </button>
    </div>
  </div>
);

// ==========================================
// 3. MAIN FORM COMPONENT
// ==========================================
interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

function BookingForm() {
  const router = useRouter(); 
  const [selectedService, setSelectedService] = useState<'holiday' | 'private'>('holiday');
  
  // Holiday Home States
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<'general' | 'turnover' | null>(null);

  // Private Home States
  const [privateAddress, setPrivateAddress] = useState<string>('');
  const [privateBuildingComplex, setPrivateBuildingComplex] = useState<string>('');
  const [privateApartmentHouseNo, setPrivateApartmentHouseNo] = useState<string>('');
  const [googleMapsLink, setGoogleMapsLink] = useState<string>('');
  const [selectedPrivateProgram, setSelectedPrivateProgram] = useState<'general' | 'deep' | 'office' | 'garden' | null>(null);
  const [privatePropertyType, setPrivatePropertyType] = useState<'house' | 'apartment' | null>(null);
  const [privateBedrooms, setPrivateBedrooms] = useState<string | null>(null);
  const [privateBathrooms, setPrivateBathrooms] = useState<string | null>(null);
  const [privateBalconies, setPrivateBalconies] = useState<string | null>(null);
  
  // Office States
  const [officeSquareMeters, setOfficeSquareMeters] = useState<string | null>(null);
  const [officeToilets, setOfficeToilets] = useState<string | null>(null);
  const [officeBalconies, setOfficeBalconies] = useState<string | null>(null);
  const [officeCleanWindows, setOfficeCleanWindows] = useState<'yes' | 'no' | null>(null);
  const [officeWindowsCount, setOfficeWindowsCount] = useState<string | null>(null);

  // Garden States
  const [gardenSquareMeters, setGardenSquareMeters] = useState<string | null>(null);
  const [gardenType, setGardenType] = useState<'weeds' | 'trees' | 'other' | null>(null);
  const [gardenOtherDetails, setGardenOtherDetails] = useState<string>('');

  // Common States
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | null>(null);
  const [minDate, setMinDate] = useState<string>('');

  // Customer Info State
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const minDateStr = `${year}-${month}-${day}`;
      
      setMinDate(minDateStr);

      const fetchUserData = async () => {
        let name = localStorage.getItem('user_name') || '';
        let email = localStorage.getItem('user_email') || '';
        let phone = localStorage.getItem('user_phone') || '';

        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            email = user.email || email;
            const { data: userRecord } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

            if (userRecord) {
              name = userRecord.full_name || name;
              phone = userRecord.phone || phone;
            }
          }
        }

        setCustomerInfo({ name, email, phone });
      };

      fetchUserData();

      const savedData = sessionStorage.getItem('bookingData');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          
          if (parsed.service) setSelectedService(parsed.service);
          if (parsed.property) setSelectedProperty(parsed.property);
          if (parsed.program) setSelectedProgram(parsed.program);
          
          if (parsed.date) {
            setSelectedDate(parsed.date < minDateStr ? minDateStr : parsed.date);
          } else {
            setSelectedDate(minDateStr);
          }
          
          if (parsed.timeSlot) setSelectedTime(parsed.timeSlot);
          
          if (parsed.address) setPrivateAddress(parsed.address);
          if (parsed.buildingComplex) setPrivateBuildingComplex(parsed.buildingComplex);
          if (parsed.apartmentHouseNo) setPrivateApartmentHouseNo(parsed.apartmentHouseNo);
          if (parsed.mapLink) setGoogleMapsLink(parsed.mapLink);
          if (parsed.program && parsed.service === 'private') setSelectedPrivateProgram(parsed.program);
          if (parsed.propertyType) setPrivatePropertyType(parsed.propertyType);
          if (parsed.bedrooms) setPrivateBedrooms(parsed.bedrooms);
          if (parsed.bathrooms) setPrivateBathrooms(parsed.bathrooms);
          if (parsed.balconies) setPrivateBalconies(parsed.balconies);
          
          if (parsed.officeSquareMeters) setOfficeSquareMeters(parsed.officeSquareMeters);
          if (parsed.officeToilets) setOfficeToilets(parsed.officeToilets);
          if (parsed.officeBalconies) setOfficeBalconies(parsed.officeBalconies);
          if (parsed.officeCleanWindows) setOfficeCleanWindows(parsed.officeCleanWindows);
          if (parsed.officeWindowsCount) setOfficeWindowsCount(parsed.officeWindowsCount);
          
          if (parsed.gardenSquareMeters) setGardenSquareMeters(parsed.gardenSquareMeters);
          if (parsed.gardenType) setGardenType(parsed.gardenType);
          if (parsed.gardenOtherDetails) setGardenOtherDetails(parsed.gardenOtherDetails);

          if (parsed.name || parsed.phone || parsed.email) {
            setCustomerInfo((prev) => ({
              name: parsed.name || prev.name,
              email: parsed.email || prev.email,
              phone: parsed.phone || prev.phone,
            }));
          }
        } catch (err) {
          console.error("Error parsing bookingData from sessionStorage", err);
          setSelectedDate(minDateStr);
        }
      } else {
        setSelectedDate(minDateStr);
      }
    }
  }, []);

  const handleServiceChange = (service: 'holiday' | 'private') => {
    setSelectedService(service);
    setSelectedDate(minDate);
    setSelectedTime(null);
    setSelectedProperty('');
    setSelectedProgram(null);
    setSelectedPrivateProgram(null);
    setPrivatePropertyType(null);
    setPrivateBedrooms(null);
    setPrivateBathrooms(null);
    setPrivateBalconies(null);
    setOfficeSquareMeters(null);
    setOfficeToilets(null);
    setOfficeBalconies(null);
    setOfficeCleanWindows(null);
    setOfficeWindowsCount(null);
    setGardenSquareMeters(null);
    setGardenType(null);
    setGardenOtherDetails('');
  };

  const handlePrivateProgramChange = (program: 'general' | 'deep' | 'office' | 'garden') => {
    setSelectedPrivateProgram(program);
    setPrivatePropertyType(null);
    setPrivateBedrooms(null);
    setPrivateBathrooms(null);
    setPrivateBalconies(null);
    setOfficeSquareMeters(null);
    setOfficeToilets(null);
    setOfficeBalconies(null);
    setOfficeCleanWindows(null);
    setOfficeWindowsCount(null);
    setGardenSquareMeters(null);
    setGardenType(null);
    setGardenOtherDetails('');
  };

  const handlePropertyTypeChange = (type: 'house' | 'apartment') => {
    setPrivatePropertyType(type);
    setPrivateBedrooms(null);
    setPrivateBathrooms(null);
    setPrivateBalconies(null);
  };

  const handleOfficeCleanWindowsChange = (val: 'yes' | 'no') => {
    setOfficeCleanWindows(val);
    if (val === 'no') {
      setOfficeWindowsCount(null);
    }
  };

  const currentPropertyInfo = PROPERTY_DATA.find((group) =>
    group.items.includes(selectedProperty)
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      alert("Please select a service date.");
      return;
    }
    if (!selectedTime) {
      alert("Please select a preferred time slot.");
      return;
    }

    if (selectedService === 'holiday') {
      if (!selectedProperty) {
        alert("Please select a property.");
        return;
      }
      if (!selectedProgram) {
        alert("Please select a cleaning program.");
        return;
      }
    } else {
      if (!selectedPrivateProgram) {
        alert("Please select a service program for private cleaning.");
        return;
      }
      if (!privateAddress.trim()) {
        alert("Please provide the service address.");
        return;
      }
    }

    let calculatedPrice = 70;
    let roomCount = '1';

    if (selectedService === 'holiday' && currentPropertyInfo) {
      if (currentPropertyInfo.category.startsWith('2')) {
        roomCount = '2';
      }
      if (currentPropertyInfo.category.startsWith('3')) {
        roomCount = '3';
      }

      const programKey = selectedProgram === 'general' ? 'general' : 'turnover';
      calculatedPrice = currentPropertyInfo.pricing[programKey] || 70;
    }

    let formattedProgramName = '';
    let serviceSearchName = '';

    if (selectedService === 'holiday') {
      formattedProgramName = selectedProgram === 'general'
        ? 'General Cleaning'
        : 'Turnover Cleaning (Cleaning & change all sheets and towels)';
      
      const pName = selectedProgram === 'general' ? 'General Cleaning' : 'Turnover Cleaning';
      serviceSearchName = `${roomCount} Bedroom - ${pName}`;
    } else {
      const privateProgramNames = {
        general: 'Private Home - General Cleaning',
        deep: 'Private Home - Deep Cleaning',
        office: 'Private Home - Office Cleaning',
        garden: 'Private Home - Garden Cleaning',
      };
      formattedProgramName = selectedPrivateProgram ? privateProgramNames[selectedPrivateProgram] : 'Private Service';
      serviceSearchName = formattedProgramName;
    }

    let matchedServiceId: string | null = null;
    if (supabase && serviceSearchName) {
      const { data: serviceRecord } = await supabase
        .from('services')
        .select('id')
        .eq('name', serviceSearchName)
        .maybeSingle();

      if (serviceRecord?.id) {
        matchedServiceId = serviceRecord.id;
      }
    }

    const fullAddress = [
      privateAddress,
      privateBuildingComplex ? `Building: ${privateBuildingComplex}` : '',
      privateApartmentHouseNo ? `Unit: ${privateApartmentHouseNo}` : '',
      googleMapsLink ? `Map: ${googleMapsLink}` : '',
    ].filter(Boolean).join(', ');

    try {
      if (supabase && customerInfo.email) {
        const { data: { user } } = await supabase.auth.getUser();
        let targetUserId = user?.id;

        if (!targetUserId) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', customerInfo.email.trim().toLowerCase())
            .maybeSingle();

          targetUserId = existingUser?.id || crypto.randomUUID();
        }

        await supabase.from('users').upsert([{
          id: targetUserId,
          email: customerInfo.email.trim().toLowerCase(),
          full_name: customerInfo.name || null,
          phone: customerInfo.phone || null,
          role: 'customer',
        }]);
      }
    } catch (syncErr) {
      console.warn('Sync users table error:', syncErr);
    }

    const formData = selectedService === 'holiday' 
      ? {
          service: 'holiday',
          property: selectedProperty,
          program: selectedProgram,
          program_name: formattedProgramName,
          service_id: matchedServiceId,
          date: selectedDate,
          timeSlot: selectedTime,
          price: calculatedPrice,
          room: roomCount,
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
        }
      : {
          service: 'private',
          address: privateAddress,
          fullAddress,
          buildingComplex: privateBuildingComplex,
          apartmentHouseNo: privateApartmentHouseNo,
          mapLink: googleMapsLink,
          program: selectedPrivateProgram,
          program_name: formattedProgramName,
          service_id: matchedServiceId,
          propertyType: privatePropertyType,
          bedrooms: privateBedrooms,
          bathrooms: privateBathrooms,
          balconies: privateBalconies,
          officeSquareMeters,
          officeToilets,
          officeBalconies,
          officeCleanWindows,
          officeWindowsCount: officeCleanWindows === 'yes' ? officeWindowsCount : null,
          gardenSquareMeters,
          gardenType,
          gardenOtherDetails: gardenType === 'other' ? gardenOtherDetails : '',
          date: selectedDate,
          timeSlot: selectedTime,
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
        };

    if (selectedService === 'holiday') {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bookingData', JSON.stringify(formData));
      }

      const queryParams = new URLSearchParams({
        program: formattedProgramName,
        service_id: matchedServiceId || '',
        room: roomCount,
        price: calculatedPrice.toString(),
        apartment: selectedProperty || '',
        date: selectedDate,
        time: selectedTime || 'morning',
        name: customerInfo.name || '',
        email: customerInfo.email || '',
        phone: customerInfo.phone || '',
      }).toString();

      router.push(`/customer/payment?${queryParams}`);
    } else {
      const generatedRef = `PRV-${Math.floor(100000 + Math.random() * 900000)}`;

      const validScheduledTime = selectedTime === 'morning' 
        ? '09:00:00' 
        : selectedTime === 'afternoon' 
        ? '13:00:00' 
        : null;

      const privateDetails = {
        program: selectedPrivateProgram,
        program_name: formattedProgramName,
        property_type: privatePropertyType,
        bedrooms: privateBedrooms,
        bathrooms: privateBathrooms,
        balconies: privateBalconies,
        address: privateAddress,
        building_complex: privateBuildingComplex,
        apartment_house_no: privateApartmentHouseNo,
        google_maps_link: googleMapsLink,
        office_sqm: officeSquareMeters,
        office_toilets: officeToilets,
        office_balconies: officeBalconies,
        office_clean_windows: officeCleanWindows,
        office_windows_count: officeCleanWindows === 'yes' ? officeWindowsCount : null,
        garden_sqm: gardenSquareMeters,
        garden_type: gardenType,
        garden_other_details: gardenType === 'other' ? gardenOtherDetails : '',
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
      };

      try {
        const { data: { user } } = await supabase.auth.getUser();
        let validUserId: string | null = null;

        if (user?.id) {
          const { data: userExist } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

          if (userExist) {
            validUserId = user.id;
          }
        }

        const { data, error } = await supabase.from('bookings').insert([
          {
            booking_ref: generatedRef,
            service_id: matchedServiceId,
            user_id: validUserId,
            customer_id: validUserId,
            address: privateAddress || fullAddress || '',
            address_line: fullAddress || privateAddress || '',
            scheduled_date: selectedDate || null,
            booking_date: selectedDate ? new Date(selectedDate).toISOString() : null,
            scheduled_time: validScheduledTime,
            service_type: 'private',
            program_name: formattedProgramName,
            customer_phone: customerInfo.phone || null,
            customer_name: customerInfo.name || null,
            customer_email: customerInfo.email || null,
            notes: gardenType === 'other' ? gardenOtherDetails : null,
            details: JSON.stringify(privateDetails),
            total_amount: 0,
            status: 'pending',
          },
        ]).select();
        
        if (error) {
          console.error('Supabase Insert Error Detail:', error);
          alert(`Error from Supabase: ${error.message} (${error.details || ''})`);
          return;
        }

        console.log("Inserted successfully:", data);
      } catch (err) {
        console.error('Unexpected error:', err);
        alert(`Unexpected Error: ${err}`);
        return;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'bookingData',
          JSON.stringify({ ...formData, bookingRef: generatedRef })
        );
      }

      router.push('/customer/confirmation-private');
    }
  };

  return (
    /* 🟢 ปรับเปลี่ยนจาก bg-[#FAFAFA] เป็น bg-white เพื่อความราบรื่นไร้รอยต่อกับ Navbar */
    <main className="min-h-screen w-full bg-white py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E2B37]">
              Book a Cleaning Service
            </h1>
            <p className="text-xs sm:text-sm text-[#8E9B9E]">
              Please complete the information below to continue.
            </p>
          </div>

          <ServiceTypeSelector
            selectedService={selectedService}
            onSelectService={handleServiceChange}
          />

          {selectedService === 'holiday' && (
            <>
              <PropertySelection
                selectedProperty={selectedProperty}
                onSelectProperty={(property) => {
                  setSelectedProperty(property);
                  setSelectedProgram(null);
                }}
              />

              {selectedProperty && (
                <ProgramSelection
                  selectedProgram={selectedProgram}
                  onSelectProgram={setSelectedProgram}
                  currentPropertyInfo={currentPropertyInfo}
                />
              )}
            </>
          )}

          {selectedService === 'private' && (
            <PrivateHomeForm
              selectedPrivateProgram={selectedPrivateProgram}
              propertyType={privatePropertyType}
              bedrooms={privateBedrooms}
              bathrooms={privateBathrooms}
              balconies={privateBalconies}
              officeSquareMeters={officeSquareMeters}
              officeToilets={officeToilets}
              officeBalconies={officeBalconies}
              officeCleanWindows={officeCleanWindows}
              officeWindowsCount={officeWindowsCount}
              gardenSquareMeters={gardenSquareMeters}
              gardenType={gardenType}
              gardenOtherDetails={gardenOtherDetails}
              address={privateAddress}
              buildingComplex={privateBuildingComplex}
              apartmentHouseNo={privateApartmentHouseNo}
              mapLink={googleMapsLink}
              onPrivateProgramChange={handlePrivateProgramChange}
              onPropertyTypeChange={handlePropertyTypeChange}
              onBedroomsChange={setPrivateBedrooms}
              onBathroomsChange={setPrivateBathrooms}
              onBalconiesChange={setPrivateBalconies}
              onOfficeSquareMetersChange={setOfficeSquareMeters}
              onOfficeToiletsChange={setOfficeToilets}
              onOfficeBalconiesChange={setOfficeBalconies}
              onOfficeCleanWindowsChange={handleOfficeCleanWindowsChange}
              onOfficeWindowsCountChange={setOfficeWindowsCount}
              onGardenSquareMetersChange={setGardenSquareMeters}
              onGardenTypeChange={setGardenType}
              onGardenOtherDetailsChange={setGardenOtherDetails}
              onAddressChange={setPrivateAddress}
              onBuildingComplexChange={setPrivateBuildingComplex}
              onApartmentHouseNoChange={setPrivateApartmentHouseNo}
              onMapLinkChange={setGoogleMapsLink}
            />
          )}

          <DateSelection
            selectedDate={selectedDate}
            minDate={minDate}
            onDateChange={setSelectedDate}
          />

          <TimeSelection
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
          />

          <div className="pt-4">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#006AFF] px-5 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#0057D9] active:scale-[0.99] cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#006AFF] focus:ring-offset-2"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Loading booking form...</div>}>
      <BookingForm />
    </Suspense>
  );
}