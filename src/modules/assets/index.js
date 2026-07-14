/* BUSINESS SUB-MODULE REORG (2026-07-13): AcmRegister moved to
   modules/accounts/bsp-airline/acmRegister.jsx (MENU_ACCOUNTS ▸ BSP & Airline)
   — re-exported below so App.jsx's direct chunk import of this barrel needed
   zero changes. The remaining Admin ▸ Assets screens stay in ./assets. */
export * from './assets';
export { AcmRegister } from '../accounts/bsp-airline/acmRegister';
