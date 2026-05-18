export function useRegisterSW() {
  return { needRefresh: [false, () => {}] as const, updateServiceWorker: () => Promise.resolve() };
}
