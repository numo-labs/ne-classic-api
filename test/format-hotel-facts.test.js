var formatHotelFacts = require('../lib/format-hotel-facts');
var assert = require('assert');
var hotels = require('./fixtures/hotels.json');

describe('formatHotelFacts', function () {
  it('exit early if hotel does not have facts object', function (done) {
    var neHotel = {};
    var amenities = formatHotelFacts(neHotel);
    assert.deepEqual(amenities, {}, 'No Amenities');
    done();
  });

  it('process hotels to exercise all code branches', function (done) {
    var amenities = {};
    hotels.forEach(function (h) {
      var am = formatHotelFacts(h); // over-write
      Object.keys(am).forEach(function (k) {
        amenities[k] = amenities[k] || 1; // initialise to 1
        amenities[k] = am[k] ? amenities[k] + 1 : amenities[k]; // increment
      });
    });
    console.log('> Frequency of ocurrence for NE Amenities:\n', amenities);
    assert.ok(amenities.wifi > 1);
    done();
  });

  it('check how many hotels dont have ANY amenities', function (done) {
    var count = 0;
    hotels.forEach(function (h) {
      count = !h.facts ? count + 1 : count; // count how many hotels don't have facts
    });
    console.log(count + ' out of ' + hotels.length + ' Hotels do NOT have any facts (4Niki)');
    assert.ok(count === 0);
    done();
  });
});
