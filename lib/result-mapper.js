var _ = { result: require('lodash.result') }; // see: https://git.io/vaRhs
var formatHotelFacts = require('./format-hotel-facts');
var imageMap = require('./ne-hotel-images-map.json');

function mapHotelsById (hotels) {
  return (!hotels) ? {} : hotels.reduce(function (obj, hotel) {
    obj[hotel.wvId] = hotel;
    return obj;
  }, {});
}

function mapHotelImages (images) {
  return images.map(function (image) {
    return {
      'type': 'image/jpeg',
      'displaySequence': null,
      'primary': null,
      'uri': image.url
    };
  });
}
// see: https://github.com/numo-labs/lambda-ne-hotel-images
function mapLargeHotelImages (hotel) {
  // console.log(hotel);
  var id = hotel.wvId;
  if (imageMap[id]) {
    var images = imageMap[id]['1280'] || imageMap[id]['696'];
  }
  if (images && images.length > 0) {
    return images.map(function (url) {
      return {
        'type': 'image/jpeg',
        'displaySequence': null,
        'primary': null,
        'uri': url
      };
    });
  } else {
    if (hotel.images && hotel.images.length > 0) {
      return hotel.images.map(function (image) {
        return {
          'type': 'image/jpeg',
          'displaySequence': null,
          'primary': null,
          'uri': image.url
        };
      });
    } else { // return default image for hotels without images!!!
      var url = 'http://images1.spies.dk/images/SiteID11/SitePage/hotelbillede_mangler_975_350.jpg';
      return [{
        'type': 'image/jpeg',
        'displaySequence': null,
        'primary': null,
        'uri': url
      }]; // see: https://git.io/voLIE
    }
  }
}

function listPackageFlights (flights) {
  return flights.map(function (flight) {
    return {
      'number': 'na', // the NE API does not return a flight number!! :-(
      'departure': {
        'localDateTime': flight.departureTime,
        'airport': {
          'code': flight.departureStationCode,
          'name': flight.departureStationName
        }
      },
      'arrival': {
        'localDateTime': flight.arrivalTime,
        'airport': {
          'code': flight.destinationCode
        }
      },
      'carrier': {
        'code': flight.carrierCode
      }
    };
  });
}

function getCurrencyCode (market) {
  var currency;
  switch (market) {
    case 'SD':
      currency = 'DKK';
      break;
    default:
      currency = 'EUR';
  }
  return currency;
}

/**
 * mapResultToGraphql does what its name suggests: maps NE API Search
 * results to the GraphQL SearchResults Schema so the results have the same
 * 'shape' (fields/structure) as what the client expects.
 * @param {Object} tripResults - the trip results from NE API.
 * @param {Object} hotelsResults - the hotel info result (images, rating, etc.)
 * please see readme for examples of both these params.
 */
function mapResultToGraphql (tripResults, hotelsResults) {
  var hotelsMap = mapHotelsById(hotelsResults);

  return tripResults.map(function (result) {
    var hotel = _.result(hotelsMap, result.wvHotelPartId);
    if (!hotel) return; // return early if no hotel details for package
    // console.log(hotel);
    return {
      'type': 'package',
      'id': result.destinationCode + result.hotelCode,
      'packageOffer': {
        // priority code is not in the graphql schema...
        'priorityCode': result.priorityCode, // used for sorting display priority
        'hotel': {
          'id': _.result(hotel, 'wvid'), // issues/48
          'name': _.result(hotel, 'name'),
          'images': {
            'small': mapHotelImages(_.result(hotel, 'images')),
            'large': mapLargeHotelImages(hotel)
          },
          'starRating': _.result(hotel, 'rating.guestRating'),
          'place': {
            'name': _.result(hotel, 'geographical.resortName'),
            'country': _.result(hotel, 'geographical.countryName'),
            'region': _.result(hotel, 'geographical.areaName')
          },
          'description': hotel.description, // ISEARCH-270,
          'concept': _.result(hotel, 'concept') || { id: '', title: '' }
        },
        'flights': {
          'outbound': listPackageFlights(result.flightInfo.outFlight),
          'inbound': listPackageFlights(result.flightInfo.homeFlight)
        },
        'price': {
          'total': result.price,
          'perPerson': result.paxPrice,
          'currency': getCurrencyCode(result.marketUnitCode),
          'discountPrice': result.discountPrice // issues/32
        },
        'provider': {
          'id': 'lambda-searcher',
          'reference': result.destinationCode + result.hotelCode, // ISEARCH-248
          'deepLink': result.tripUrl // link to book the trip!
        },
        'nights': result.hotelDuration,
        'amenities': formatHotelFacts(hotel)
      }
    };
  }).filter(function (e) { return e !== undefined; });
}

// Only send a subset of fields to Client see: https://git.io/voIlp
function minimiseBandwidth (item) {
  return {
    type: item.type,
    id: item.id,
    url: item.url, //
    packageOffer: {
      hotel: {
        name: item.packageOffer.hotel.name,
        images: {
          small: [ item.packageOffer.hotel.images.small[0] ] // only one!
        },
        starRating: item.packageOffer.hotel.starRating,
        place: item.packageOffer.hotel.place,
        concept: item.packageOffer.hotel.concept
      },
      flights: {
        outbound: [ item.packageOffer.flights.outbound[0] ],
        inbound: [ item.packageOffer.flights.inbound[0] ]
      },
      price: item.packageOffer.price, // all fields
      provider: item.packageOffer.provider, // all fields
      nights: item.packageOffer.nights
    }
  };
}

module.exports = {
  mapHotelsById: mapHotelsById,
  mapLargeHotelImages: mapLargeHotelImages, // test: https://git.io/voLvn
  mapHotelImages: mapHotelImages,
  getCurrencyCode: getCurrencyCode,
  listPackageFlights: listPackageFlights,
  mapResultToGraphql: mapResultToGraphql,
  minimiseBandwidth: minimiseBandwidth
};
