var map;
var clientMarker;
var clientUnc;
var allMarkers = new Array();
var lastMac = "";
var lastEvent;
var lastInfoWindowMac;

var infowindow = new google.maps.InfoWindow();

// This is called after the DOM is loaded, so we can safely bind all the
// listeners here.
function initialize() {
  var center = new google.maps.LatLng(37.7705, -122.3870);
  var mapOptions = {
    zoom: 20,
    center: center
  };
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  marker = new google.maps.Marker({
    position: center,
    map: null
  });
  clientUnc = new google.maps.Circle({
    position: center,
    map: null
  })

  $('#track').click(startLookup);
  
  $('#track').bind("enterKey", startLookup);
  
  $('#all').click(function() {
    startLookupAll();
  });
  
  $(document).on("click", ".client-filter", function(e) {
    var mac = $(this).data('mac');
    $('#mac-field').val(mac);
    startLookup();
  });
      
  startLookupAll();
}

// Begins a task timer to reload a single MAC every 20 seconds
function startLookup(e) {
  lastMac = $('#mac-field').val().trim();
  if (lastEvent != null) window.clearInterval(lastEvent);
  lookup(lastMac);
  lastEvent = window.setInterval(lookup, 20000, lastMac);
  console.log("Scheduled " + lastEvent);
}

// Begins a task timer to reload all MACs every 20 seconds
function startLookupAll() {
  if (lastEvent != null) window.clearInterval(lastEvent);
  lastEvent = window.setInterval(lookupAll, 20000);
  lookupAll();
  console.log("Scheduled " + lastEvent);
}

// Looks up a single MAC address
function lookup(mac) {
  $.getJSON('/clients/' + mac, function(response, textStatus, jqXHR) {
    console.log(response);
    track(response);
  });
}

// Plots the location and uncertainty for a single MAC address
function track(client) {
  clearAll();
  if (client != null && client.lat != null) {
    var pos = new google.maps.LatLng(client.lat, client.lng);
	  $('#last-mac').text("" + lastMac + " last seen on " + client.seenString + 
	    " with " + client.nSamples + " samples and uncertainty " + client.unc.toFixed(1) + " meters (reloading every 20 seconds)");
    map.setCenter(pos);
    marker.setMap(map);
    marker.setPosition(pos);
    clientUnc.setMap(null);
    clientUnc = new google.maps.Circle({
      map: map,
      center: pos,
      radius: client.unc,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      strokeColor: '#FF0000',
      strokeWeight: 1
    });
  }
  else {
    marker.setMap(null);
    clientUnc.setMap(null);
    $('#last-mac').text("Client MAC '" + lastMac + "' could not be found");
  }
}

// Looks up all MAC addresses
function lookupAll() {
  $('#last-mac').text("Looking up all clients (this may take a while)...");
  $.getJSON('/clients/', function(response, textStatus, jqXHR) {
    console.log("Received " + response.length + " client responses.");
    trackAll(response);
  });
}

// Removes all markers
function clearAll() {
  lastInfoWindowMac = ""
  while (allMarkers.length != 0) {
    var m = allMarkers.pop();
    if (infowindow.anchor == m) {
      lastInfoWindowMac = m.mac;
    }
    m.setMap(null);
    m = null;
  }
}

// Displays markers for all clients
function trackAll(clients) {
  clearAll();
  if (clients.length == 0) {
    $('#last-mac').text("Found no clients (if you just started the web server, you may need to wait a few minutes to receive pushes from Meraki)")
  } else $('#last-mac').text("Found " + clients.length + " clients (reloading every 20 seconds)");
  marker.setMap(null);
  clientUnc.setMap(null);
  clients.forEach(addMarker);
}

// Adds a marker for a single client within the "view all" perspective
function addMarker(client, index, allClients) {
  var m = new google.maps.Marker({
    position: new google.maps.LatLng(client.lat, client.lng),
    map: map,
    mac: client.mac
  });
  google.maps.event.addListener(m, 'click', function() {
    infowindow.setContent("<div>" + client.mac + "</div> (<a class='client-filter' href='#' data-mac='" +
      client.mac + "'>Track this MAC)</a>");
    infowindow.open(map, m);
  });
  if (client.mac == lastInfoWindowMac) {
    infowindow.open(map, m);
  }
  allMarkers.push(m);
}

// Call the initialize function when the window loads
google.maps.event.addDomListener(window, 'load', initialize);