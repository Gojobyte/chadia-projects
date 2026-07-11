// Déclaration locale en attendant l'install npm dans node_modules.
// Sera ignorée dès que `isomorphic-dompurify` est installé pour de vrai.

declare module "isomorphic-dompurify" {
  export interface Config {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    FORBID_TAGS?: string[];
    FORBID_ATTR?: string[];
  }

  function sanitize(dirty: string, config?: Config): string;

  const DOMPurify: {
    sanitize: typeof sanitize;
  };

  export default DOMPurify;
}
