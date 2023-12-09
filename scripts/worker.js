importScripts("./helperFunctions.js");

self.addEventListener("message", function (event) {
  const data = event.data;
  console.log("Worker is running in thread/process:", self);
  const {
    index,
    individualsPerRoute,
    minNumRoutes,
    fourClosestRoutes,
    sourceCoordinates,
    destCoordinates,
    nodes,
    links,
  } = data;

  let routeIndex = Math.floor(index / individualsPerRoute) % minNumRoutes;

  let tempNodes = removeRouteFromNodes(
    fourClosestRoutes[routeIndex].route,
    nodes
  );
  let tempLinks = removeRouteFromLinks(
    fourClosestRoutes[routeIndex].route,
    links
  );

  addSourceAndDestinationToGraph(
    tempNodes,
    tempLinks,
    sourceCoordinates,
    destCoordinates
  );

  let validPath = false;
  let path;
  let allRoutes = extractAllRoutes(nodes);
  let loopCount = 0;
  let exploredRoutes = new Set();

  while (!validPath && loopCount < 50) {
    let tempRoutes = allRoutes.filter((route) => !exploredRoutes.has(route));
    let routeToRemove =
      tempRoutes[Math.floor(Math.random() * tempRoutes.length)];

    tempNodes = removeRouteFromNodes(routeToRemove, nodes);
    tempLinks = removeRouteFromLinks(routeToRemove, links);

    addSourceAndDestinationToGraph(
      tempNodes,
      tempLinks,
      sourceCoordinates,
      destCoordinates
    );

    const { previous } = dijkstra(tempNodes, tempLinks, "source");
    path = findShortestPath(previous, "source", "destination");
    const { commutes } = extractCostDistance(path, tempLinks);

    if (
      !commutes.some((commute) => commute.distance < 0.1) &&
      path.length > 1
    ) {
      validPath = true;
      console.log("Found valid path in initial population");
      console.log(path);
    } else {
      console.log("Path found invalid");
      loopCount++;
      let invalidCommute = commutes.find((commute) => commute.distance < 0.1);
      if (invalidCommute) {
        exploredRoutes.add(invalidCommute.name.split(" ").join("_"));
      }
    }
  }

  let individual = {
    nodes: tempNodes,
    links: tempLinks,
    path,
    exploredRoutes: exploredRoutes,
  };

  console.log(individual);

  self.postMessage(individual);
});