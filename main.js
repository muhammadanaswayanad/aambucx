const PHONE = "917736953947";
const GENERAL = "Hello AAMBUCX, I would like to place an order.";

function wa(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

document.querySelectorAll("[data-order]").forEach((el) => {
  const product = el.getAttribute("data-order");
  const message = product
    ? `Hello AAMBUCX, I would like to order the ${product}.`
    : GENERAL;
  el.href = wa(PHONE, message);
});

document.querySelectorAll("[data-wa]").forEach((el) => {
  el.href = wa(el.getAttribute("data-wa"), GENERAL);
});

const header = document.querySelector(".site-header");
const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");

toggle.addEventListener("click", () => {
  const open = header.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.textContent = open ? "Close" : "Menu";
});

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Menu";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && header.classList.contains("is-open")) {
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Menu";
    toggle.focus();
  }
});
