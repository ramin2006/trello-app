"use strict";
console.log("TRELLO - Kards");
console.log("Alan | V1.5 2021");

/* ================== Elements ================== */
const e_mainContainer = document.getElementById("main-container");
const e_cardsContainer = document.getElementById("cards-container");

const e_sidebar = document.getElementById("sidebar");
const e_sidebarButton = document.getElementById("sidebar-button");
const e_sidebarClose = document.getElementById("sidebar-close");

const e_addCardText = document.getElementById("add-card-text");
const e_addCardButton = document.getElementById("add-card-button");

const e_boardsList = document.getElementById("boards-list");
const e_addBoardText = document.getElementById("add-board-text");
const e_addBoardButton = document.getElementById("add-board-button");

const e_autoSaveButton = document.getElementById("auto-save");
const e_saveButton = document.getElementById("save-button");
const e_settingsButton = document.getElementById("settings-button");
const e_deleteButton = document.getElementById("delete-button");

const e_cardContextMenu = document.getElementById("card-context-menu");
const e_cardContextMenuDelete = document.getElementById(
  "card-context-menu-delete"
);
const e_cardContextMenuClear = document.getElementById(
  "card-context-menu-clear"
);
const e_cardContextMenuDuplicate = document.getElementById(
  "card-context-menu-duplicate"
);

const e_alerts = document.getElementById("alerts");

const e_title = document.getElementById("title");

/* ================== App Data & Autosave ================== */
let autoSaveInternalId = null;
var appData = {
  boards: [],
  settings: { userName: "Hafsa", dataPersistence: true },
  currentBoard: 0,
  identifier: 0,
};

function startAutoSave() {
  if (autoSaveInternalId) clearInterval(autoSaveInternalId);
  autoSaveInternalId = setInterval(saveData, 5000);
}
startAutoSave();

/* ================== Helpers ================== */
Array.prototype.move = function (from, to) {
  this.splice(to, 0, this.splice(from, 1)[0]);
};
Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};

function uniqueID() {
  appData.identifier += 1;
  return "b" + appData.identifier;
}
function getMouseOverCard() {
  return document.querySelectorAll(".parent-card:hover")[0];
}
function getMouseOverItem() {
  return document.querySelectorAll(".parent-card > ul > li:hover")[0];
}

function createAlert(text) {
  let _e = document.createElement("div");
  _e.className = "alert";
  _e.innerText = text;
  e_alerts.appendChild(_e);
  setTimeout(() => _e.classList.add("animate-hidden"), 3500);
  setTimeout(() => _e.remove(), 4500);
}

/* ================== Classes ================== */
class Item {
  constructor(title, description = null, id, parentCardId) {
    this.title = title;
    this.description = description;
    this.id = id;
    this.isDone = false;
    this.parentCardId = parentCardId;
  }
  getParentCard() {
    return document.getElementById(this.parentCardId);
  }
  check(chk = true) {
    this.isDone = chk;
    let el = document.getElementById(this.id);
    if (el) el.style.textDecoration = chk ? "line-through" : "none";
  }
  update() {
    let _el = document.getElementById(this.id);
    if (!_el) return;
    let p = _el.querySelector("p");
    p.addEventListener("click", () => {
      this.check(!this.isDone);
    });
    _el.addEventListener("mousedown", cardDrag_startDragging, false);
    this.check(this.isDone);
  }
}

