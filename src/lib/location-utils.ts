import { INDIA_LOCATIONS, District, Mandal, Village } from "@/data/india-locations";

export function getLocationNames(
    districtCode?: string,
    mandalCode?: string,
    villageCode?: string
): { districtName: string; mandalName: string; villageName: string } {
    let districtName = "";
    let mandalName = "";
    let villageName = "";

    if (!districtCode) return { districtName, mandalName, villageName };

    const district = INDIA_LOCATIONS.districts.find((d) => d.code === districtCode);
    if (district) {
        districtName = district.name;

        if (mandalCode) {
            // Mandals are nested in subdivisions
            for (const sub of district.subdivisions) {
                const mandal = sub.mandals.find((m) => m.code === mandalCode);
                if (mandal) {
                    mandalName = mandal.name;

                    if (villageCode) {
                        const village = mandal.villages.find((v) => v.code === villageCode);
                        if (village) {
                            villageName = village.name;
                        }
                    }
                    break; // Found the mandal
                }
            }
        }
    }

    // Fallbacks if only codes are available (though less useful)
    return {
        districtName: districtName || districtCode,
        mandalName: mandalName || mandalCode || "",
        villageName: villageName || villageCode || "",
    };
}

export function formatLocationString(district?: string, mandal?: string, village?: string): string {
    if (!district && !mandal && !village) return "--";

    const { districtName, mandalName, villageName } = getLocationNames(district, mandal, village);

    const parts = [];
    if (districtName) parts.push(districtName);
    if (mandalName) parts.push(mandalName);
    if (villageName) parts.push(villageName);

    return parts.join(" - ");
}
