// Function to add a button to each row of tables inside the form with ID "tickets"
function addButtonToTableRows() {
  // Select the form with ID "tickets"
  const form = document.getElementById("tickets");

  // Check if the form exists
  if (form) {
    // Select all tbody elements within the form
    const tables = form.querySelectorAll("tbody");

    tables.forEach(tbody => {
      const rows = tbody.querySelectorAll("tr");
      rows.forEach(row => {
        // Check if the button already exists to avoid duplicates
        if (!row.querySelector("button")) {
          // Create a new button with type "button"
          const button = document.createElement("button");
          button.type = "button"; // Prevents the button from submitting the form
          button.textContent = "Archive"; // Change button text to "Archive"
          button.style.marginLeft = "10px"; // Add some space between the button and the row content

          // Add an event listener to the button
          button.addEventListener("click", () => {
            const thirdCellText = row.cells[2]?.textContent.trim(); // Get the text content of the third <td>
            if (thirdCellText) {
              row.remove(); // Remove the specific <tr> from the DOM
              archiveRow(thirdCellText); // Archive the row based on the third cell's text
            }
          });

          // Append the button to the row
          row.appendChild(button);
        }
      });
    });

    // Restore archived rows
    restoreArchivedRows();
  }
}

// Function to archive the row based on the third cell's text
function archiveRow(thirdCellText) {
  // Get the current archived rows from storage
  browser.storage.local.get("archivedRows").then(result => {
    const archivedRows = result.archivedRows || [];
    archivedRows.push(thirdCellText); // Add the new archived row text
    browser.storage.local.set({ archivedRows }); // Save the updated list
  });
}

// Function to restore archived rows
function restoreArchivedRows() {
  // Get the archived rows from storage
  browser.storage.local.get("archivedRows").then(result => {
    const archivedRows = result.archivedRows || [];
    archivedRows.forEach(thirdCellText => {
      const rows = document.querySelectorAll("tbody tr");
      rows.forEach(row => {
        const rowThirdCellText = row.cells[2]?.textContent.trim(); // Get the text content of the third <td>
        if (rowThirdCellText === thirdCellText) {
          row.remove(); // Remove the archived row from the DOM
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
