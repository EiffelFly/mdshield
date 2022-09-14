export type MdShieldType = {
  [k: string]: string | MdShieldType;
};

export type MdShieldValue = {
  [k: string]: MdShieldValue | string | number | boolean | null;
};

export type MdShieldPrimitives =
  | number
  | string
  | MdShieldValue
  | boolean
  | null;

export type MdShieldDiagnostic = {
  key: string;
  value: MdShieldPrimitives;
  pass: boolean;
  [k: string]: any;
};

export type MdShieldError = {
  error: boolean;
  message: string;
};
