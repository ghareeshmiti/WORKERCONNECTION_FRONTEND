export type RTCStop = { id: string; name: string };
export type RTCRoute = {
  code: string;              // NTR-500D
  name: string;              // Route 500D
  stops: RTCStop[];          // ordered
};

export type RTCBus = {
  busNo: string;             // AP-31-Z-1234
  routeCode: string;         // NTR-500D
};

export const NTR_ROUTES: RTCRoute[] = [
  {
    code: "NTR-500D",
    name: "Route 500D",
    stops: [
      { id: "ntr", name: "NTR Bus Station" },
      { id: "gaj", name: "Gajuwaka" },
      { id: "stl", name: "Steel Plant" },
      { id: "vzg", name: "Vizag RTC Complex" },
    ],
  },
  {
    code: "NTR-PL",
    name: "Purple Line",
    stops: [
      { id: "ntr", name: "NTR Bus Station" },
      { id: "mgr", name: "MG Road" },
      { id: "maj", name: "Majestic" },
    ],
  },
];

export const NTR_BUSES: RTCBus[] = [
  { busNo: "AP-31-Z-1234", routeCode: "NTR-500D" },
  { busNo: "AP-39-AA-9090", routeCode: "NTR-PL" },
];