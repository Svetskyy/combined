let renderers = [];
let map,
  directionsService,
  directionsRenderer,
  infoWindow,
  currentPositionMarker,
  startMarker,
  endMarker;
var polylines = [];
let currentLocationLat;
let currentLocationLng;
var directionsRenderers = [];
let routeMarkers = {};
let routePolylines = {};
const locationButton = document.createElement("button");
const overlay = document.getElementById("loadingOverlay");
window.initMap = initMap;
let routeColors = {};
var markers = {};

function getCurrentLocation() {
  if (navigator.geolocation) {
    // Ask for permission before getting the current location
    if (confirm("Allow this website to access your current location?")) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          currentLocationLat = pos.lat;
          currentLocationLng = pos.lng;

          // Update sourceCoordinates with the current location coordinates
          sourceCoordinates = pos;

          // Remove the previous current position marker if it exists
          directionsRenderer.setDirections({ routes: [] });
          if (currentPositionMarker) {
            currentPositionMarker.setMap(null);
          }
          if (startMarker) {
            startMarker.setMap(null);
          }
          if (endMarker) {
            endMarker.setMap(null);
          }

          // Create a red marker at the current position
          currentPositionMarker = new google.maps.Marker({
            position: pos,
            map: map,
            animation: google.maps.Animation.BOUNCE,
          });

          const sourceInput = document.getElementById("source");
          sourceInput.value = "Current Location";
          sourceInput.style.fontStyle = "italic";

          map.setCenter(pos);
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      // The user denied permission
      console.log("User denied location access.");
    }
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}



function removeAllMarkers() {
  for (let id in markers) {
    if (markers.hasOwnProperty(id)) {
      markers[id].setMap(null);
    }
  }
  markers = {};

  polylines.forEach((line) => {
    line.setMap(null);
  });
  polylines = [];

  directionsRenderers.forEach((renderer) => {
    renderer.setDirections({ routes: [] });
  });

  if (currentPositionMarker) {
    currentPositionMarker.setMap(null);
  }
  if (startMarker) {
    startMarker.setMap(null);
  }
  if (endMarker) {
    endMarker.setMap(null);
  }

  for (let routeType in routeMarkers) {
    for (let id in routeMarkers[routeType]) {
      routeMarkers[routeType][id].setMap(null);
    }
  }
  routeMarkers = {};

  for (let routeType in routePolylines) {
    routePolylines[routeType].forEach((line) => {
      line.setMap(null);
    });
  }
  routePolylines = {};
}

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function extractRouteFromID(id) {
  return id.split("_").slice(0, -1).join("_");
}

function drawLines() {
  removeAllMarkers(); // Clear previous markers and lines

  // Generate random colors and draw lines
  links.forEach((link) => {
    const route = extractRouteFromID(link.source); // or link.target
    const color = getColorForRoute(route);

    const sourceNode = markers[link.source];
    const targetNode = markers[link.target];

    if (sourceNode && targetNode) {
      const line = new google.maps.Polyline({
        path: [
          {
            lat: sourceNode.getCenter().lat(),
            lng: sourceNode.getCenter().lng(),
          },
          {
            lat: targetNode.getCenter().lat(),
            lng: targetNode.getCenter().lng(),
          },
        ],
        strokeColor: color,
        strokeOpacity: strokeOpacity2,
        strokeWeight: strokeWeight,
        map: map,
      });
      polylines.push(line);
    }
  });
}

