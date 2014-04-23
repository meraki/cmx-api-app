(function ($) {
  var map,                                      // This is the Google map
    clientMarker,                               // The current marker when we are following a single client
    clientUncertaintyCircle,                    // The circle describing that client's location uncertainty
    lastEvent,                                  // The last scheduled polling task
    lastInfoWindowMac,                          // The last Mac displayed in a marker tooltip
    allMarkers = [],                            // The markers when we are in "View All" mode
    lastMac = "",                               // The last requested MAC to follow
    infoWindow = new google.maps.InfoWindow(),  // The marker tooltip
    markerImage = new google.maps.MarkerImage('blue_circle.png',
      new google.maps.Size(15, 15),
      new google.maps.Point(0, 0),
      new google.maps.Point(4.5, 4.5)
    );

  // Removes all markers
  function clearAll() {
    clientMarker.setMap(null);
    clientUncertaintyCircle.setMap(null);
    lastInfoWindowMac = "";
    var m;
    while (allMarkers.length !== 0) {
      m = allMarkers.pop();
      if (infoWindow.anchor === m) {
        lastInfoWindowMac = m.mac;
      }
      m.setMap(null);
    }
  }

  // Plots the location and uncertainty for a single MAC address
  function track(client) {
    clearAll();
    if (client !== null && client.lat !== null && !(typeof client.lat === 'undefined')) {
      var pos = new google.maps.LatLng(client.lat, client.lng);
      if (client.manufacturer != null) {
        mfrStr = client.manufacturer + " ";
      } else {
        mfrStr = "";
      }
      if (client.os != null) {
        osStr = " running " + client.os;
      } else {
        osStr = "";
      }
      if (client.ssid != null) {
        ssidStr = " with SSID '" + client.ssid + "'";
      } else {
        ssidStr = "";
      }
      if (client.floors != null && client.floors !== "") {
        floorStr = " at '" + client.floors + "'"
      } else {
        floorStr = "";
      }
      $('#last-mac').text(mfrStr + "'" + lastMac + "'" + osStr + ssidStr +
        " last seen on " + client.seenString + floorStr +
        " with uncertainty " + client.unc.toFixed(1) + " meters (reloading every 20 seconds)");
      map.setCenter(pos);
      clientMarker.setMap(map);
      clientMarker.setPosition(pos);
      clientUncertaintyCircle = new google.maps.Circle({
        map: map,
        center: pos,
        radius: client.unc,
        fillColor: 'RoyalBlue',
        fillOpacity: 0.25,
        strokeColor: 'RoyalBlue',
        strokeWeight: 1
      });
    } else {
      $('#last-mac').text("Client '" + lastMac + "' could not be found");
    }
  }

  // Looks up a single MAC address
  function lookup(mac) {
    $.getJSON('/clients/' + mac, function (response) {
      track(response);
    });
  }

  // Adds a marker for a single client within the "view all" perspective
  function addMarker(client) {
    var m = new google.maps.Marker({
      position: new google.maps.LatLng(client.lat, client.lng),
      map: map,
      mac: client.mac,
      icon: markerImage
    });
    google.maps.event.addListener(m, 'click', function () {
      infoWindow.setContent("<div>" + client.mac + "</div> (<a class='client-filter' href='#' data-mac='" +
        client.mac + "'>Follow this client)</a>");
      infoWindow.open(map, m);
    });
    if (client.mac === lastInfoWindowMac) {
      infoWindow.open(map, m);
    }
    allMarkers.push(m);
  }

  // Displays markers for all clients
  function trackAll(clients) {
    clearAll();
    if (clients.length === 0) {
      $('#last-mac').text("Found no clients (if you just started the web server, you may need to wait a few minutes to receive pushes from Meraki)");
    } else { $('#last-mac').text("Found " + clients.length + " clients (reloading every 20 seconds)"); }
    clientUncertaintyCircle.setMap(null);
    clients.forEach(addMarker);
  }

  // Looks up all MAC addresses
  function lookupAll() {
    $('#last-mac').text("Looking up all clients...");
    $.getJSON('/clients/', function (response) {
      trackAll(response);
    });
  }

  // Begins a task timer to reload a single MAC every 20 seconds
  function startLookup() {
    lastMac = $('#mac-field').val().trim();
    if (lastEvent !== null) { window.clearInterval(lastEvent); }
    lookup(lastMac);
    lastEvent = window.setInterval(lookup, 20000, lastMac);
  }

  // Begins a task timer to reload all MACs every 20 seconds
  function startLookupAll() {
    if (lastEvent !== null) { window.clearInterval(lastEvent); }
    lastEvent = window.setInterval(lookupAll, 20000);
    lookupAll();
  }

  // This is called after the DOM is loaded, so we can safely bind all the
  // listeners here.
  function initialize() {
    var center = new google.maps.LatLng(37.7705, -122.3870);
    var mapOptions = {
      zoom: 20,
      center: center
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    clientMarker = new google.maps.Marker({
      position: center,
      map: null,
      icon: markerImage
    });
    clientUncertaintyCircle = new google.maps.Circle({
      position: center,
      map: null
    });

    $('#track').click(startLookup).bind("enterKey", startLookup);

    $('#all').click(startLookupAll);

    $(document).on("click", ".client-filter", function (e) {
      e.preventDefault();
      var mac = $(this).data('mac');
      $('#mac-field').val(mac);
      startLookup();
    });

    startLookupAll();
  }

  // Call the initialize function when the window loads
  $(window).load(initialize);
}(jQuery));
