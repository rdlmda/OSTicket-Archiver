// FireFox & Chrome compatibility
if (typeof browser === 'undefined') {
    // Check if we're in a Firefox environment
    if (typeof window.browser !== 'undefined') {
        browser = window.browser; // Firefox
    } else {
        browser = window.chrome; // Chrome
    }
}

let archiveCounter;
let tsIndex; // Colum Index for the "Last Updated" timestamp
let debugCounter = 0;

function addArchiveCounter() {
  const form = document.getElementById("tickets");
  if (form && !document.getElementById("archiveCounter") ) {
    archiveCounter = document.createElement("th");
    archiveCounter.id = "archiveCounter";
    archiveCounter.style.cursor = "pointer";
    archiveCounter.style.textAlign = "center";
    archiveCounter.style.verticalAlign = "middle";
    updateArchiveCounter();

    archiveCounter.addEventListener("click", showRestorePopup);
    const colHeader = form.querySelector("thead tr");
    colHeader.insertBefore(archiveCounter, colHeader.lastChild);
  }
}

function updateArchiveCounter() {
  browser.storage.local.get("archivedTickets").then(result => {
    const archivedTickets = result.archivedTickets || [];
    archiveCounter.textContent = `📩 (${archivedTickets.length})`;
  });
}

function showRestorePopup() {
  const popup = document.createElement("div");
  popup.id = "restorePopup";
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.backgroundColor = "white";
  popup.style.border = "1px solid #ccc";
  popup.style.padding = "20px";
  popup.style.zIndex = "1000";
  popup.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
  popup.style.maxWidth = "400px";
  popup.style.maxHeight = "300px";
  popup.style.overflowY = "auto";

  const title = document.createElement("h2");
  title.textContent = "Restore tickets";
  popup.appendChild(title);

  const list = document.createElement("ul");
  list.style.listStyleType = "none";
  list.style.padding = "0";

  browser.storage.local.get("archivedTickets").then(result => {
    const archivedTickets = result.archivedTickets || [];
    archivedTickets.forEach(timeStamp => {
      const listItem = document.createElement("li");
      listItem.textContent = timeStamp;

      const restoreButton = document.createElement("button");
      restoreButton.textContent = "Restore";
      restoreButton.style.marginLeft = "10px";
      restoreButton.addEventListener("click", () => {
        restoreTicket(timeStamp);
        listItem.remove();
        updateArchiveCounter();
      });

      listItem.appendChild(restoreButton);
      list.appendChild(listItem);
    });
  });

  popup.appendChild(list);
  document.body.appendChild(popup);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.marginTop = "10px";
  closeButton.addEventListener("click", () => {
    document.body.removeChild(popup);
  });
  popup.appendChild(closeButton);
}

function restoreTicket(timeStamp) {
  return browser.storage.local.get("archivedTickets").then(result => {
    const archivedTickets = result.archivedTickets || [];
    const updatedTickets = archivedTickets.filter(entry => entry !== timeStamp); // Builds a new list without the current timeStamp

    return browser.storage.local.set({ archivedTickets: updatedTickets }).then(() => {
      const form = document.getElementById("tickets");
      const rows = form ? form.querySelectorAll("tbody tr") : [];
      rows.forEach(row => {
        const rowTimeStamp = row.cells[tsIndex]?.textContent.trim();
        if (rowTimeStamp === timeStamp) {
          row.removeAttribute('hidden');
        }
      });
    });
  }).then(() => {
    updateArchiveCounter();
  });
}

function addArchiveButtons() {
  const form = document.getElementById("tickets");

  if (form) {
    // The "Last Updated" column can be at any position, but its data-id is always 10
    tsIndex = null;
    const thead = form.querySelector("thead");
    if (thead) {
      const ths = Array.from(thead.querySelectorAll("th"));
      tsIndex = ths.findIndex(th => th.getAttribute("data-id") === "10");
    }

    const tables = form.querySelectorAll("tbody");

    tables.forEach(tbody => {
      const rows = tbody.querySelectorAll("tr");
      rows.forEach(row => {
        if (!row.querySelector("button")) { // Avoid duplicates
          const cell = document.createElement("td");
          cell.style.textAlign = "center";
          cell.style.verticalAlign = "middle";

          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Archive";
          button.style.margin = "5px";

          button.addEventListener("click", () => {
            if (tsIndex !== null) {
              const timeStamp = row.cells[tsIndex]?.textContent.trim();
              if (timeStamp) {
                archiveTicket(timeStamp)
                  .then(() => {
                    updateArchiveCounter();
                    return loadArchivedTickets(tsIndex);
                  })
                  .catch(console.error);
              }
            }
          });

          row.appendChild(cell);
          cell.appendChild(button);
        }
      });
    });

    // If tsIndex remains null (e.g., when the header isn’t found), calling loadArchivedTickets(null) will lead to invalid cell lookups. Add a guard to only call loadArchivedTickets when tsIndex is non-null.
    if (tsIndex !== null) {
      loadArchivedTickets(tsIndex);
    }
  }
}

// Save list of archived rows to local storage.
function archiveTicket(timeStamp) {
  return browser.storage.local.get("archivedTickets") // return the promise for addEventListener
  .then(result => {
    const archivedTickets = result.archivedTickets || [];
    archivedTickets.push(timeStamp);
    return browser.storage.local.set({ archivedTickets });
  });
}

// Retrieve (and parse) list of archived rows from local storage
function loadArchivedTickets(tsIndex) {
  browser.storage.local.get("archivedTickets").then(result => {
    const archivedTickets = result.archivedTickets || [];
    archivedTickets.forEach(timeStamp => {
      const form = document.getElementById("tickets");
      const rows = form ? form.querySelectorAll("tbody tr") : [];
      rows.forEach(row => {
        const rowTimeStamp = row.cells[tsIndex]?.textContent.trim();
        if (rowTimeStamp === timeStamp) {
          row.setAttribute('hidden', true);
        }
      });
    });
  });
}

// Observe the entire document body for child node changes
// Needed for when pages are reloaded via AJAX / PJAX on menu clicks
function observeDOMChanges() {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) { // only if new nodes are added
        addArchiveCounter();
        addArchiveButtons();
        break; // Exit after handling the first mutation
      }
    }
  });

  observer.observe(document.getElementById("pjax-container"), { childList: true, subtree: true });
}

// Only run the addon if the title and meta tag are present
function shouldRunAddon() {
  const title = document.title;
  const metaTag = document.querySelector('meta[name="tip-namespace"]');
  return title.includes("osTicket") && metaTag && metaTag.content === "tickets.queue";
}

if (shouldRunAddon()) {
  addArchiveCounter();
  addArchiveButtons();
  observeDOMChanges();
}
