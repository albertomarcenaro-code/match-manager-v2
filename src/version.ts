/**
 * Versionamento applicazione.
 *
 * MAJOR_VERSION: gestita MANUALMENTE dagli sviluppatori.
 *   Cambiala quando introduci nuove funzionalità rilevanti (es. "1.1", "2.0").
 *
 * BUILD_NUMBER: gestito AUTOMATICAMENTE.
 *   Viene incrementato di 1 ad ogni build di produzione (pubblicazione su Lovable)
 *   dal plugin `buildCounter` in vite.config.ts. Non modificarlo a mano.
 */
export const MAJOR_VERSION = "1.0";

// AUTO-GENERATED-BUILD-NUMBER
export const BUILD_NUMBER = 1;

export const APP_VERSION = `v${MAJOR_VERSION}.${BUILD_NUMBER}`;
