"use strict";

/* eslint-disable no-magic-numbers*/

const { padNum, toDateNum, toDatePath } = require("../../../lib/util/time");

describe("lib/util/time", () => {
  describe("padNum", () => {
    it("handles base cases", () => {
      expect(padNum(0, 1)).to.eql("1");
      expect(padNum(1, 1)).to.eql("1");
      expect(padNum(1, 123)).to.eql("123");
    });

    it("handles padded cases", () => {
      expect(padNum(2, 1)).to.eql("01");
      expect(padNum(4, 1)).to.eql("0001");
      expect(padNum(10, 123)).to.eql("0000000123");
    });
  });

  describe("toDateNum", () => {
    it("TODO: base cases");
    it("TODO: general cases");
  });

  describe("toDatePath", () => {
    it("converts dates", () => {
      expect(toDatePath(new Date(0))).to.eql("19700101-000000-000");
      expect(toDatePath(new Date('05 October 2011 14:48 UTC'))).to.eql("20111005-144800-000");
    })
  });
});
