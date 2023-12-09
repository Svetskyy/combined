function removeRouteFromNodes(routeName, nodes) {
  return nodes.filter((node) => !node.id.startsWith(routeName));
}

function removeRouteFromLinks(routeName, links) {
  return links.filter((link) => {
    return !(
      link.source.startsWith(routeName) || link.target.startsWith(routeName)
    );
  });
}

function addSourceAndDestinationToGraph(nodes, links, source, destination) {
  const sourceNode = {
    id: "source",
    x: source.lat,
    y: source.lng,
    color: "#FF0000",
  };
  const destNode = {
    id: "destination",
    x: destination.lat,
    y: destination.lng,
    color: "#0000FF",
  };

  nodes.push(sourceNode);
  nodes.push(destNode);

  const filteredSourceNodes = nodes.filter(
    (node) => node.id !== "destination" && node.id !== "source"
  );
  const filteredDestNodes = nodes.filter(
    (node) => node.id !== "source" && node.id !== "destination"
  );

  const closestToSource = closestNodeToPoint(sourceNode, filteredSourceNodes);
  const closestToDest = closestNodeToPoint(destNode, filteredDestNodes);

  const closestSourceDistance = 4 * distanceKM(sourceNode, closestToSource);
  const closestDestDistance = 4 * distanceKM(destNode, closestToDest);

  if (closestToSource && closestToDest) {
    links.push({
      source: "source",
      target: closestToSource.id,
      weight: closestSourceDistance,
      type: "walk",
    });
    links.push({
      source: closestToDest.id,
      target: "destination",
      weight: closestDestDistance,
      type: "walk",
    });
  }
}

function extractCostDistance(path, links) {
  let lastType = null;
  let currentTypeDistance = 0;
  let currentTypeCost = 0;
  const typeMap = {};
  const commutes = [];
  let totalDistance = 0;
  let totalCost = 0;

  for (let i = 0; i < path.length; i++) {
    let currentType = `${path[i].split("_")[0]} ${path[i].split("_")[1]} ${
      path[i].split("_")[2]
    }`;

    if (lastType !== currentType && currentType !== "destination undefined undefined" && currentType !== "source undefined undefined") {
      if (currentType) {
        if (!typeMap[currentType]) {
          typeMap[currentType] = { distance: 0, cost: 0 };
        }
        let link = links.find(
          (l) => l.source === path[i] && l.target === path[i + 1]
        );
        if (link) {
          if (link.type !== "walk") {
            typeMap[currentType].distance += currentTypeDistance;
            typeMap[currentType].cost += currentTypeCost;
            commutes.push({
              name: currentType,
              cost: currentTypeCost,
              distance: currentTypeDistance,
            });
          }
        }
      }
      currentTypeDistance = 0;
      currentTypeCost = 0;
    }
    if (lastType === currentType) {
      // Find the index of the object with the specified name
      const targetIndex = commutes.findIndex(commute => commute.name === currentType);

      // Check if the object with the specified name was found
      if (targetIndex !== -1) {
        // Update the 'distance' property of the found object
        commutes[targetIndex].distance = currentTypeDistance;
        commutes[targetIndex].cost = currentTypeCost;
      }
    }

    lastType = currentType;

    if (i < path.length - 1) {
      let link = links.find(
        (l) => l.source === path[i] && l.target === path[i + 1]
      );
      if (link) {
        currentTypeDistance += link.weight;
        if (link.type === "jeep") {
          currentTypeCost =
            currentTypeDistance <= 4
              ? 13
              : 13 + 1.5 * (currentTypeDistance - 4);
        } if (link.type === "tricycle") {
          currentTypeCost =
            currentTypeDistance <= 1
              ? 24
              : 24 + 8 * (currentTypeDistance - 1);
        } else {
          // Check if the link type is "walk" and add it to commutes
          if (link.type === "walk" && link.target != "destination") {
            commutes.push({
              name: "walk", // or you can use a specific name for walk commutes
              cost: 0,
              distance: link.weight,
            });
            currentTypeDistance = 0;
          }
          // Check if this is the last walk
          if (link.type === "walk" && link.target === "destination") {
            commutes.push({
              name: "walk",
              cost: 0,
              distance: link.weight,
            });
          }
        }
      }
    }

    // if (i === path.length - 2) {
    //   if (!typeMap[lastType]) {
    //     typeMap[lastType] = { distance: 0, cost: 0 };
    //   }
    //   typeMap[lastType].distance += currentTypeDistance;
    //   typeMap[lastType].cost += currentTypeCost;
    //   commutes.push({
    //     name: lastType,
    //     cost: Math.ceil(currentTypeCost),
    //     distance: currentTypeDistance,
    //   });
    // }
  }

  commutes.forEach((commute) => {
    totalDistance += commute.distance;
    totalCost += commute.cost;
  });

  totalDistance += links[0].weight;
  totalDistance += links[links.length - 1].weight;

  return { commutes, totalDistance, totalCost };
}

