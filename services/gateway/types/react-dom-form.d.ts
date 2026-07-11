// Déclaration temporaire des hooks form de react-dom en attendant que
// @types/react-dom soit installé dans node_modules (next install Docker).
// Une fois @types/react-dom 19.x installé en devDependencies, ce fichier
// peut être supprimé.

declare module "react-dom" {
  export interface FormStatusNotPending {
    pending: false;
    data: null;
    method: null;
    action: null;
  }

  export interface FormStatusPending {
    pending: true;
    data: FormData;
    method: "get" | "post";
    action: ((formData: FormData) => void | Promise<void>) | string;
  }

  export type FormStatus = FormStatusPending | FormStatusNotPending;

  export function useFormStatus(): FormStatus;
}