class Card {
  constructor(name, id, parentBoardId) {
    this.name = name;
    this.items = [];
    this.id = id;
    this.parentBoardId = parentBoardId;
  }
  addItem(item) {
    this.items.push(item);
    renderCard(this.id);
  }
  removeItem(item) {
    this.items = this.items.filter((v) => v !== item);
    renderCard(this.id);
  }
  update() {
    for (let it of this.items) it.update();
  }
  renderItems() {
    let ul = document.createElement("ul");
    ul.id = this.id + "-ul";
    for (let it of this.items) {
      let li = document.createElement("li");
      li.id = it.id;
      let p = document.createElement("p");
      p.innerText = it.title;
      p.className = "item-title text-fix unselectable";
      let span = document.createElement("span");
      // edit
      let edit = document.createElement("i");
      edit.className = "fa fa-pencil";
      edit.addEventListener("click", () => {
        let ta = document.createElement("textarea");
        ta.value = p.textContent;
        ta.className = "item-title";
        ta.maxLength = 256;
        p.replaceWith(ta);
        ta.addEventListener(
          "blur",
          () => {
            it.title = ta.value;
            renderCard(this.id);
          },
          { once: true }
        );
        ta.focus();
      });
      // delete
      let del = document.createElement("i");
      del.className = "fa fa-trash";
      del.addEventListener("click", () => {
        createConfirmDialog("Are you sure to delete this task?", () =>
          this.removeItem(it)
        );
      });
      span.appendChild(edit);
      span.appendChild(del);
      li.appendChild(p);
      li.appendChild(span);
      ul.appendChild(li);
    }
    return ul;
  }
  generateElement() {
    let headerSpan = document.createElement("span");
    let titleH2 = document.createElement("h2");
    titleH2.id = this.id + "-h2";
    titleH2.className = "card-title text-fix";
    titleH2.innerText = this.name;
    titleH2.addEventListener("click", () => {
      let input = document.createElement("input");
      input.value = titleH2.textContent;
      input.className = "card-title";
      input.maxLength = 128;
      titleH2.replaceWith(input);
      input.addEventListener(
        "blur",
        () => {
          this.name = input.value || this.name;
          renderCard(this.id);
        },
        { once: true }
      );
      input.focus();
    });
    let menu = document.createElement("i");
    menu.className = "fa fa-bars";
    menu.addEventListener("click", cardContextMenu_show);
    headerSpan.appendChild(titleH2);
    headerSpan.appendChild(menu);

    let input = document.createElement("input");
    input.id = this.id + "-input";
    input.type = "text";
    input.maxLength = 256;
    input.placeholder = "Add Task...";
    input.addEventListener("keyup", (e) => {
      if (e.code === "Enter") addTaskFromInput(this, input);
    });

    let btn = document.createElement("button");
    btn.className = "plus-button";
    btn.innerText = "+";
    btn.addEventListener("click", () => addTaskFromInput(this, input));

    let cardDiv = document.createElement("div");
    cardDiv.id = this.id;
    cardDiv.className = "parent-card";
    cardDiv.appendChild(headerSpan);
    if (this.items && this.items.length)
      cardDiv.appendChild(this.renderItems());
    cardDiv.appendChild(input);
    cardDiv.appendChild(btn);
    return cardDiv;
  }
}

/* helper to add task to card */
function addTaskFromInput(cardObj, inputEl) {
  const v = inputEl.value.trim();
  if (!v) return createAlert("Type a name for the item!");
  let item = new Item(
    v,
    null,
    getBoardFromId(cardObj.parentBoardId).uniqueID(),
    cardObj.id
  );
  cardObj.addItem(item);
  inputEl.value = "";
  inputEl.focus();
}

/* Board class */
class Board {
  constructor(name, id, settings, identifier = 0) {
    this.name = name;
    this.id = id;
    this.settings = settings;
    this.cards = [];
    this.identifier = identifier === null ? Date.now() : identifier;
  }
  uniqueID() {
    this.identifier += 1;
    return "e" + this.identifier.toString();
  }
  addCardFromInput() {
    let t = e_addCardText.value.trim();
    e_addCardText.value = "";
    if (!t) t = `Untitled Card ${this.cards.length + 1}`;
    let c = new Card(t, this.uniqueID(), this.id);
    this.cards.push(c);
    let el = c.generateElement();
    e_cardsContainer.insertBefore(
      el,
      e_cardsContainer.childNodes[e_cardsContainer.childNodes.length - 2]
    );
  }
}

/* ========== Data helpers (render/save/load) ========== */
function currentCards() {
  return appData.boards[appData.currentBoard].cards;
}
function currentBoard() {
  return appData.boards[appData.currentBoard];
}
function getCardFromElement(element) {
  return currentCards().find((e) => e.id === element.id);
}
function getItemFromElement(element) {
  for (let c of currentCards()) {
    for (let it of c.items) if (it.id === element.id) return it;
  }
}
function getBoardFromId(id) {
  return appData.boards.find((b) => b.id === id);
}

function listBoards() {
  e_boardsList.innerHTML = "";
  appData.boards.forEach((b) => {
    let li = document.createElement("li");
    li.innerText = b.name;
    li.id = b.id;
    if (b.id === currentBoard().id) li.classList.add("is-active");
    li.addEventListener("click", () => {
      renderBoard(b);
      listBoards();
    });
    e_boardsList.appendChild(li);
  });
}

function renderBoard(board) {
  appData.currentBoard = appData.boards.indexOf(board);
  document.title = "Hafsa's Trello | " + boardName;

  e_title.innerText = currentBoard().name;
  renderAllCards();
}

