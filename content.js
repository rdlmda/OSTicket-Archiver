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

// Flags
let isShowingHiddenRows = false;
let archiveCounter = null;

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

  dataRows.forEach(row => {
    if (row.querySelectorAll(".button-container").length == 0 ) {
      const buttonContainer = document.createElement("td");
      buttonContainer.className = "button-container";
      buttonContainer.style.textAlign = "center";
      buttonContainer.style.verticalAlign = "middle";
      row.appendChild(buttonContainer);
    }
  })

  mergeDates();
  addArchiveCounter();
  addArchiveButtons();
  loadArchivedTickets();
  updateArchiveCounter();
}

// Helper to compare arrays, as a direct array comparision will always return 
// 'true' -- since JavaScript compares objects by reference, not value.
function arraysEqual(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}

// Helper function
function parseDate(strDate) {

  if (strDate.length == 0)
    return 0;

  if (is8601(strDate)) {
    return new Date(strDate).getTime();
  }

  const parts = strDate.split((/[/ :]/)); // splits on " ", "/", ":"

  // Extract day, month, year, hour, minute
  // Expects format as "dd/mm/yy hh:mm"
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JavaScript
  const year = parseInt("20" + parts[2], 10);
  const hour = parseInt(parts[3], 10);
  const minute = parseInt(parts[4], 10);

  return new Date(year, month, day, hour, minute).getTime();
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

function relativeTime(unixTimestamp) {
  const now = Date.now();
  const seconds = Math.floor((now - unixTimestamp * 1000) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ];

  let remainingSeconds = seconds;
  const timeComponents = [];

  for (const { label, seconds: intervalSeconds } of intervals) {
    const count = Math.floor(remainingSeconds / intervalSeconds);
    if (count > 0) {
      if (timeComponents.length < 2) {
        timeComponents.push(`${count} ${label}${count > 1 ? 's' : ''}`);
        remainingSeconds -= count * intervalSeconds;
      }
    }
  }

  // Format the output
  if (timeComponents.length === 0) {
    return 'just now';
  } else if (timeComponents.length === 1) {
    return `${timeComponents[0]} ago`;
  } else {
    const lastComponent = timeComponents.pop();
    return `${timeComponents.join(', ')} and ${lastComponent} ago`;
  }
}

function mergeDates() {
  thCell = document.createElement("th");
  thCell.textContent = "Last Change";
  rowHeader = ticketForm.querySelector("thead tr");
  rowHeader.insertBefore(thCell, rowHeader.lastChild);

  x = colHeaders[luIndex];
  y = colHeaders[lmIndex];
  z = colHeaders[lrIndex];

  x.remove();
  y.remove();
  z.remove();

  dataRows.forEach( row => {
    const dc = row.cells[dcIndex];
    const lu = row.cells[luIndex];
    const lm = row.cells[lmIndex];
    const lr = row.cells[lrIndex];
    
    const dcTS = parseDate(dc.textContent);
    const luTS = parseDate(lu.textContent);
    const lmTS = parseDate(lm.firstChild.firstChild.dateTime);
    const lrTS = parseDate(lr.firstChild.firstChild.dateTime);
    const mostRecent = [dcTS, luTS, lmTS, lrTS]
      .filter(x => x !== 0)
      .reduce((y, z) => { return z > y ? z : y; });

    lu.remove();
    lm.remove();
    lr.remove();

    tsCell = document.createElement("td");
    const litDate = document.createElement('span');
    litDate.textContent = `${(new Date(mostRecent)).toLocaleString("pt-br")}`;
    const lineBreak = document.createElement('br');
    const relDate = document.createElement('span');
    relDate.textContent = `(${relativeTime(mostRecent / 1000)})`;
    tsCell.appendChild(litDate);
    tsCell.appendChild(lineBreak);
    tsCell.appendChild(relDate);
    row.insertBefore(tsCell, row.lastChild);
  });
}

function addArchiveCounter() {
  if (ticketForm && !document.getElementById("archiveCounter") ) {
    archiveCounter = document.createElement("th");
    archiveCounter.id = "archiveCounter";
    archiveCounter.style.cursor = "pointer";
    archiveCounter.style.textAlign = "center";
    archiveCounter.style.verticalAlign = "middle";
    updateArchiveCounter();

    archiveCounter.addEventListener("click", toggleHiddenRows);
    colHeaders[0].parentNode.appendChild(archiveCounter);
  }
}

function updateArchiveCounter() {
  browser.storage.local.get("archivedTickets").then(result => {
    if (!isShowingHiddenRows) {
      const archivedTickets = Array.from(ticketForm.querySelectorAll("tr"))?.filter(tr => tr.getAttribute("hidden") == "true").length || 0;
      archiveCounter.textContent = `📥 (${archivedTickets})`;
    } else {
      archiveCounter.textContent = `👁️`;
    }
  });
}

function toggleHiddenRows() {
  if (isShowingHiddenRows) {
    loadArchivedTickets();
    isShowingHiddenRows = !isShowingHiddenRows;
    updateArchiveCounter();
    return;
  }

  dataRows.forEach(row => {
    if (row.getAttribute('hidden')) {
      row.removeAttribute('hidden')
      row.querySelector(".button-container button")?.remove();
      addRestoreButton(row);
    }
  });

  isShowingHiddenRows = !isShowingHiddenRows;
  updateArchiveCounter();
}

function restoreTicket([idNum,timeStamp]) {
  return browser.storage.local.get("archivedTickets").then(result => {
    const archivedTickets = result.archivedTickets || [];
    const updatedTickets = archivedTickets.filter(entry => !arraysEqual(entry, [idNum,timeStamp])); // Builds a new list without the ticket being restored

    return browser.storage.local.set({ archivedTickets: updatedTickets }).then(() => {
      dataRows.forEach(row => {
        const rowIDNum = row.cells[idIndex]?.textContent.trim();
        const rowTimeStamp = parseDate(row.cells[luIndex]?.textContent.trim());
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
      addArchiveButton(row);
    });
  }
}

function addArchiveButton(row) {
  target = row.querySelector(".button-container")
  if (target != null && target.textContent != "📥") {
    const archiveButton = document.createElement("button");
    archiveButton.type = "button";
    archiveButton.textContent = "📥";
    archiveButton.style.margin = "5px";

    archiveButton.addEventListener("click", () => {
      if (idIndex !== null && luIndex !== null) {
        const idNum = row.cells[idIndex]?.textContent.trim();
        const timeStamp = parseDate(row.cells[luIndex]?.textContent.trim());
        if (idNum && timeStamp) {
          archiveTicket(idNum, timeStamp)
            .then(() => {
              updateArchiveCounter();
              return loadArchivedTickets();
            })
            .catch(console.error);
        }
      }
    });

    target.appendChild(archiveButton);
  }
}

function addRestoreButton(row) {
  target = row.querySelector(".button-container")
  if (target != null && target.textContent != "📤") {
    const restoreButton = document.createElement("button");
    restoreButton.type = "button";
    restoreButton.textContent = "📤";
    restoreButton.style.margin = "5px";
    restoreButton.style.backgroundColor = 'lightcoral';

    restoreButton.addEventListener("click", () => {
      const idNum = row.cells[idIndex]?.textContent.trim();
      const timeStamp = parseDate(row.cells[luIndex]?.textContent.trim());
      restoreTicket([idNum,timeStamp]);
      row.querySelector(".button-container button")?.remove();
      addArchiveButton(row);
    });
    
    target.appendChild(restoreButton);
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
        const rowTimeStamp = parseDate(row.cells[luIndex]?.textContent.trim());
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
