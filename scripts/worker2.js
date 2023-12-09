importScripts("./helperFunctions.js");

let sourceCoordinatesWorker2;
let destCoordinatesWorker2;
self.addEventListener("message", function (event) {
  const data = event.data;
  const { individual } = data;
  console.log("Received data in Worker: ", data);
  sourceCoordinatesWorker2 = data.sourceCoordinates;
  destCoordinatesWorker2 = data.destCoordinates;

  let validPath = false;
  let betterIndividual;
  let loopCount = 0;
  let exploredRoutes = individual.exploredRoutes || new Set();

  while (!validPath && loopCount < 50) {
    let mutated = mutate({ ...individual });
    const { commutes: mutatedCommutes } = extractCostDistance(
      mutated.path,
      mutated.links
    );
    console.log("Mutated individual: ", mutated);
    console.log("Mutated commutes: ", mutatedCommutes);

    if (!mutatedCommutes.some((commute) => commute.distance < 0.1)) {
      validPath = true;
      betterIndividual = mutated;
      console.log("Found valid path in genetic algorithm");
    } else {
      loopCount++;
      console.log("Removing invalid route for new path generation.");
      let invalidCommute = mutatedCommutes.find(
        (commute) => commute.distance < 0.1
      );
      if (invalidCommute) {
        exploredRoutes.add(invalidCommute.name.split(" ").join("_"));
      }
      let routesToConsider = extractAllRoutes(mutated.nodes).filter(
        (route) => !exploredRoutes.has(route)
      );
      const removedRoute =
        routesToConsider.length > 0
          ? routesToConsider[0]
          : mutated.path[0].split("_")[0];
      mutated.nodes = removeRouteFromNodes(removedRoute, mutated.nodes);
      mutated.links = removeRouteFromLinks(removedRoute, mutated.links);
      const { previous } = dijkstra(mutated.nodes, mutated.links, "source");
      mutated.path = findShortestPath(previous, "source", "destination");
    }
  }
  betterIndividual.exploredRoutes = exploredRoutes;

  self.postMessage(betterIndividual);
});
