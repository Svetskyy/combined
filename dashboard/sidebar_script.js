
// *Function to ensure the side navigation bar is open by default
function openSidebar() {
    const sidenav = document.getElementById("sidenav");
    const mapContainer = document.querySelector(".map-container");
    sidenav.style.left = "0px";
    mapContainer.style.marginLeft = "350px";
  }
  openSidebar();
  
  // *Function to close the sidebar
  function closeSidebar() {
    const sidenav = document.getElementById("sidenav");
    const mapContainer = document.querySelector(".map-container");
    sidenav.style.left = "-350px";
    mapContainer.style.marginLeft = "0px";
  }
  
  // *Function to toggle the side navigation bar
  function toggleSidebar() {
    const sidenav = document.getElementById("sidenav");
    const mapContainer = document.querySelector(".map-container");
    if (sidenav.style.left === "0px" || sidenav.style.left === "") {
      sidenav.style.left = "-350px";
      mapContainer.style.marginLeft = "0";
    } else {
      sidenav.style.left = "0px";
      mapContainer.style.marginLeft = "350px";
    }
  }