'use client';

import { AFRICAN_COUNTRIES } from '@/types';
import { Role } from '@/types';

interface RoleSelectorProps {
  selectedRole: Role | '';
  onRoleChange: (role: Role) => void;
  selectedCountry?: string;
  onCountryChange?: (country: string) => void;
}

export default function RoleSelector({
  selectedRole,
  onRoleChange,
  selectedCountry,
  onCountryChange,
}: RoleSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Your Role *
        </label>
        <div className="space-y-2">
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="role"
              value="representative"
              checked={selectedRole === 'representative'}
              onChange={(e) => onRoleChange(e.target.value as Role)}
              className="mr-3"
            />
            <div>
              <div className="font-medium">Team Representative</div>
              <div className="text-sm text-gray-500">Register and manage your country's team</div>
            </div>
          </label>
          
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="role"
              value="visitor"
              checked={selectedRole === 'visitor'}
              onChange={(e) => onRoleChange(e.target.value as Role)}
              className="mr-3"
            />
            <div>
              <div className="font-medium">Visitor</div>
              <div className="text-sm text-gray-500">View tournaments and match results</div>
            </div>
          </label>
        </div>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Need admin access?</strong> Only existing administrators can grant admin privileges. 
            Please contact an administrator or register as a visitor if you need to view tournaments.
          </p>
        </div>
      </div>

      {selectedRole === 'representative' && onCountryChange && (
        <div>
          <label htmlFor="country" className="label-field">
            Select Your Country *
          </label>
          <select
            id="country"
            value={selectedCountry || ''}
            onChange={(e) => onCountryChange(e.target.value)}
            required
            className="input-select"
          >
            <option value="">Select your country</option>
            {AFRICAN_COUNTRIES.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Each country can only have one representative per tournament
          </p>
        </div>
      )}
    </div>
  );
}
