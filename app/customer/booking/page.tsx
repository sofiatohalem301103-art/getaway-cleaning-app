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
    pricing: { general: 90, turnover: 150, note: '3 Hours/Cleaning' },
    items: [
      'Modern Poolside Villa | Paphos',
      'Stylish Poolside Villa | Paphos',
      'Tropical Paradise | Harbour Paphos | Center',
    ],
  },
];

// Class สำหรับการป้องกัน Auto-zoom on Mobile
const INPUT_BASE_CLASSES =
  'w-full px-4 py-3.5 bg-white border-2 border-[#E2E8F0] rounded-xl text-[16px] leading-6 font-medium text-[#1E2B37] focus:outline-none focus:border-[#006AFF] transition-colors box-border touch-manipulation';

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
      <h2 className="text-base sm:text-xl font-bold text-[#1E2B37]">Select Service Type</h2>
      <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5 sm:mt-1">
        Please select the service type you require
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <button
        type="button"
        onClick={() => onSelectService('holiday')}
        className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
          selectedService === 'holiday'
            ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <span className={`text-base sm:text-lg font-bold block ${selectedService === 'holiday' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
          Holiday Home Guest
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectService('private')}
        className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
          selectedService === 'private'
            ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <span className={`text-base sm:text-lg font-bold block ${selectedService === 'private' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
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
  <div className="pt-6 border-t border-[#E2E8F0] space-y-3">
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
  <div className="pt-6 border-t border-[#E2E8F0] space-y-3">
    <div>
      <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
        Select Cleaning Program
      </label>
      <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
        Choose the cleaning option that suits your needs
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
      <button
        type="button"
        onClick={() => onSelectProgram('general')}
        className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between w-full box-border touch-manipulation ${
          selectedProgram === 'general'
            ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <div className="space-y-2 w-full">
          <div className="flex justify-between items-center gap-2">
            <span className={`text-base sm:text-lg font-bold ${selectedProgram === 'general' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
              General Cleaning
            </span>
            <span className="text-lg sm:text-xl font-black text-[#006AFF] shrink-0">
              {currentPropertyInfo ? `€${currentPropertyInfo.pricing.general}` : '€'}
            </span>
          </div>
          {currentPropertyInfo?.pricing.note && (
            <p className="text-xs sm:text-sm text-[#8E9B9E]">
              {currentPropertyInfo.pricing.note}
            </p>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectProgram('turnover')}
        className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between w-full box-border touch-manipulation ${
          selectedProgram === 'turnover'
            ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <div className="space-y-2 w-full">
          <div className="flex justify-between items-start gap-2">
            <span className={`text-base sm:text-lg font-bold ${selectedProgram === 'turnover' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
              Turnover Cleaning
            </span>
            <span className="text-lg sm:text-xl font-black text-[#006AFF] shrink-0">
              {currentPropertyInfo ? `€${currentPropertyInfo.pricing.turnover}` : '€'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#8E9B9E] leading-relaxed break-words">
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
    <div className="pt-6 border-t border-[#E2E8F0] space-y-6">
      {/* Address Input */}
      <div className="space-y-2">
        <div>
          <label htmlFor="address-input" className="text-base sm:text-lg font-bold text-[#1E2B37] block">
            Address
          </label>
          <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
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

      {/* Building / Complex & Apartment / House No. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <label htmlFor="building-input" className="text-base sm:text-lg font-bold text-[#1E2B37] block">
            Building / Complex
          </label>
          <p className="text-xs sm:text-sm text-[#8E9B9E]">
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

        <div className="space-y-2">
          <label htmlFor="unit-input" className="text-base sm:text-lg font-bold text-[#1E2B37] block">
            Apartment / House No.
          </label>
          <p className="text-xs sm:text-sm text-[#8E9B9E]">
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

      {/* Google Maps Link */}
      <div className="space-y-2">
        <div>
          <label htmlFor="map-input" className="text-base sm:text-lg font-bold text-[#1E2B37] block">
            Google Maps Link
          </label>
          <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
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

      {/* Private Service Program Selection */}
      <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
        <div>
          <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
            Select Service Program
          </label>
          <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
            Choose the service type that matches your requirements
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
          <button
            type="button"
            onClick={() => onPrivateProgramChange('general')}
            className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
              selectedPrivateProgram === 'general'
                ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
            }`}
          >
            <span className={`text-base sm:text-lg font-bold block ${selectedPrivateProgram === 'general' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
              General Cleaning
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPrivateProgramChange('deep')}
            className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
              selectedPrivateProgram === 'deep'
                ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
            }`}
          >
            <span className={`text-base sm:text-lg font-bold block ${selectedPrivateProgram === 'deep' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
              Deep Cleaning
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPrivateProgramChange('office')}
            className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
              selectedPrivateProgram === 'office'
                ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
            }`}
          >
            <span className={`text-base sm:text-lg font-bold block ${selectedPrivateProgram === 'office' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
              Office Cleaning
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPrivateProgramChange('garden')}
            className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
              selectedPrivateProgram === 'garden'
                ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
            }`}
          >
            <span className={`text-base sm:text-lg font-bold block ${selectedPrivateProgram === 'garden' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
              Garden Cleaning <span className="text-xs sm:text-sm font-normal text-[#8E9B9E] block sm:inline">(Upon Request)</span>
            </span>
          </button>
        </div>
      </div>

      {/* Choose Type Of Property (General / Deep Cleaning) */}
      {(selectedPrivateProgram === 'general' || selectedPrivateProgram === 'deep') && (
        <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
          <div>
            <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
              Choose Type Of Property
            </label>
            <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
              Select whether your property is a house or an apartment
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
            <button
              type="button"
              onClick={() => onPropertyTypeChange('house')}
              className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                propertyType === 'house'
                  ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                  : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
              }`}
            >
              <span className={`text-base sm:text-lg font-bold block ${propertyType === 'house' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                House
              </span>
            </button>

            <button
              type="button"
              onClick={() => onPropertyTypeChange('apartment')}
              className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                propertyType === 'apartment'
                  ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                  : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
              }`}
            >
              <span className={`text-base sm:text-lg font-bold block ${propertyType === 'apartment' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                Apartment
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Choose How Many Bedroom(s) */}
      {(selectedPrivateProgram === 'general' || selectedPrivateProgram === 'deep') && propertyType && (
        <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
          <div>
            <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
              Choose How Many Bedroom(s)
            </label>
            <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
              Select the number of bedrooms in your property
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-1">
            {bedroomOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onBedroomsChange(opt.value)}
                className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                  bedrooms === opt.value
                    ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                }`}
              >
                <span className={`text-base sm:text-lg font-bold block ${bedrooms === opt.value ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Choose How Many Bathroom(s) */}
      {(selectedPrivateProgram === 'general' || selectedPrivateProgram === 'deep') && propertyType && (
        <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
          <div>
            <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
              Choose How Many Bathroom(s)
            </label>
            <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
              Select the number of bathrooms in your property
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-1">
            {bathroomOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onBathroomsChange(opt.value)}
                className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                  bathrooms === opt.value
                    ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                }`}
              >
                <span className={`text-base sm:text-lg font-bold block ${bathrooms === opt.value ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Choose How Many Balconies / Verandahs */}
      {(selectedPrivateProgram === 'general' || selectedPrivateProgram === 'deep') && propertyType && (
        <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
          <div>
            <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
              Choose How Many Balconies / Verandahs
            </label>
            <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
              Select the number of balconies or verandahs in your property
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
            {balconyOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onBalconiesChange(opt.value)}
                className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                  balconies === opt.value
                    ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                }`}
              >
                <span className={`text-base sm:text-lg font-bold block ${balconies === opt.value ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Office Cleaning Specifics */}
      {selectedPrivateProgram === 'office' && (
        <>
          <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
                How Many Square Meters (m²)?
              </label>
              <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
                Select the approximate total area of your office
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
              {officeSquareMetersOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onOfficeSquareMetersChange(opt.value)}
                  className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                    officeSquareMeters === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                  }`}
                >
                  <span className={`text-base sm:text-lg font-bold block ${officeSquareMeters === opt.value ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
                How Many Toilets?
              </label>
              <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
                Select the number of toilets in your office
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-1">
              {officeToiletOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onOfficeToiletsChange(opt.value)}
                  className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                    officeToilets === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                  }`}
                >
                  <span className={`text-base sm:text-lg font-bold block ${officeToilets === opt.value ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
                How Many Balconies?
              </label>
              <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
                Select the number of balconies in your office
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-1">
              {officeBalconyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onOfficeBalconiesChange(opt.value)}
                  className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                    officeBalconies === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                  }`}
                >
                  <span className={`text-base sm:text-lg font-bold block ${officeBalconies === opt.value ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Would you like to clean the windows? */}
          <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
                Would you like to clean the windows?
              </label>
              <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
                Select whether window cleaning service is needed
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
              <button
                type="button"
                onClick={() => onOfficeCleanWindowsChange('yes')}
                className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                  officeCleanWindows === 'yes'
                    ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                }`}
              >
                <span className={`text-base sm:text-lg font-bold block ${officeCleanWindows === 'yes' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                  Yes
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOfficeCleanWindowsChange('no')}
                className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                  officeCleanWindows === 'no'
                    ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                    : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                }`}
              >
                <span className={`text-base sm:text-lg font-bold block ${officeCleanWindows === 'no' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                  No
                </span>
              </button>
            </div>
          </div>

          {/* How Many Windows? (แสดงเฉพาะเมื่อตอบ Yes) */}
          {officeCleanWindows === 'yes' && (
            <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
              <div>
                <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
                  How Many Windows?
                </label>
                <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
                  Select the number of windows to clean
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-1">
                {officeWindowCountOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onOfficeWindowsCountChange(opt.value)}
                    className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                      officeWindowsCount === opt.value
                        ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                        : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                    }`}
                  >
                    <span className={`text-base sm:text-lg font-bold block ${officeWindowsCount === opt.value ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Garden Cleaning Specifics */}
      {selectedPrivateProgram === 'garden' && (
        <>
          <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
                How Many Square Meters (m²)?
              </label>
              <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
                Select the approximate total area of your garden
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
              {gardenSquareMetersOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onGardenSquareMetersChange(opt.value)}
                  className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                    gardenSquareMeters === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                  }`}
                >
                  <span className={`text-base sm:text-lg font-bold block ${gardenSquareMeters === opt.value ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <div>
              <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
                Select Type Of Garden
              </label>
              <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
                Choose what type of garden work is required
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-1">
              {gardenTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onGardenTypeChange(opt.value as 'weeds' | 'trees' | 'other')}
                  className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center text-center w-full box-border touch-manipulation ${
                    gardenType === opt.value
                      ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
                      : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
                  }`}
                >
                  <span className={`text-base sm:text-lg font-bold block ${gardenType === opt.value ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            {gardenType === 'other' && (
              <div className="pt-3 space-y-2">
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
  <div className="pt-6 border-t border-[#E2E8F0] space-y-3 w-full max-w-full">
    <div>
      <label htmlFor="service-date" className="text-base sm:text-lg font-bold text-[#1E2B37] block">
        Select Service Date
      </label>
      <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
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
        required // 👈 เติม required ตรงนี้ครับ
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
  <div className="pt-6 border-t border-[#E2E8F0] space-y-3">
    <div>
      <label className="text-base sm:text-lg font-bold text-[#1E2B37] block">
        Select Time
      </label>
      <p className="text-xs sm:text-sm text-[#8E9B9E] mt-0.5">
        Choose your preferred time slot for the service
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
      <button
        type="button"
        onClick={() => onSelectTime('morning')}
        className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl text-center border-2 transition-all cursor-pointer flex flex-col items-center justify-center w-full box-border touch-manipulation ${
          selectedTime === 'morning'
            ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <div className="space-y-1 w-full">
          <span className={`text-base sm:text-lg font-bold block ${selectedTime === 'morning' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
            Morning
          </span>
          <span className="text-xs sm:text-sm text-[#8E9B9E] block">
            09:00 - 12:00 hrs
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectTime('afternoon')}
        className={`p-5 sm:p-6 rounded-xl sm:rounded-2xl text-center border-2 transition-all cursor-pointer flex flex-col items-center justify-center w-full box-border touch-manipulation ${
          selectedTime === 'afternoon'
            ? 'bg-[#EAF3F9] border-[#006AFF] shadow-sm'
            : 'bg-white border-[#E2E8F0] hover:border-[#93C5FD]'
        }`}
      >
        <div className="space-y-1 w-full">
          <span className={`text-base sm:text-lg font-bold block ${selectedTime === 'afternoon' ? 'text-[#006AFF]' : 'text-[#1E2B37]'}`}>
            Afternoon
          </span>
          <span className="text-xs sm:text-sm text-[#8E9B9E] block">
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
      // 1. คำนวณวันพรุ่งนี้สำหรับตั้งค่า minDate
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const minDateStr = `${year}-${month}-${day}`;
      
      setMinDate(minDateStr);

      // 2. ดึงข้อมูล User/Profile จาก Supabase และ localStorage
      const fetchUserData = async () => {
        let name = localStorage.getItem('user_name') || '';
        let email = localStorage.getItem('user_email') || '';
        let phone = localStorage.getItem('user_phone') || '';

        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            email = user.email || email;
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

            if (profile) {
              name = profile.full_name || profile.name || name;
              phone = profile.phone || profile.mobile || phone;
            }
          }
        }

        setCustomerInfo({ name, email, phone });
      };

      fetchUserData();

      // 3. ดึงข้อมูลเดิมจาก sessionStorage กลับมาเซตใส่ State
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
          
          // ข้อมูลฝั่ง Private Home
          if (parsed.address) setPrivateAddress(parsed.address);
          if (parsed.buildingComplex) setPrivateBuildingComplex(parsed.buildingComplex);
          if (parsed.apartmentHouseNo) setPrivateApartmentHouseNo(parsed.apartmentHouseNo);
          if (parsed.mapLink) setGoogleMapsLink(parsed.mapLink);
          if (parsed.program && parsed.service === 'private') setSelectedPrivateProgram(parsed.program);
          if (parsed.propertyType) setPrivatePropertyType(parsed.propertyType);
          if (parsed.bedrooms) setPrivateBedrooms(parsed.bedrooms);
          if (parsed.bathrooms) setPrivateBathrooms(parsed.bathrooms);
          if (parsed.balconies) setPrivateBalconies(parsed.balconies);
          
          // รายละเอียด Office
          if (parsed.officeSquareMeters) setOfficeSquareMeters(parsed.officeSquareMeters);
          if (parsed.officeToilets) setOfficeToilets(parsed.officeToilets);
          if (parsed.officeBalconies) setOfficeBalconies(parsed.officeBalconies);
          if (parsed.officeCleanWindows) setOfficeCleanWindows(parsed.officeCleanWindows);
          if (parsed.officeWindowsCount) setOfficeWindowsCount(parsed.officeWindowsCount);
          
          // รายละเอียด Garden
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

  // Handler เปลี่ยนแปลงบริการหลัก
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

  // ค้นหาข้อมูลกลุ่มของ Property ที่เลือก
  const currentPropertyInfo = PROPERTY_DATA.find((group) =>
    group.items.includes(selectedProperty)
  );

  // ฟังก์ชันจัดการเมื่อกด Submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 📌 Validation เบื้องต้นก่อนส่งข้อมูล
    if (!selectedDate) {
      alert("กรุณาเลือกวันที่ต้องการรับบริการ");
      return;
    }
    if (!selectedTime) {
      alert("กรุณาเลือกรอบเวลาที่ต้องการ");
      return;
    }

    if (selectedService === 'holiday') {
      if (!selectedProperty) {
        alert("กรุณาเลือกอสังหาริมทรัพย์ / Property");
        return;
      }
      if (!selectedProgram) {
        alert("กรุณาเลือกโปรแกรมทำความสะอาด");
        return;
      }
    } else {
      if (!selectedPrivateProgram) {
        alert("กรุณาเลือกแพ็กเกจบริการทำความสะอาดบ้าน/ออฟฟิศ");
        return;
      }
      if (!privateAddress.trim()) {
        alert("กรุณาระบุที่อยู่สำหรับให้บริการ");
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

    // แปลงชื่อโปรแกรมให้รองรับทั้ง Holiday และ Private
    let formattedProgramName = '';
    if (selectedService === 'holiday') {
      formattedProgramName = selectedProgram === 'general'
        ? 'General Cleaning'
        : 'Turnover Cleaning (Cleaning & change all sheets and towels)';
    } else {
      const privateProgramNames = {
        general: 'Private Home - General Cleaning',
        deep: 'Private Home - Deep Cleaning',
        office: 'Office Cleaning',
        garden: 'Garden Maintenance',
      };
      formattedProgramName = selectedPrivateProgram ? privateProgramNames[selectedPrivateProgram] : 'Private Service';
    }

    const formData = selectedService === 'holiday' 
      ? {
          service: 'holiday',
          property: selectedProperty,
          program: selectedProgram,
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
          buildingComplex: privateBuildingComplex,
          apartmentHouseNo: privateApartmentHouseNo,
          mapLink: googleMapsLink,
          mapsLink: googleMapsLink,
          googleMapsLink: googleMapsLink,
          program: selectedPrivateProgram,
          propertyType: privatePropertyType,
          bedrooms: privateBedrooms,
          bathrooms: privateBathrooms,
          balconies: privateBalconies,
          officeSquareMeters: officeSquareMeters,
          officeToilets: officeToilets,
          officeBalconies: officeBalconies,
          officeCleanWindows: officeCleanWindows,
          officeWindowsCount: officeCleanWindows === 'yes' ? officeWindowsCount : null,
          gardenSquareMeters: gardenSquareMeters,
          gardenType: gardenType,
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
        room: roomCount,
        price: calculatedPrice.toString(),
        apartment: selectedProperty || '',
        name: customerInfo.name || '',
        email: customerInfo.email || '',
        phone: customerInfo.phone || '',
      }).toString();

      router.push(`/customer/payment?${queryParams}`);
    } else {
      // เคส Private Service
      const generatedRef = `PRV-${Math.floor(100000 + Math.random() * 900000)}`;

      const validScheduledTime = selectedTime === 'morning' 
        ? '09:00:00' 
        : selectedTime === 'afternoon' 
        ? '13:00:00' 
        : null;

      // 📌 ใส่ทุกคีย์ให้ครบ รองรับทุกแบบที่แอดมินจะเรียกใช้
      const privateDetails = {
        program: selectedPrivateProgram,
        program_name: formattedProgramName,
        property_type: privatePropertyType,
        bedrooms: privateBedrooms,
        bathrooms: privateBathrooms,
        balconies: privateBalconies,
        address: privateAddress,                     // 👈 ใส่เพิ่ม
        building_complex: privateBuildingComplex,
        buildingComplex: privateBuildingComplex,      // 👈 ใส่เพิ่ม
        apartment_house_no: privateApartmentHouseNo,
        apartmentHouseNo: privateApartmentHouseNo,    // 👈 ใส่เพิ่ม
        google_maps_link: googleMapsLink,
        googleMapsLink: googleMapsLink,              // 👈 ใส่เพิ่ม
        mapLink: googleMapsLink,                     // 👈 ใส่เพิ่ม
        office_sqm: officeSquareMeters,
        office_toilets: officeToilets,
        office_balconies: officeBalconies,
        office_clean_windows: officeCleanWindows,
        office_windows_count: officeCleanWindows === 'yes' ? officeWindowsCount : null,
        garden_sqm: gardenSquareMeters,
        garden_type: gardenType,
        garden_other_details: gardenType === 'other' ? gardenOtherDetails : '',
      };

      try {
        const { data, error } = await supabase.from('bookings').insert([
          {
            booking_ref: generatedRef,
            customer_name: customerInfo.name || null,
            email: customerInfo.email || null,
            phone: customerInfo.phone || null,
            address_line: privateAddress || '',
            scheduled_date: selectedDate || null,
            scheduled_time: validScheduledTime,
            service_type: 'private',
            
            // 📌 ใส่ฟิลด์ details กลับเข้าไป โดยแปลง privateDetails เป็น JSON String
            details: JSON.stringify(privateDetails),
            
            price: 0,
            payment_method: 'direct_request',
            payment_status: 'pending',
            status: 'pending',
          },
        ]).select();
        
        if (error) {
          console.error('Supabase Insert Error Detail:', error);
          alert(`เกิดข้อผิดพลาดจาก Supabase: ${error.message} (${error.details || ''})`);
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
    <main className="min-h-screen w-full overflow-x-hidden bg-white py-4 sm:py-8">
      <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-8 space-y-6"
        >
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E2B37]">
              Book a Cleaning Service
            </h1>
            <p className="text-sm text-[#8E9B9E]">
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

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#006AFF] px-5 py-4 text-base font-bold text-white transition-colors hover:bg-[#0057D9] focus:outline-none focus:ring-2 focus:ring-[#006AFF] focus:ring-offset-2"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default BookingForm;
