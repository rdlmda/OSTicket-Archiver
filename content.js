function addButtonToTableRows() {
  const form = document.getElementById("tickets");

  if (form) {
    // The "Last Updated" column can be at any postition, but its data-id is always 10
    let targetColIndex = null;
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
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Archive";
          button.style.marginLeft = "10px";

          button.addEventListener("click", () => {
            if (targetColIndex !== null) {
              const targetCellText = row.cells[targetColIndex]?.textContent.trim();
              if (targetCellText) {
                archiveRow(targetCellText);
                restoreArchivedRows(targetColIndex);
              }
            }
          });

          row.appendChild(button);
        }
      });
    });

    // If targetColIndex remains null (e.g., when the header isn’t found), calling restoreArchivedRows(null) will lead to invalid cell lookups. Add a guard to only call restoreArchivedRows when targetColIndex is non-null.
    if (targetColIndex !== null) {
      restoreArchivedRows(targetColIndex);
    }
  }
}

// Save list of archived rows to local storage
function archiveRow(targetCellText) {
  browser.storage.local.get("archivedRows").then(result => {
    const archivedRows = result.archivedRows || [];
    archivedRows.push(targetCellText);
    browser.storage.local.set({ archivedRows });
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
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        addButtonToTableRows(); // Reapply the button-adding logic only if new nodes are added
        break; // Exit after handling the first mutation
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Only run the addon if the title and meta tag are present
function shouldRunAddon() {
  const title = document.title;
  const metaTag = document.querySelector('meta[name="tip-namespace"]');
  return title.includes("osTicket") && metaTag && metaTag.content === "tickets.queue";
}

if (shouldRunAddon()) {
  addButtonToTableRows();
  observeDOMChanges();
}
