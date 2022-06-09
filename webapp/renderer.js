window.addEventListener('DOMContentLoaded', async () => {
    listConnections();
});

/**
 * fetchs connections and renders them into mainMenu div
 */
async function listConnections() {
    let connections = await window.preload.fetchConnections();
    let mainMenu = document.getElementById('main_menu');
    mainMenu.innerHTML = "";
    connections.forEach(connection => {
        let aNode = document.createElement('a');
        aNode.innerHTML = `${connection.name}`;
        aNode.setAttribute("data-conn", JSON.stringify(connection));
        aNode.setAttribute("href", "#");
        aNode.addEventListener('click', eventLoadModificationForm);
        aNode.addEventListener('auxclick', eventDeleteConnection);
        aNode.addEventListener('dblclick', eventOpenConnection);
        mainMenu.appendChild(aNode);
    });
}

/**
 * Listener for a click event which loads the form for modifying a selected connection
 * @param {MouseEvent} event 
 */
async function eventLoadModificationForm(event) {
    let dataConn = event.target.getAttribute("data-conn");
    /** @type {connection} */
    let conn = JSON.parse(dataConn);
    await loadView('new-connection');
    document.connection.name.value = conn.name;
    document.connection.name.disabled = true;
    document.connection.topicString.value = conn.topicString;
    document.connection.topicName.value = conn.topicName;
    document.connection.btnConnection.value = "Update";
    document.connection.btnConnection.setAttribute("onclick", "updateConnection()");
    
}

/**
 * Listener for a double click event which eliminates the selected connection
 * @param {MouseEvent} event 
 */
async function eventDeleteConnection(event) {
    if(confirm(`Delete ${event.target.innerHTML} item?`)) {
        let dataConn = event.target.getAttribute("data-conn");
        let conn = JSON.parse(dataConn);
        await window.preload.removeConnection(conn);
        await listConnections();
    }
}

/**
 * Listener for opening an existing connection
 * @param {MouseEvent} event 
 */
async function eventOpenConnection(event) {
    document.querySelectorAll("#main_menu a").forEach(aE => aE.classList.remove("active"));
    /** @type {HTMLElement} */
    let aElement = event.target;
    let dataConn = aElement.getAttribute("data-conn");
    aElement.classList.add("active");
    window.sessionStorage.setItem("selectedConnection", dataConn);
    window.sessionStorage.removeItem('selectedSubscription');
    await loadView('connection-session');
    await populateSession();
}

/**
 * loads corresponding html viewName into mainContent div
 * @param {string} viewName 
 */
async function loadView(viewName) {
    let viewContent = await window.preload.fetchViewAsHtml(`${viewName}.html`);
    let mainContent = document.getElementById("main_content");
    mainContent.innerHTML = "";
    mainContent.innerHTML = viewContent;
}
