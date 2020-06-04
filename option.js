// ============================================================
// To activate the active class on the links
// ============================================================
// Get the options menu element
var optnCard = document.getElementById("optnCard");

// Get all links with class="option" inside the menu
var optns = optnCard.getElementsByClassName("option");

// Loop through the links and add the active class to the current/clicked link
for (var i = 0; i < optns.length; i++) {
  optns[i].addEventListener("click", function () {
    var current = document.getElementsByClassName("active");
    current[0].className = current[0].className.replace(" active", "");
    this.className += " active";
  });
}

// When the user scrolls the page, execute myFunction
window.onscroll = function () {
  getSticky();
};

// Get the sidenav
var sidenav = document.getElementById("sidenav");

// Get the offset position of the options Menu
var sticky = sidenav.offsetTop;

// Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
function getSticky() {
  if (window.pageYOffset > 1160 && window.pageYOffset < 9000) {
    sidenav.classList.add("stick");
  } else {
    sidenav.classList.remove("stick");
  }
}