function initMap() {
  const myLatLng = { lat: 14.294471682869641, lng: 120.99939088765836 };

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 13,
    center: myLatLng,
    styles: [],
  });

  let trafficLayer = new google.maps.TrafficLayer();
  trafficLayer.setMap(map);

  let nodes = jsonData.nodes;
  let links = jsonData.links;

  locationButton.textContent = "Toggle Traffic";
  locationButton.addEventListener("click", toggleTrafficLayer);

  nodes.forEach((node) => {
    const route = extractRouteFromID(node.id);
    const color = getColorForRoute(route); // Use the existing function to get or generate a color

    const marker = new google.maps.Circle({
      center: { lat: node.x, lng: node.y },
    });

    markers[node.id] = marker;
  });

  // draws connection lines
  links.forEach((link) => {
    // This part is moved to the drawLines function
  });

  google.maps.event.addListener(map, "click", function (event) {
    this.setOptions({ scrollwheel: true });
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  sourceAutocomplete = new google.maps.places.Autocomplete(
    document.getElementById("source")
  );
  desAutocomplete = new google.maps.places.Autocomplete(
    document.getElementById("dest")
  );

  // Listen for place_changed event on source Autocomplete
  sourceAutocomplete.addListener("place_changed", function () {
    const place = sourceAutocomplete.getPlace();
    sourceCoordinates = place.geometry.location.toJSON();
    console.log("Source Coordinates:", sourceCoordinates);

    // Generate random colors and draw lines here
    drawLines();
  });

  // Listen for place_changed event on destination Autocomplete
  desAutocomplete.addListener("place_changed", function () {
    const place = desAutocomplete.getPlace();
    destCoordinates = place.geometry.location.toJSON();
    console.log("Destination Coordinates:", destCoordinates);

    // Generate random colors and draw lines here
    drawLines();
  });
}

function getColorForRoute(route) {
  if (!routeColors[route]) {
    routeColors[route] = getRandomColor();
  }
  return routeColors[route];
}

function toggleTrafficLayer() {
  if (trafficLayer.getMap()) {
    trafficLayer.setMap(null);
  } else {
    trafficLayer.setMap(map);
  }
}


function getNodeCoordinates(nodeId, nodes) {
  for (let node of nodes) {
    if (node.id === nodeId) {
      return { lat: node.x, lng: node.y };
    }
  }
  return null;
}

function clearPreviousRoutes() {
  for (let renderer of directionsRenderers) {
    renderer.setMap(null);
  }
  directionsRenderers = [];
}

function routeTemplate1() {
  sourceCoordinates = {
    lat: 14.3250603,
    lng: 120.9453688,
  };
  destCoordinates = {
    lat: 14.3165996,
    lng: 120.9853831,
  };

  runGeneticAlgorithm();
  document.getElementById('source').value = "Barzaga compound Dasmariñas, Cavite, Philippines";
  document.getElementById('dest').value = 'Coco Valley Richnez Waterpark, Molino - Paliparan Road, Dasmariñas, Cavite, Philippines';
}

function routeTemplate2() {
  sourceCoordinates = { lat: 14.3535373, lng: 120.9604285 };
  destCoordinates = { lat: 14.2990227, lng: 120.9732917 };

  runGeneticAlgorithm();
  document.getElementById('source').value = "The Orchard Golf and Country Club";
  document.getElementById('dest').value = "Manila Memorial Park Dasmariñas, Dasmariñas, Cavite, Philippines";
}
function routeTemplate3() {
  sourceCoordinates = { lat: 14.316076, lng: 120.9736502 };
  destCoordinates = { lat: 14.3450539, lng: 120.9661019 };

  runGeneticAlgorithm();
  document.getElementById('source').value = 'Dexterville Royale, Dasmariñas, Cavite, Philippines';
  document.getElementById('dest').value = 'Technological University of the Philippines – Cavite';
}

function generateRouteInstructions(routeData) {
  let commutes = routeData.details.commutes;
  let instructionElements = [];

  commutes.forEach((commute, index) => {
    let instruction = document.createElement("div");
    instruction.className = "instructionStyle";

    let name = commute.name.replace(/-/g, " ");
    let iconName = "";

    // Initialize signboard variable
    let signboard = "";

    // Remove 'terminal' if present in name
    if (name.endsWith("terminal")) {
      name = name.slice(0, -9);
      iconName = "tric.png";
    } else if (name == "walk" && index < commutes.length - 1) {
      let nextCommute = commutes[index + 1].name.replace(/-/g, " ");
      name += " to " + nextCommute;
      iconName = "walk.png";
      if (!nextCommute.endsWith("terminal")) {
        name += " Jeep Loading Point";
      }
    } else if (name == "walk" && index === commutes.length - 1) {
      name += " to your final destination";
      iconName = "walk.png";
    } else {
      if (name != "walk") {
        // Extract the signboard from the second-to-last part
        const nameParts = name.split(' ');
        signboard = nameParts[nameParts.length - 1];
        signboard = signboard.charAt(0).toUpperCase() + signboard.slice(1);
        // Remove the signboard from the name
        name = nameParts.slice(0, -1).join(' ') + " Jeepney";
      }
      iconName = "jeep.png";
    }

    // Capitalize all letters in name
    name = name.toUpperCase();

    let icon = document.createElement("img");
    icon.src = `images/${iconName}`;
    icon.className = "iconStyle";
    instruction.appendChild(icon);

    let textDiv = document.createElement("div");
    textDiv.className = "subDivStyle nameStyle borderStandard";

    let textTop = document.createElement("div");
    textTop.textContent = name; // Display name at the top of the second column
    textTop.className = "nameTopStyle";
    textDiv.appendChild(textTop);

    if (signboard) {
      // Capitalize the value of the signboard
      signboard = signboard.toUpperCase();
      
      let signBoard = document.createElement("div");
      signBoard.textContent = `Signboard: ${signboard}`; // Display signboard at the bottom of the second column
      signBoard.className = "subDivStyle signBoardStyle";
      textDiv.appendChild(signBoard);
    }

    instruction.appendChild(textDiv);

    let costDiv = document.createElement("div");
    costDiv.textContent = `₱${Math.ceil(commute.cost)}`;
    costDiv.className = "subDivStyle costStyle";

    let distanceDiv = document.createElement("div");
    distanceDiv.textContent = `${commute.distance.toFixed(1)} KM`;
    distanceDiv.className = "subDivStyle distanceStyle";

    costDiv.appendChild(distanceDiv); // Display distance below cost
    instruction.appendChild(costDiv);

    instructionElements.push(instruction);

    // Function to calculate distance between two points (replace with your actual calculation)
    function calculateDistance(source, destination) {
      // Replace this with your distance calculation logic
      return Math.sqrt(Math.pow(destination.lat - source.lat, 2) + Math.pow(destination.lng - source.lng, 2));
    }
  });

  return instructionElements;
}


function toggleLoading() {
  overlay.style.display = overlay.style.display === "flex" ? "none" : "flex";

  overlay.style.pointerEvents =
    overlay.style.display === "flex" ? "auto" : "none";
}
function reset(event) {
  location.reload();
}