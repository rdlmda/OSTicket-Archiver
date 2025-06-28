// Function to add a button to each row of tables inside the form with ID "tickets"
function addButtonToTableRows() {
  // Select the form with ID "tickets"
  const form = document.getElementById("tickets");

  // Check if the form exists
  if (form) {
    // Find the column index with th[data-id="10"]
    let targetColIndex = null;
    const thead = form.querySelector("thead");
    if (thead) {
      const ths = Array.from(thead.querySelectorAll("th"));
      targetColIndex = ths.findIndex(th => th.getAttribute("data-id") === "10");
    }

    // Select all tbody elements within the form
    const tables = form.querySelectorAll("tbody");

    tables.forEach(tbody => {
      const rows = tbody.querySelectorAll("tr");
      rows.forEach(row => {
        // Check if the button already exists to avoid duplicates
        if (!row.querySelector("button")) {
          // Create a new button with type "button"
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Archive";
          button.style.marginLeft = "10px";

          // Add an event listener to the button
          button.addEventListener("click", () => {
            if (targetColIndex !== null) {
              const targetCellText = row.cells[targetColIndex]?.textContent.trim();
              if (targetCellText) {
                row.remove();
                archiveRow(targetCellText); // Archive the row based on the target column's cell text
              }
            }
          });

          // Append the button to the row
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

function archiveRow(targetCellText) {
  // Get the current archived rows from storage
  browser.storage.local.get("archivedRows").then(result => {
    const archivedRows = result.archivedRows || [];
    archivedRows.push(targetCellText);
    browser.storage.local.set({ archivedRows });
  });
}

// Function to restore archived rows
function restoreArchivedRows(targetColIndex) {
  // Get the archived rows from storage
  browser.storage.local.get("archivedRows").then(result => {
    const archivedRows = result.archivedRows || [];
    archivedRows.forEach(targetCellText => {
      const form = document.getElementById("tickets");
      const rows = form ? form.querySelectorAll("tbody tr") : [];
      rows.forEach(row => {
        const cellText = row.cells[targetColIndex]?.textContent.trim();
        if (cellText === targetCellText) {
          row.remove();
        }
      });
    });
  });
}

// Function to observe changes in the entire document
function observeDOMChanges() {
  const observer = new MutationObserver((mutationsList) => {
    // Reapply the button-adding logic only if new nodes are added
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        addButtonToTableRows(); // Reapply the button-adding logic
        break; // Exit after handling the first mutation
      }
    }
  });

  // Start observing the entire document body for child node changes
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
