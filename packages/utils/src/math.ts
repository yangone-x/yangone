import Decimal from 'decimal.js';

/**
 * 两数相加
 */
function add(a: number, b: number) {
  return new Decimal(a).plus(b).toNumber();
}

/**
 * 两数相减
 */
function subtract(a: number, b: number) {
  return new Decimal(a).minus(b).toNumber();
}

/**
 * 两数相乘
 */
function multiply(a: number, b: number) {
  return new Decimal(a).times(b).toNumber();
}

/**
 * 两数相除
 */
function divide(a: number, b: number) {
  return new Decimal(a).div(b).toNumber();
}

export { add, Decimal, divide, multiply, subtract };
