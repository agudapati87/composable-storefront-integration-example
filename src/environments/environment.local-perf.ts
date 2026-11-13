// Same backends/tokens as `local`, without NgRx StoreDevtools (it serializes the store on every
// action). Used by the `local-perf` configuration to measure FCP/LCP on an optimized build.
export { environment } from './environment.local';

export const externalModules = [];
