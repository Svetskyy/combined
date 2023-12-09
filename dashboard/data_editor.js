// this file just stores common functions to edit the nodes2.json

//adds some data to each node based on its id
for (var i = 0; i < nodes2.nodes.length; i++) {
  if (nodes2.nodes[i].id.startsWith("walter_to_dbbc_")) {
    nodes2.nodes[i].type = "JEEP";
  }
}