function renderAllCards() {
  // remove existing card DOMs (except the add-card box)
  for (let n of e_cardsContainer.querySelectorAll(".parent-card")) n.remove();
  for (let c of currentCards()) {
    let el = c.generateElement();
    e_cardsContainer.insertBefore(
      el,
      e_cardsContainer.childNodes[e_cardsContainer.childNodes.length - 2]
    );
    c.update();
  }
}

function renderCard(cardID) {
  let _card = currentCards().find((e) => e.id === cardID);
  if (!_card) {
    let ecur = document.getElementById(cardID);
    if (ecur) ecur.remove();
    return;
  }
  let curEl = document.getElementById(_card.id);
  let gen = _card.generateElement();
  if (curEl) curEl.parentNode.replaceChild(gen, curEl);
  else
    e_cardsContainer.insertBefore(
      gen,
      e_cardsContainer.childNodes[e_cardsContainer.childNodes.length - 2]
    );
  _card.update();
}

/* ========== Drag item (custom) ========== */
let cardDrag_mouseDown = false,
  cardDrag_mouseDownOn = null;
const cardDrag_update = (e) => {
  if (!cardDrag_mouseDown || !cardDrag_mouseDownOn) return;
  cardDrag_mouseDownOn.style.left = e.pageX + "px";
  cardDrag_mouseDownOn.style.top = e.pageY + "px";
};
const cardDrag_startDragging = (e) => {
  if (e.target.tagName !== "LI") return;
  cardDrag_mouseDown = true;
  cardDrag_mouseDownOn = e.target;
  cardDrag_mouseDownOn.style.position = "absolute";
  cardDrag_mouseDownOn.style.zIndex = 1000;
  toggleHoverStyle(true);
};
const cardDrag_stopDragging = (e) => {
  if (!cardDrag_mouseDown) return;
  toggleHoverStyle(false);
  let _hoverCard = getMouseOverCard();
  if (_hoverCard) {
    let _hoverItem = getMouseOverItem();
    let _hoverCardObject = getCardFromElement(_hoverCard);
    let _heldItemObject = getItemFromElement(cardDrag_mouseDownOn);
    if (!_hoverCardObject || !_heldItemObject) {
      cardDrag_mouseDown = false;
      cardDrag_mouseDownOn.style.position = "static";
      cardDrag_mouseDownOn = null;
      return;
    }
    if (_hoverCard === _heldItemObject.getParentCard()) {
      if (_hoverItem && _hoverItem !== cardDrag_mouseDownOn) {
        let _hoverItemObject = getItemFromElement(_hoverItem);
        _hoverCardObject.items.move(
          _hoverCardObject.items.indexOf(_heldItemObject),
          _hoverCardObject.items.indexOf(_hoverItemObject)
        );
      }
      renderCard(_heldItemObject.getParentCard().id);
    } else {
      if (_hoverItem && _hoverItem !== cardDrag_mouseDownOn) {
        let _hoverItemObject = getItemFromElement(_hoverItem);
        let _hoverItemParentObject = getCardFromElement(
          _hoverItemObject.getParentCard()
        );
        _hoverItemParentObject.items.insert(
          _hoverItemParentObject.items.indexOf(_hoverItemObject),
          _heldItemObject
        );
        getCardFromElement(_heldItemObject.getParentCard()).removeItem(
          _heldItemObject
        );
        _heldItemObject.parentCardId = _hoverItemParentObject.id;
      } else {
        _hoverCardObject.items.push(_heldItemObject);
        getCardFromElement(_heldItemObject.getParentCard()).removeItem(
          _heldItemObject
        );
        _heldItemObject.parentCardId = _hoverCardObject.id;
      }
      renderCard(_hoverCardObject.id);
      renderCard(_heldItemObject.getParentCard().id);
    }
  }
  cardDrag_mouseDown = false;
  if (cardDrag_mouseDownOn) {
    cardDrag_mouseDownOn.style.position = "static";
    cardDrag_mouseDownOn.style.zIndex = "";
  }
  cardDrag_mouseDownOn = null;
};
e_mainContainer.addEventListener("mousemove", cardDrag_update);
e_mainContainer.addEventListener("mouseleave", cardDrag_stopDragging, false);
window.addEventListener("mouseup", cardDrag_stopDragging, false);

/* ========== Drag scroll (cards container) ========== */
let scroll_mouseDown = false,
  scroll_startX = 0,
  scroll_scrollLeft = 0;
