// FireFox & Chrome compatibility
if (typeof browser === 'undefined') {
    // Check if we're in a Firefox environment
    if (typeof window.browser !== 'undefined') {
        browser = window.browser; // Firefox
    } else {
        browser = window.chrome; // Chrome
    }
}

// The columns can be at any position, but its data-ids are fixed. 
// We use these vars to detect their position on the table.
let idIndex = null; // "Ticket #", data-id = 1.
let dcIndex = null; // "Date Created", data-id = 2.
let luIndex = null; // "Last Updated", data-id = 10.
let lmIndex = null; // "Last Message", data-id = 12.
let lrIndex = null; // "Last Response", data-id = 13.

// DOM Elements to be found
let ticketForm = null;
let colHeaders = null;
let dataRows = null;

let archiveCounter;

function init() {
  ticketForm = document.getElementById("tickets");
  colHeaders = Array.from(ticketForm ? ticketForm.querySelectorAll("thead th") : []);
  if (colHeaders.length > 0) {
    idIndex = colHeaders.findIndex(th => th.getAttribute("data-id") === "1");
    dcIndex = colHeaders.findIndex(th => th.getAttribute("data-id") === "2");
    luIndex = colHeaders.findIndex(th => th.getAttribute("data-id") === "10");
    lmIndex = colHeaders.findIndex(th => th.getAttribute("data-id") === "12");
    lrIndex = colHeaders.findIndex(th => th.getAttribute("data-id") === "13");
  }

  if (
    [idIndex, dcIndex, luIndex, lmIndex, lrIndex].some(x => x == null) &&
    [idIndex, dcIndex, luIndex, lmIndex, lrIndex].some(x => x == -1)
  ) {
    console.log("Required columns haven't been found");
    return;
  }

  dataRows = ticketForm ? ticketForm.querySelectorAll("tbody tr") : [];

  mergeDates();
  addArchiveCounter();
  addArchiveButtons();
  loadArchivedTickets();
}

// Helper to compare arrays, as a direct array comparision will always return 
// 'true' -- since JavaScript compares objects by reference, not value.
function arraysEqual(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}

// Helper function
function parseDate(strDate) {

  if (is8601(strDate)) {
    return new Date(strDate);
  }

  const parts = strDate.split((/[/ :]/)); // splits on " ", "/", ":"

  // Extract day, month, year, hour, minute
  // Expects format as "dd/mm/yy hh:mm"
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JavaScript
  const year = parseInt("20" + parts[2], 10);
  const hour = parseInt(parts[3], 10);
  const minute = parseInt(parts[4], 10);

  return new Date(year, month, day, hour, minute);
}

// Helper function to check if a string is an ISO-8601 formatted date 
function is8601(strDate) {
  // Regular expression for ISO8601 format
  const iso8601Regex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:\d{2})?$/;
  
  // First, check regex match
  if (!iso8601Regex.test(strDate)) {
    return false;
  }

  // Additional validation using Date parsing
  try {
    const date = new Date(strDate);
    return !isNaN(date.getTime());
  } catch (e) {
    return false;
  }
}

// Helper function for getting the most recent date in an array
function mostRecentDate(dates) {
  const validDates = dates.filter(date => date.getTime() !== 0);
    
    if (validDates.length === 0) return null; // Return null if no valid dates are found

    return validDates.reduce((mostRecent, currentDate) => {
        return currentDate > mostRecent ? currentDate : mostRecent;
    });
}

function mergeDates() {
    
}

function addArchiveCounter() {
  if (ticketForm && !document.getElementById("archiveCounter") ) {
    archiveCounter = document.createElement("th");
    archiveCounter.id = "archiveCounter";
    archiveCounter.style.cursor = "pointer";
    archiveCounter.style.textAlign = "center";
    archiveCounter.style.verticalAlign = "middle";
    updateArchiveCounter();

    archiveCounter.addEventListener("click", showRestorePopup);
    colHeaders[0].parentNode.appendChild(archiveCounter);
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
    archivedTickets.forEach(archivedTicket => {
      const [idNum, timeStamp] = archivedTicket;
      const listItem = document.createElement("li");
      listItem.textContent = idNum + ' - ' + timeStamp;

      const restoreButton = document.createElement("button");
      restoreButton.textContent = "Restore";
      restoreButton.style.marginLeft = "10px";
      restoreButton.addEventListener("click", () => {
        restoreTicket([idNum,timeStamp]);
        listItem.remove();
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

function restoreTicket([idNum,timeStamp]) {
  return browser.storage.local.get("archivedTickets").then(result => {
    const archivedTickets = result.archivedTickets || [];
    const updatedTickets = archivedTickets.filter(entry => !arraysEqual(entry, [idNum,timeStamp])); // Builds a new list without the ticket being restored

    return browser.storage.local.set({ archivedTickets: updatedTickets }).then(() => {
      dataRows.forEach(row => {
        const rowIDNum = row.cells[idIndex]?.textContent.trim();
        const rowTimeStamp = row.cells[luIndex]?.textContent.trim();
        if (rowIDNum === idNum && rowTimeStamp === timeStamp) {
          row.removeAttribute('hidden');
        }
      });
    });
  }).then(() => {
    updateArchiveCounter();
  });
}

function addArchiveButtons() {
  if (ticketForm) {

    dataRows.forEach(row => {
      if (!row.querySelector("button")) { // Avoid duplicates
        const cell = document.createElement("td");
        cell.style.textAlign = "center";
        cell.style.verticalAlign = "middle";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Archive";
        button.style.margin = "5px";

        button.addEventListener("click", () => {
          if (idIndex !== null && luIndex !== null) {
            const idNum = row.cells[idIndex]?.textContent.trim();
            const timeStamp = row.cells[luIndex]?.textContent.trim();
            if (idNum && timeStamp) {
              archiveTicket(idNum, timeStamp)
                .then(() => {
                  updateArchiveCounter();
                  return loadArchivedTickets(luIndex);
                })
                .catch(console.error);
            }
          }
        });

        row.appendChild(cell);
        cell.appendChild(button);
      }
    });
  }
}

// Save list of archived rows to local storage.
function archiveTicket(idNum, timeStamp) {
  return browser.storage.local.get("archivedTickets") // return the promise for addEventListener
  .then(result => {
    const archivedTickets = result.archivedTickets || [];
    archivedTickets.push([idNum, timeStamp]);
    return browser.storage.local.set({ archivedTickets });
  });
}

// Retrieve (and parse) list of archived rows from local storage
function loadArchivedTickets() {
  browser.storage.local.get("archivedTickets").then(result => {
    const archivedTickets = result.archivedTickets || [];
    archivedTickets.forEach( archivedTicket => {
      const [idNum, timeStamp] = archivedTicket;
      dataRows.forEach(row => {
        const rowTicketID = row.cells[idIndex]?.textContent.trim();
        const rowTimeStamp = row.cells[luIndex]?.textContent.trim();
        if (rowTicketID === idNum && rowTimeStamp === timeStamp) {
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
      if (
        mutation.type === 'childList' && 
        mutation.addedNodes.length > 0 &&
        mutation.target == document.getElementById("pjax-container")
      ) {
        init();
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
  init();
  observeDOMChanges();
}