function closestNodeToPoint(point, existingNodes) {
  if (existingNodes.length === 0) return null;
  return existingNodes.reduce((closest, node) => {
    return distance(point, node) < distance(point, closest) ? node : closest;
  });
}

function mutate(individual) {
  let { nodes, links, path, exploredRoutes } = individual;

  if (!exploredRoutes) {
    exploredRoutes = new Set();
  }

  let allRoutes = extractAllRoutes(nodes);
  let tempRoutes = [...allRoutes];
  let routeToRemove = tempRoutes[Math.floor(Math.random() * tempRoutes.length)];

  let selectedRoute = routeToRemove;

  exploredRoutes.add(selectedRoute);

  nodes = removeRouteFromNodes(selectedRoute, nodes);
  links = removeRouteFromLinks(selectedRoute, links);

  addSourceAndDestinationToGraph(
    nodes,
    links,
    sourceCoordinatesWorker2,
    destCoordinatesWorker2
  );

  const { previous } = dijkstra(nodes, links, "source");
  let newPath = findShortestPath(previous, "source", "destination");

  if (newPath && newPath.length > 1) {
    return { nodes, links, path: newPath, exploredRoutes };
  }

  return individual;
}

function evaluate(individual, type) {
  const { path, links } = individual;
  const { totalCost, totalDistance, commutes } = extractCostDistance(
    path,
    links
  );

  if (type === 0) return totalCost;
  if (type === 1) return totalDistance;
  if (type === 2) return commutes;
}

function dijkstra(nodes, links, startNode) {
  const unvisited = nodes.map((n) => n.id);
  const distances = {};
  const previous = {};

  nodes.forEach((node) => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
  });

  distances[startNode] = 0;

  while (unvisited.length > 0) {
    let currentNode = unvisited.reduce((nearest, node) => {
      return distances[node] < distances[nearest] ? node : nearest;
    });

    unvisited.splice(unvisited.indexOf(currentNode), 1);

    let neighbors = links
      .filter((l) => l.source === currentNode)
      .map((l) => l.target);

    for (let neighbor of neighbors) {
      let link = links.find(
        (l) => l.source === currentNode && l.target === neighbor
      );
      let alt = distances[currentNode] + parseFloat(link.weight);
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = currentNode;
      }
    }
  }

  return { distances, previous };
}

function findShortestPath(previous, start, dest) {
  const path = [];
  let currentNode = dest;
  while (currentNode && currentNode !== start) {
    path.unshift(currentNode);
    currentNode = previous[currentNode];
  }
  if (currentNode) path.unshift(start); // Add start node if a path is found
  return path;
}

function extractAllRoutes(nodes) {
  let routes = new Set();
  nodes.forEach((node) => {
    let parts = node.id.split("_");
    parts.pop(); // Remove the last element (the _x suffix)
    let routeName = parts.join("_");
    routes.add(routeName);
  });
  return Array.from(routes);
}
function distance(node1, node2) {
  return Math.sqrt((node1.x - node2.x) ** 2 + (node1.y - node2.y) ** 2);
}

function distanceKM(node1, node2) {
  const R = 6371.071; // Radius of Earth in km
  const lat1 = node1.x;
  const lon1 = node1.y;
  const lat2 = node2.x;
  const lon2 = node2.y;
  const rlat1 = lat1 * (Math.PI / 180);
  const rlat2 = lat2 * (Math.PI / 180);
  const difflat = rlat2 - rlat1;
  const difflon = (lon2 - lon1) * (Math.PI / 180);

  const d =
    2 *
    R *
    Math.asin(
      Math.sqrt(
        Math.sin(difflat / 2) * Math.sin(difflat / 2) +
          Math.cos(rlat1) *
            Math.cos(rlat2) *
            Math.sin(difflon / 2) *
            Math.sin(difflon / 2)
      )
    );

  return d;
}
