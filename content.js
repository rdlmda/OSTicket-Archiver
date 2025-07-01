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
let targetColIndex;
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

    archiveCounter.addEventListener("click", showUnarchivePopup);
    const newColLabel = form.querySelector("thead tr");
    newColLabel.insertBefore(archiveCounter, newColLabel.lastChild);
  }
}

function updateArchiveCounter() {
  browser.storage.local.get("archivedRows").then(result => {
    const archivedRows = result.archivedRows || [];
    archiveCounter.textContent = `📩 (${archivedRows.length})`;
  });
}

function showUnarchivePopup() {
  const popup = document.createElement("div");
  popup.id = "unarchivePopup";
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
  title.textContent = "Unarchive Rows";
  popup.appendChild(title);

  const list = document.createElement("ul");
  list.style.listStyleType = "none";
  list.style.padding = "0";

  browser.storage.local.get("archivedRows").then(result => {
    const archivedRows = result.archivedRows || [];
    archivedRows.forEach(targetCellText => {
      const listItem = document.createElement("li");
      listItem.textContent = targetCellText;

      const unarchiveButton = document.createElement("button");
      unarchiveButton.textContent = "Unarchive";
      unarchiveButton.style.marginLeft = "10px";
      unarchiveButton.addEventListener("click", () => {
        unarchiveRow(targetCellText);
        listItem.remove();
        updateArchiveCounter();
      });

      listItem.appendChild(unarchiveButton);
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

function unarchiveRow(targetCellText) {
  return browser.storage.local.get("archivedRows").then(result => {
    const archivedRows = result.archivedRows || [];
    const updatedRows = archivedRows.filter(row => row !== targetCellText);

    return browser.storage.local.set({ archivedRows: updatedRows }).then(() => {
      const form = document.getElementById("tickets");
      const rows = form ? form.querySelectorAll("tbody tr") : [];
      rows.forEach(row => {
        const cellText = row.cells[targetColIndex]?.textContent.trim();
        if (cellText === targetCellText) {
          row.removeAttribute('hidden');
        }
      });
    });
  });
}

function addButtonToTableRows() {
  const form = document.getElementById("tickets");

  if (form) {
    // The "Last Updated" column can be at any position, but its data-id is always 10
    targetColIndex = null;
    const thead = form.querySelector("thead");
    if (thead) {
      const ths = Array.from(thead.querySelectorAll("th"));
      targetColIndex = ths.findIndex(th => th.getAttribute("data-id") === "10");
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
            if (targetColIndex !== null) {
              const targetCellText = row.cells[targetColIndex]?.textContent.trim();
              if (targetCellText) {
                archiveRow(targetCellText)
                  .then(() => {
                    updateArchiveCounter();
                    return restoreArchivedRows(targetColIndex);
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

    // If targetColIndex remains null (e.g., when the header isn’t found), calling restoreArchivedRows(null) will lead to invalid cell lookups. Add a guard to only call restoreArchivedRows when targetColIndex is non-null.
    if (targetColIndex !== null) {
      restoreArchivedRows(targetColIndex);
    }
  }
}

// Save list of archived rows to local storage.
function archiveRow(targetCellText) {
  return browser.storage.local.get("archivedRows") // return the promise for addEventListener
  .then(result => {
    const archivedRows = result.archivedRows || [];
    archivedRows.push(targetCellText);
    return browser.storage.local.set({ archivedRows });
  });
}

// Retrieve (and parse) list of archived rows from local storage
function restoreArchivedRows(targetColIndex) {
  browser.storage.local.get("archivedRows").then(result => {
    const archivedRows = result.archivedRows || [];
    archivedRows.forEach(targetCellText => {
      const form = document.getElementById("tickets");
      const rows = form ? form.querySelectorAll("tbody tr") : [];
      rows.forEach(row => {
        const cellText = row.cells[targetColIndex]?.textContent.trim();
        if (cellText === targetCellText) {
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
        addButtonToTableRows();
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
  addButtonToTableRows();
  observeDOMChanges();
}
