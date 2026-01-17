import * as bookmarks_manager from "./bookmarks_manager.js";
import bangs from "./data/bangs.js";
import { error } from "./status.js";
import * as tip_manager from "./tip.js";

tip_manager.generate();

const config = {
  DEFAULT_SEARCH_ENGINE: "https://encrypted.google.com/search?q={{{s}}}",
}

const search_input = document.querySelector(".search input");
const shortcuts_input = document.querySelector(".shortcuts-input");
const shortcuts_context_el = document.querySelector(".shortcuts-context");
const bang_el = document.querySelector(".bang");
const shortcuts_el = document.querySelector("#scs");
const commands_el = document.querySelector("#cmds");
bookmarks_manager.load();

let shortcut_context = bookmarks_manager.open_bookmark_by_shortcut;
let is_unloading = false;
let active_bang = null;
let is_banging = false;

function handle(input) {
  let query = input.trim();
  const matches = query.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const [command, ...args] = matches.map(s => s.replace(/^['"]|['"]$/g, ""));

  if (command === "mkdir") {
    bookmarks_manager.create_folder(args).catch(error);
  } else if (command === "rm") {
    bookmarks_manager.remove(args).catch(error);
  } else if (command === "touch") {
    bookmarks_manager.create_bookmark(args).catch(error);
  } else if (command === "mv") {
    bookmarks_manager.move(args).catch(error);
  } else if (command === "echo") {
    bookmarks_manager.change_url(args).catch(error);
  } else if (command === "update") {
    bookmarks_manager.update_icon(args).catch(error);
  } else if (command === "tip") {
    try { tip_manager.handle(args); } catch (e) { error(e); }
  } else search(query);

  search_input.value = "";
}

function search(query) {
  const encoded = encodeURIComponent(query);
  const regexp = /\.[a-zA-Z]{2,63}/;

  if (query.match(regexp)) {
    query = query.startsWith("http") ? query : `https://${query}`;
  } else if (query.startsWith(":")) {
    query = `http://localhost${query}`;
  } else if (!active_bang) {
    query = config.DEFAULT_SEARCH_ENGINE.replace("{{{s}}}", encoded);
  } else {
    query = active_bang.url.replace("{{{s}}}", encoded)
  }

  window.location.replace(query);
}

function set_bang(bang) {
  const bang_obj = bangs[bang.slice(1)];
  if (!bang_obj) return;

  bang_el.textContent = bang_obj.name.toLocaleLowerCase();
  active_bang = bang_obj;
  search_input.value = "";
  bang_el.classList.remove("hidden");
}

function clear_bang() {
  is_banging = false;
  active_bang = null;
  bang_el.textContent = "";
  bang_el.classList.add("hidden");
}

function reset_shortcuts_input() {
  shortcuts_input.value = "";
  shortcuts_context_el.textContent = "";
  shortcut_context = bookmarks_manager.open_bookmark_by_shortcut;
}

function open_help(input) {
  if (input === "c") {
    commands_el.classList.remove("hidden");
    shortcuts_el.classList.add("hidden");
  } else if (input === "s") {
    shortcuts_el.classList.remove("hidden");
    commands_el.classList.add("hidden");
  } else if (input === "x") {
    shortcuts_el.classList.add("hidden");
    commands_el.classList.add("hidden");
  }
  reset_shortcuts_input();
}

search_input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handle(search_input.value);
  } else if (event.key === "Escape") {
    shortcuts_input.focus();
    search_input.value = "";
    clear_bang();
  } else if (event.key === "!" && search_input.value.length === 0) {
    is_banging = true;
  } else if (event.key === " " && is_banging) {
    event.preventDefault();
    is_banging = false;
    set_bang(search_input.value);
  }
})

shortcuts_input.addEventListener("input", (event) => {
  if (is_unloading) return;
  const success = shortcut_context(event.target.value);
  if (success) reset_shortcuts_input();
})

document.addEventListener("keydown", (event) => {
  if (search_input === document.activeElement) return;
  switch (event.key) {
    case "/":
      event.preventDefault();
      reset_shortcuts_input();
      search_input.focus();
      break;
    case ":":
      event.preventDefault();
      reset_shortcuts_input();
      search_input.focus();
      search_input.value = ":";
      break;
    case "'":
    case "!":
      event.preventDefault();
      reset_shortcuts_input();
      is_banging = true;
      search_input.focus();
      search_input.value = "!";
      break;
    case ".":
      event.preventDefault();
      bookmarks_manager.open_all();
      break;
    case "?":
      event.preventDefault()
      shortcuts_input.value = "";
      shortcuts_context_el.textContent = "?";
      shortcut_context = open_help;
      break;
    case ";":
      event.preventDefault();
      shortcuts_input.value = "";
      shortcuts_context_el.textContent = "f";
      shortcut_context = bookmarks_manager.set_folder_by_shortcut;
      break;
    case ":":
      event.preventDefault();
      shortcuts_input.value = "";
      reset_shortcuts_input();
      is_banging = true;
      search_input.focus();
      break;
    case " ":
      event.preventDefault();
      shortcuts_input.value = "";
      shortcuts_context_el.textContent = "g";
      shortcut_context = bookmarks_manager.open_bookmark_by_shortcut_g;
      break;
    case "Escape":
      reset_shortcuts_input();
      break;
    default:
      if (shortcuts_input !== document.activeElement) {
        shortcuts_input.value = "";
        shortcuts_input.focus();
      }
  }
})

window.addEventListener("beforeunload", () => {
  is_unloading = true; // block any further navigation on unload
  reset_shortcuts_input(); // just in case the previous reset didn't fire
});

window.addEventListener("unload", () => {
  is_unloading = false;
})
