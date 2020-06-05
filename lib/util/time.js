"use strict";

// We create a datestamp whereby later dates have a **lower** number so that
// can always take the first result in a bucket (which is easy and cheap)
// rather than trying to get the last item in a bucket (which is hard and
// expensive).
//
// Pad date integers to max length for consistent ordering. (Should be 16);
// http://stackoverflow.com/a/28425951
const MAX_DATE = 8640000000000000;
const MAX_DATE_LENGTH = MAX_DATE.toString().length;

/**
 * Pad length amount of digits in number string.
 *
 * @param {Number} len  number of digits to pad with "0"
 * @param {Number} num  number to convert
 * @returns {String}    padded string
 */
const padNum = (len, num) => num.toString().padStart(len, "0");

/**
 * Return padded integer derived from date whereby later dates have lower
 * numbers.
 *
 * Pads to maximum integer value digits length.
 *
 * @param {Date}  date  date to convert
 * @returns {String}    padded integer string
 */
const toDateNum = (date) => padNum(MAX_DATE_LENGTH, MAX_DATE - date.getTime());

const fromDateNum = (num) => new Date(MAX_DATE - num);

/**
 * Return string version of a date suitable for file naming.
 *
 * `2016-10-19T23:08:04.000Z` -> `20161019-230804-000`
 *
 * @param {Date}  date  date to convert
 * @returns {String}    padded integer string
 */
const toDatePath = (date) => date
  .toISOString()
  .replace(/[\-:]+|Z$/g, "")
  .replace(/[T\.]+/g, "-");

module.exports = {
  MAX_DATE,
  padNum,
  toDateNum,
  fromDateNum,
  toDatePath
};
