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
