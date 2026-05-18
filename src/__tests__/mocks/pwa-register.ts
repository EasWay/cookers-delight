export function useRegisterSW() {
  return { needRefresh: [false, () => {}] as [boolean, () => void], updateServiceWorker: () => {} };
}
