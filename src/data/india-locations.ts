/**
 * India Location Master Data
 * Single source of truth for all district/mandal/village dropdowns
 * DO NOT modify structure or values - use AS-IS
 */

export interface Village {
  code: string;
  name: string;
}

export interface Mandal {
  code: string;
  name: string;
  villages: Village[];
}

export interface Subdivision {
  code: string;
  name: string;
  mandals: Mandal[];
}

export interface District {
  code: string;
  name: string;
  subdivisions: Subdivision[];
}

export interface LocationData {
  districts: District[];
}

export const INDIA_LOCATIONS: LocationData = {
  "districts": [
    {
      "code": "01",
      "name": "HYDERABAD",
      "subdivisions": [
        {
          "code": "01",
          "name": "HYDERABAD",
          "mandals": [
            {
              "code": "01",
              "name": "HYDERABAD",
              "villages": [
                { "code": "0101001", "name": "Saroornagar" },
                { "code": "0101002", "name": "Nampally" },
                { "code": "0101003", "name": "Secunderabad" }
              ]
            }
          ]
        }
      ]
    },
    {
      "code": "02",
      "name": "RANGA REDDY",
      "subdivisions": [
        {
          "code": "01",
          "name": "L.B. NAGAR",
          "mandals": [
            {
              "code": "01",
              "name": "L.B. NAGAR",
              "villages": [
                { "code": "0201001", "name": "Hayathnagar" },
                { "code": "0201002", "name": "Malakpet" },
                { "code": "0201003", "name": "Ghatkesar" }
              ]
            }
          ]
        }
      ]
    },
    {
      "code": "03",
      "name": "KARIMNAGAR",
      "subdivisions": [
        {
          "code": "01",
          "name": "KARIMNAGAR",
          "mandals": [
            {
              "code": "01",
              "name": "KARIMNAGAR",
              "villages": [
                { "code": "0301001", "name": "Malkapur" },
                { "code": "0301002", "name": "Huzurabad" },
                { "code": "0301003", "name": "Nagarjuna Sagar" }
              ]
            }
          ]
        }
      ]
    },
    {
      "code": "04",
      "name": "WARANGAL",
      "subdivisions": [
        {
          "code": "01",
          "name": "WARANGAL",
          "mandals": [
            {
              "code": "01",
              "name": "WARANGAL",
              "villages": [
                { "code": "0401001", "name": "Kazipet" },
                { "code": "0401002", "name": "Hanamkonda" },
                { "code": "0401003", "name": "Cherial" }
              ]
            }
          ]
        }
      ]
    }
  ]
}

// Helper functions to get cascading dropdown data
export function getDistricts(): { code: string; name: string }[] {
  return INDIA_LOCATIONS.districts.map(d => ({ code: d.code, name: d.name }));
}

export function getMandalsForDistrict(districtName: string): { code: string; name: string }[] {
  const district = INDIA_LOCATIONS.districts.find(d => d.name === districtName);
  if (!district) return [];

  const mandals: { code: string; name: string }[] = [];
  district.subdivisions.forEach(sub => {
    sub.mandals.forEach(m => {
      mandals.push({ code: m.code, name: m.name });
    });
  });
  return mandals.sort((a, b) => a.name.localeCompare(b.name));
}

export function getVillagesForMandal(districtName: string, mandalName: string): { code: string; name: string }[] {
  const district = INDIA_LOCATIONS.districts.find(d => d.name === districtName);
  if (!district) return [];

  for (const sub of district.subdivisions) {
    const mandal = sub.mandals.find(m => m.name === mandalName);
    if (mandal) {
      return mandal.villages.map(v => ({ code: v.code, name: v.name })).sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  return [];
}

// Validation helpers
export function isValidMandal(districtName: string, mandalName: string): boolean {
  const mandals = getMandalsForDistrict(districtName);
  return mandals.some(m => m.name === mandalName);
}

export function isValidVillage(districtName: string, mandalName: string, villageName: string): boolean {
  const villages = getVillagesForMandal(districtName, mandalName);
  return villages.some(v => v.name === villageName);
}