const scroll_startDragging = (e) => {
  scroll_mouseDown = true;
  scroll_startX = e.pageX - e_mainContainer.offsetLeft;
  scroll_scrollLeft = e_mainContainer.scrollLeft;
};
const scroll_stopDragging = () => {
  scroll_mouseDown = false;
};
const scroll_update = (e) => {
  if (!scroll_mouseDown || cardDrag_mouseDown) return;
  let x = e.pageX - e_mainContainer.offsetLeft - scroll_startX;
  e_mainContainer.scrollLeft = scroll_scrollLeft - x;
};
e_mainContainer.addEventListener("mousedown", scroll_startDragging, false);
e_mainContainer.addEventListener("mouseup", scroll_stopDragging, false);
e_mainContainer.addEventListener("mouseleave", scroll_stopDragging, false);
e_mainContainer.addEventListener("mousemove", scroll_update);

/* hover style toggle for drag feedback */
function toggleHoverStyle(show) {
  let existing = document.getElementById("dragHover");
  if (show && !existing) {
    let s = document.createElement("style");
    s.id = "dragHover";
    s.innerHTML =
      ".parent-card:hover { background-color:#c7cbd1; } .parent-card > ul > li:hover { background-color:#d1d1d1; }";
    document.body.appendChild(s);
  } else if (!show && existing) existing.remove();
}

/* ========== Card context menu ========== */
let cardContextMenu_currentCard = null;
const cardContextMenu_show = (e) => {
  cardContextMenu_currentCard = getMouseOverCard();
  if (!cardContextMenu_currentCard) return;
  const { clientX: mouseX, clientY: mouseY } = e;
  e_cardContextMenu.style.top = mouseY + "px";
  e_cardContextMenu.style.left = mouseX + "px";
  e_cardContextMenu.classList.remove("visible");
  setTimeout(() => e_cardContextMenu.classList.add("visible"), 10);
};
const cardContextMenu_hide = (ev) => {
  if (
    ev &&
    ev.target &&
    ev.target.offsetParent !== e_cardContextMenu &&
    e_cardContextMenu.classList.contains("visible")
  ) {
    e_cardContextMenu.classList.remove("visible");
  } else if (ev === undefined) e_cardContextMenu.classList.remove("visible");
};
const cardContextMenu_clearCard = () => {
  createConfirmDialog("Are you sure to clear this board", () => {
    let obj = getCardFromElement(cardContextMenu_currentCard);
    if (!obj) return;
    obj.items.length = 0;
    renderCard(obj.id);
  });
};
const cardContextMenu_deleteCard = () => {
  createConfirmDialog("Are you sure to delete this card", () => {
    let obj = getCardFromElement(cardContextMenu_currentCard);
    if (!obj) return;
    currentCards().splice(currentCards().indexOf(obj), 1);
    cardContextMenu_hide({ target: { offsetParent: "n/a" } });
    renderCard(obj.id);
  });
};
const cardContextMenu_duplicateCard = () => {
  let obj = getCardFromElement(cardContextMenu_currentCard);
  if (!obj) return;
  currentBoard().addCardFromInput();
  let i = currentBoard().cards.length - 1;
  currentBoard().cards[i].items = obj.items.map(
    (it) =>
      new Item(
        it.title,
        it.description,
        getBoardFromId(obj.parentBoardId).uniqueID(),
        currentBoard().cards[i].id
      )
  );
  currentBoard().cards[i].name = obj.name + " Copy";
  renderCard(currentBoard().cards[i].id);
};

document.body.addEventListener("click", cardContextMenu_hide);
e_cardContextMenuClear.addEventListener("click", cardContextMenu_clearCard);
e_cardContextMenuDelete.addEventListener("click", cardContextMenu_deleteCard);
e_cardContextMenuDuplicate.addEventListener(
  "click",
  cardContextMenu_duplicateCard
);

/* ========== Persistence ========== */
function saveData() {
  if (!appData.settings.dataPersistence) return;
  window.localStorage.setItem("kards-appData", JSON.stringify(appData));
}
function getDataFromLocalStorage() {
  return window.localStorage.getItem("kards-appData");
}
function loadData() {
  let data = getDataFromLocalStorage();
  if (data) {
    try {
      let parsed = JSON.parse(data);
      appData.settings = parsed.settings || appData.settings;
      appData.currentBoard =
        typeof parsed.currentBoard === "number" ? parsed.currentBoard : 0;
      appData.identifier = parsed.identifier || appData.identifier;
      // rehydrate boards/cards/items
      appData.boards = [];
      for (let b of parsed.boards || []) {
        let nb = new Board(b.name, b.id, b.settings, b.identifier);
        for (let c of b.cards || []) {
          let nc = new Card(c.name, c.id, b.id);
          for (let it of c.items || []) {
            let ni = new Item(it.title, it.description, it.id, c.id);
            ni.isDone = !!it.isDone;
            nc.items.push(ni);
          }
          nb.cards.push(nc);
        }
        appData.boards.push(nb);
      }
      if (!appData.boards.length) {
        appData.boards.push(new Board("Untitled Board", "b0", { theme: null }));
      }
      renderBoard(appData.boards[appData.currentBoard]);
    } catch (err) {
      console.error("Failed to load data:", err);
      appData.boards = [new Board("Untitled Board", "b0", { theme: null })];
    }
  } else {
    appData.boards = [new Board("Untitled Board", "b0", { theme: null })];
    renderBoard(appData.boards[0]);
  }
  listBoards();
}
loadData();

