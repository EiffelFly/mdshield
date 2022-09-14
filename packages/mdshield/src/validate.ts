import {
  MdShieldType,
  MdShieldPrimitives,
  MdShieldDiagnostic,
  MdShieldError,
} from "./type";

export const validatePrimitives = (
  types: MdShieldType,
  key: string,
  value: MdShieldPrimitives
): MdShieldDiagnostic | MdShieldError => {
  try {
    const targetType = types[key];
    const valueType = typeof value;

    if (
      typeof targetType !== "object" &&
      valueType === "object" &&
      value !== null
    ) {
      return {
        key,
        value,
        pass: false,
      };
    }

    if (
      typeof targetType === "object" &&
      valueType !== "object" &&
      value !== null
    ) {
      return {
        key,
        value,
        pass: false,
      };
    }

    if (
      typeof targetType === "object" &&
      valueType === "object" &&
      value !== null
    ) {
      return {
        key,
        value,
        pass: true,
      };
    }

    const targetTypeList: string[] = (targetType as string)
      .replace(/\s+/g, "")
      .split("|");

    let primitivePass = false;

    // User can use union type like string | number

    if (targetTypeList.includes(valueType)) {
      primitivePass = true;
    }

    // User can use multiple pre-set string like "test1" | "test2"

    if (valueType === "string") {
      if (targetTypeList.includes(value as string)) {
        primitivePass = true;
      }
    }

    // User can use multiple pre-set string like "test1" | 123

    if (valueType === "number") {
      const targetTypeNumList = targetTypeList.map(Number);
      if (targetTypeNumList.includes(value as number)) {
        primitivePass = true;
      }
    }

    // User can use multiple pre-set string like "test1" | false

    if (valueType === "boolean") {
      if (value) {
        if (targetTypeList.includes("true")) {
          primitivePass = true;
        }
      } else {
        if (targetTypeList.includes("false")) {
          primitivePass = true;
        }
      }

      if (targetTypeList.includes("boolean")) {
        primitivePass = true;
      }
    }

    // User can use multiple pre-set string like "test1" | null

    if (value === null) {
      if (targetTypeList.includes("null")) {
        primitivePass = true;
      }
    }

    return {
      key,
      value,
      pass: primitivePass,
    };
  } catch (err) {
    console.log(err);
    if (err instanceof Error) {
      return {
        error: true,
        message: err.message,
      };
    } else {
      return {
        error: true,
        message: "",
      };
    }
  }
};
