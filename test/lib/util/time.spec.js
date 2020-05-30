"use strict";

/* eslint-disable no-magic-numbers*/

const { MAX_DATE, padNum, toDateNum, toDatePath } = require("../../../lib/util/time");

describe("lib/util/time", () => {
  describe("#padNum", () => {
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

  describe("#toDateNum", () => {
    it("handles epoch", () => {
      expect(toDateNum(new Date(0))).to.eql(MAX_DATE.toString());
    });

    it("handles various dates", () => {
      // Array of increasing (later) dates.
      [1, 123, 9876543]
        .map((date) => ({ date, num: parseInt(toDateNum(new Date(date))) }))
        .forEach(({ date, num }, i, objs) => {
          if (i > 0) {
            const prevObj = objs[i - 1];

            // Each number should be lower than previous (earlier) date.
            expect(num).to.be.below(prevObj.num);

            // Check that we're **actually** doing early - late dates :P
            expect(date).to.be.above(prevObj.date);
          }

          // Check actual date number.
          expect(num).to.eql(MAX_DATE - date);
        });
    });

    it("handles the end of time", () => {
      expect(toDateNum(new Date(MAX_DATE))).to.eql(new Array(16 + 1).join("0"));
    });
  });

  describe("#toDatePath", () => {
    it("converts various dates", () => {
      expect(toDatePath(new Date(0))).to.eql("19700101-000000-000");
      expect(toDatePath(new Date("05 October 2011 14:48 UTC"))).to.eql("20111005-144800-000");
    });

    it("converts dates without ms", () => {
      expect(toDatePath(new Date("2016-10-19T23:08:04Z"))).to.eql(
        "20161019-230804-000"
      );
      expect(toDatePath(new Date("2016-10-20T00:00:00Z"))).to.eql(
        "20161020-000000-000"
      );
    });

    it("converts dates with ms", () => {
      expect(toDatePath(new Date("2016-10-19T23:08:04.000Z"))).to.eql(
        "20161019-230804-000"
      );
      expect(toDatePath(new Date("2016-10-20T00:00:00.120Z"))).to.eql(
        "20161020-000000-120"
      );
    });
  });
});