function clearData() {
  window.localStorage.clear();
}

/* ========== Event wiring ========== */
e_addCardText.addEventListener("keyup", (e) => {
  if (e.code === "Enter") currentBoard().addCardFromInput();
});
e_addCardButton.addEventListener("click", () =>
  currentBoard().addCardFromInput()
);
e_addBoardText.addEventListener("keyup", (e) => {
  if (e.code === "Enter") addBoard();
});
e_addBoardButton.addEventListener("click", addBoard);

e_autoSaveButton.addEventListener("change", function () {
  if (this.checked) startAutoSave();
  else {
    clearInterval(autoSaveInternalId);
    autoSaveInternalId = null;
  }
});
e_saveButton.addEventListener("click", () => {
  saveData();
  createAlert("Data successfully saved.");
});

e_deleteButton.addEventListener("click", () => {
  createConfirmDialog("Are you sure to delete this board?", () => {
    let boardName = currentBoard().name;
    appData.boards.splice(appData.currentBoard, 1);
    if (appData.currentBoard !== 0) appData.currentBoard--;
    if (!appData.boards.length) {
      appData.boards.push(new Board("Untitled Board", "b0", { theme: null }));
      appData.currentBoard = 0;
    }
    listBoards();
    renderBoard(appData.boards[appData.currentBoard]);
    createAlert(`Deleted board "${boardName}"`);
  });
});

window.onbeforeunload = function () {
  if (JSON.stringify(appData) !== getDataFromLocalStorage()) return confirm();
};

/* Sidebar toggle (hamburger) */
function toggleSidebar() {
  if ("toggled" in e_sidebar.dataset) {
    delete e_sidebar.dataset.toggled;
    e_sidebar.classList.remove("open");
    e_sidebar.style.width = "0";
    document.removeEventListener("click", listenClickOutside);
  } else {
    e_sidebar.dataset.toggled = "";
    e_sidebar.classList.add("open");
    // mobile: full width; desktop: 250px
    e_sidebar.style.width = window.innerWidth <= 900 ? "100%" : "250px";
    setTimeout(
      () => document.addEventListener("click", listenClickOutside),
      300
    );
  }
}
e_sidebarButton.addEventListener("click", toggleSidebar);
e_sidebarClose.addEventListener("click", toggleSidebar);

function listenClickOutside(event) {
  const _within = event.composedPath().includes(e_sidebar);
  if (!_within && e_sidebar.style.width !== "0") toggleSidebar();
}

/* ========== Confirm dialog helper ========== */
function createConfirmDialog(text, onConfirm) {
  cardContextMenu_hide({ target: { offsetParent: "n/a" } });
  let modal = document.getElementById("confirm-dialog"),
    span = document.getElementById("confirm-dialog-close");
  let dialogText = document.getElementById("confirm-dialog-text");
  let cancelBtn = document.getElementById("confirm-dialog-cancel");
  let confirmBtn = document.getElementById("confirm-dialog-confirm");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  dialogText.textContent = text;
  span.onclick = () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  };
  cancelBtn.onclick = () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  };
  confirmBtn.onclick = () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    onConfirm && onConfirm();
  };
  window.onclick = (ev) => {
    if (ev.target === modal) {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    }
  };
}

/* utility to add a board from input */
function addBoard() {
  let title = e_addBoardText.value.trim();
  if (!title) return createAlert("Type a name for the board!");
  if (appData.boards.length >= 512)
    return createAlert("Max limit for boards reached.");
  e_addBoardText.value = "";
  let nb = new Board(title, uniqueID(), { theme: null });
  appData.boards.push(nb);
  listBoards();
}

/* small helpers for debug */
function getMouseOverCard() {
  return document.querySelectorAll(".parent-card:hover")[0];
}
function getMouseOverItem() {
  return document.querySelectorAll(".parent-card > ul > li:hover")[0];
}
function getItemFromElement(element) {
  for (let c of currentCards())
    for (let it of c.items) if (it.id === element.id) return it;
}

/* End of file */
