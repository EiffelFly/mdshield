import assert from "node:assert";
import test, { describe } from "node:test";
import { validatePrimitives } from "./validate";

describe("Validate primitives", () => {
  test("should validate object", () => {
    const types = {
      fooObj: {
        bar: "string",
      },
    };
    const key = "fooObj";
    const value = { bar: "hi" };
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const controlValue = "hi";
    const controlResult = validatePrimitives(types, key, controlValue);
    assert.deepEqual(controlResult, { key, value: controlValue, pass: false });
  });

  test("should validate string", () => {
    const types = {
      fooString: "string",
    };
    const key = "fooString";
    const stringValue = "hi I am bar";
    const result = validatePrimitives(types, key, stringValue);
    assert.deepEqual(result, { key, value: stringValue, pass: true });

    const controlValue = 123;
    const controlResult = validatePrimitives(types, key, controlValue);
    assert.deepEqual(controlResult, { key, value: controlValue, pass: false });
  });

  test("should validate specific string", () => {
    const types = {
      specificString: "yo",
    };
    const key = "specificString";
    const value = "yo";
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const controlGroupValue = "foo";
    const controlGroupResult = validatePrimitives(
      types,
      key,
      controlGroupValue
    );
    assert.deepEqual(controlGroupResult, {
      key,
      value: controlGroupValue,
      pass: false,
    });
  });

  test("should validate multiple pre-set string", () => {
    const types = {
      multipleString: "yo | hi",
    };
    const key = "multipleString";
    const value = "yo";
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const secondValue = "hi";
    const secondResult = validatePrimitives(types, key, secondValue);
    assert.deepEqual(secondResult, { key, value: secondValue, pass: true });

    const controlGroupValue = "foo";
    const controlGroupResult = validatePrimitives(
      types,
      key,
      controlGroupValue
    );
    assert.deepEqual(controlGroupResult, {
      key,
      value: controlGroupValue,
      pass: false,
    });
  });

  test("should validate specific number", () => {
    const types = {
      specificNum: "123",
    };
    const key = "specificNum";
    const value = 123;
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const controlGroupValue = 321;
    const controlGroupResult = validatePrimitives(
      types,
      key,
      controlGroupValue
    );
    assert.deepEqual(controlGroupResult, {
      key,
      value: controlGroupValue,
      pass: false,
    });
  });

  test("should validate multiple pre-set number", () => {
    const types = {
      multipleNum: "123 | 321",
    };
    const key = "multipleNum";
    const value = "123";
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const secondValue = "321";
    const secondResult = validatePrimitives(types, key, secondValue);
    assert.deepEqual(secondResult, { key, value: secondValue, pass: true });

    const controlGroupValue = "123321";
    const controlGroupResult = validatePrimitives(
      types,
      key,
      controlGroupValue
    );
    assert.deepEqual(controlGroupResult, {
      key,
      value: controlGroupValue,
      pass: false,
    });
  });

  test("should validate multiple pre-set string and number", () => {
    const types = {
      strAndNumber: "123 | yo",
    };
    const key = "strAndNumber";
    const value = "123";
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const secondValue = "yo";
    const secondResult = validatePrimitives(types, key, secondValue);
    assert.deepEqual(secondResult, { key, value: secondValue, pass: true });

    const controlGroupValue = "foo";
    const controlGroupResult = validatePrimitives(
      types,
      key,
      controlGroupValue
    );
    assert.deepEqual(controlGroupResult, {
      key,
      value: controlGroupValue,
      pass: false,
    });
  });

  test("should validate string that has number", () => {
    const types = {
      strHasNum: "hi123yo",
    };
    const key = "strHasNum";
    const value = "hi123yo";
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });
  });

  test("should validate boolean - only false", () => {
    const types = {
      onlyFalse: "false",
    };
    const key = "onlyFalse";
    const value = false;
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const controlGroupValue = true;
    const controlGroupResult = validatePrimitives(
      types,
      key,
      controlGroupValue
    );
    assert.deepEqual(controlGroupResult, {
      key,
      value: controlGroupValue,
      pass: false,
    });
  });

  test("should validate boolean", () => {
    const types = {
      boolean: "boolean",
    };
    const key = "boolean";
    const value = false;
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const secondValue = true;
    const secondResult = validatePrimitives(types, key, secondValue);
    assert.deepEqual(secondResult, { key, value: secondValue, pass: true });

    const controlGroupValue = "foo";
    const controlGroupResult = validatePrimitives(
      types,
      key,
      controlGroupValue
    );
    assert.deepEqual(controlGroupResult, {
      key,
      value: controlGroupValue,
      pass: false,
    });
  });

  test("should validate boolean, string ands number", () => {
    const types = {
      booleanStrNum: "false | hi | 123",
    };
    const key = "booleanStrNum";
    const value = false;
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const secondValue = "hi";
    const secondResult = validatePrimitives(types, key, secondValue);
    assert.deepEqual(secondResult, { key, value: secondValue, pass: true });

    const thirdValue = "123";
    const thirdResult = validatePrimitives(types, key, thirdValue);
    assert.deepEqual(thirdResult, { key, value: thirdValue, pass: true });

    const controlGroupValue = "foo";
    const controlGroupResult = validatePrimitives(
      types,
      key,
      controlGroupValue
    );
    assert.deepEqual(controlGroupResult, {
      key,
      value: controlGroupValue,
      pass: false,
    });
  });

  test("should validate null", () => {
    const types = {
      nullValue: "null",
    };

    const key = "nullValue";
    const value = null;
    const result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    const controlGroupValue = "foo";
    const controlGroupResult = validatePrimitives(
      types,
      key,
      controlGroupValue
    );
    assert.deepEqual(controlGroupResult, {
      key,
      value: controlGroupValue,
      pass: false,
    });
  });

  test("should validate all", () => {
    const types = {
      all: "null | string | number | boolean",
    };

    const key = "all";
    let value = null;
    let result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    value = "hi";
    result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    value = 123;
    result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });

    value = true;
    result = validatePrimitives(types, key, value);
    assert.deepEqual(result, { key, value, pass: true });
  });
});
