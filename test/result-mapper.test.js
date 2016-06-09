var assert = require('assert');

var hotelSamples = require('./fixtures/hotels.json');
var packagesSamples = require('./fixtures/packages.json');

var mapper = require('../lib/result-mapper');

var hotelId = hotelSamples[0].wvId;
describe('Map the hotel results by their hotel id', function () {
  it('map_hotels_by_hotel_id transforms an NE Hotels API query array into an object', function (done) {
    var name = hotelSamples[0].name;
    var result = mapper.mapHotelsById(hotelSamples);
    assert.equal(result[hotelId].name, name, 'Hotel name: ' + result[hotelId].name);
    done();
  });

  it('mapHotelsById returns empty if no hotels supplied', function (done) {
    var result = mapper.mapHotelsById();
    assert.deepEqual(result, {}, 'no hotels');
    done();
  });
});

describe('Large Hotel Images', function () {
  it('mapLargeHotelImages returns default image if large unavailable', function (done) {
    hotelSamples.forEach(function (hotel) {
      var images = mapper.mapLargeHotelImages(hotel);
      if (images.length < 1) {
        var img = 'http://images1.spies.dk/images/SiteID11/SitePage/hotelbillede_mangler_975_350.jpg';
        assert.equal(images[0].uri, img);
      } else {
        assert(images.length > 0);
      }
    });
    done();
  });
});

describe('Map to extract relevant fields from hotel images', function () {
  it('mapHotelsById transforms an NE Hotels API query array into an object', function (done) {
    var hotelsMap = mapper.mapHotelsById(hotelSamples);
    var result = mapper.mapHotelImages(hotelsMap[hotelId].images);
    assert.equal(result[0].uri, hotelsMap[hotelId].images[0].url);
    assert.equal(result.length, hotelsMap[hotelId].images.length);
    var expected = [ 'type', 'displaySequence', 'primary', 'uri' ];
    assert.deepEqual(Object.keys(result[0]), expected);
    done();
  });
});

describe('Transform NE API Flight details to Standard Format', function () {
  it('listPackageFlights transforms an NE flight details to array of flights', function (done) {
    var flights = {
      outbound: mapper.listPackageFlights(packagesSamples[0].flightInfo.outFlight),
      inbound: mapper.listPackageFlights(packagesSamples[0].flightInfo.homeFlight)
    };

    assert.equal(flights.outbound[0].departure.airport.code, 'CPH');
    assert.equal(flights.inbound[0].departure.airport.code, 'RHO');
    done();
  });
});

describe('Get Currency Code from Market ID', function () {
  it('getCurrencyCode returns currency code from market id', function (done) {
    var result = mapper.getCurrencyCode('SD');
    assert.equal(result, 'DKK');
    var defaultCurrency = mapper.getCurrencyCode('Timbuktu');
    assert.equal(defaultCurrency, 'EUR');
    done();
  });
});

describe('Map results and hotels', function () {
  it('mapResultToGraphql maps entire NE API result to GraphQL', function (done) {
    var graphql = mapper.mapResultToGraphql(packagesSamples, hotelSamples)[0];
    assert(graphql);
    assert.equal(graphql.type, 'package'); // https://git.io/vrx7l (issues/75)
    assert.equal(graphql.id, 'RHOAQUA');
    assert(Object.keys(graphql.packageOffer.hotel).length > 5);
    done();
  });
});

describe('Use NE Product SKU as provider.reference', function () {
  it('SKU is made from destinationCode + hotelCode', function (done) {
    var graphql = mapper.mapResultToGraphql(packagesSamples, hotelSamples)[0];
    assert.equal(graphql.id, 'RHOAQUA');
    done();
  });
});

describe('Format result for client (reduce amount of data sent)', function () {
  it('minimiseBandwidth reduces the amount of data sent to the client', function (done) {
    var item = mapper.mapResultToGraphql(packagesSamples, hotelSamples)[0];
    item.url = '/123456/' + item.id; // by default results don't have url
    var min = mapper.minimiseBandwidth(item);
    // console.log(JSON.stringify(min, null, 2));
    assert.equal(item.type, min.type);
    assert.equal(item.id, min.id);
    assert.equal(item.url, min.url);
    assert.equal(item.url, min.url);
    assert.equal(min.packageOffer.hotel.images.small.length, 1, 'only one small image returned to client');
    assert.deepEqual(min.packageOffer.hotel.place, item.packageOffer.hotel.place);
    assert.equal(min.packageOffer.hotel.concept, item.packageOffer.hotel.concept);
    assert.equal(min.packageOffer.hotel.starRating, item.packageOffer.hotel.starRating);
    assert.deepEqual(item.packageOffer.flights, min.packageOffer.flights);
    assert.equal(item.packageOffer.price, min.packageOffer.price);
    assert.deepEqual(item.packageOffer.provider, min.packageOffer.provider);
    assert.equal(item.packageOffer.nights, min.packageOffer.nights);
    // outcome
    var itemLength = JSON.stringify(item).length;
    var minlength = JSON.stringify(min).length;
    assert(minlength < itemLength / 2);
    console.log('   > Saved:',
      Math.floor(((itemLength - minlength) / itemLength) * 100) + '% bandwidth!');
    done();
  });
});
