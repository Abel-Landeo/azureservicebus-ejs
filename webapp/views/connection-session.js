
async function populateSession() {
    document.getElementById("conses_initbutton").click();
    /** @type {HTMLTextAreaElement} */
    let appProps = document.querySelector("#conses_appprops");
    appProps.value = JSON.stringify({}, undefined, 3);
    appProps.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            appProps.setRangeText('    ', appProps.selectionStart, appProps.selectionEnd, 'end');
        }
    });
    let conn = getSelectedConn();
    document.getElementById("connectionName").innerHTML = conn.name;
    document.getElementById("conses_topic-name").innerHTML = conn.topicName;
    let subs = await window.servicebus.listSubscriptions(conn);
    let subsSelect = document.getElementById("conses_subscriptions");

    /** @type {HTMLUListElement} */
    let listSubs = document.getElementById("conses_listsubs");
    subs.forEach(sub => {
        /** @type {HTMLLIElement} */
        let liElement = document.createElement("li");
        liElement.innerText = `${sub.subscriptionName} (${sub.totalMessageCount}, ${sub.activeMessageCount}, ${sub.deadLetterMessageCount})`;
        liElement.setAttribute("data-subsname", sub.subscriptionName);
        liElement.addEventListener('dblclick', showSubsConfigEvent);
        liElement.addEventListener("auxclick", deleteSubsEvent);
        listSubs.append(liElement);
    });
    let adminTitle = document.getElementById("conses_admintitle");
    adminTitle.innerHTML = `Total: ${subs.length}`;
    /** @type {HTMLButtonElement} */
    let createButton = document.getElementById("conses_buttoncreate");
    createButton.removeAttribute("disabled");

    
    subs.forEach(sub => {
        /** @type {HTMLOptionElement} */
        let option = document.createElement("option");
        option.innerText = sub.subscriptionName;
        option.setAttribute("data-subBody", JSON.stringify(sub));
        subsSelect.append(option);
    });
    subsSelect[0].innerText = `Available subscriptions: ${subs.length}`;
    subsSelect.addEventListener('change', selectSubscriptionEvent);
}

function selectSubscriptionEvent(event) {
    window.sessionStorage.removeItem('selectedSubscription');
    let targetSelect = event.target;
    const selectedIndex = targetSelect.selectedIndex;
    if(selectedIndex === 0) {
        setMessageCounting('', '', '');
        return;
    }
    /** @type {HTMLElement} */
    let targetOption = targetSelect.options[selectedIndex];
    let dataSubBody = targetOption.getAttribute("data-subBody")
    window.sessionStorage.setItem('selectedSubscription', dataSubBody);
    let subBody = JSON.parse(dataSubBody);
    setMessageCounting(subBody.totalMessageCount, subBody.activeMessageCount, subBody.deadLetterMessageCount);

}

/**
 * 
 * @returns {connection}
 */
function getSelectedConn() {
    return JSON.parse(window.sessionStorage.getItem("selectedConnection"));
}

function getSelectedSubscription() {
    return JSON.parse(window.sessionStorage.getItem("selectedSubscription"));
}

function setMessageCounting(total, activeTotal, deadLetterTotal) {
    document.getElementById("conses_total").innerHTML = total;
    document.getElementById("conses_totalactive").innerHTML = activeTotal;
    document.getElementById("conses_totaldl").innerHTML = deadLetterTotal;
}

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("conses_tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

function peekMessages(isDeadLetter = false) {
    let conn = getSelectedConn();
    if (!conn) {
        new Notification('No connection');
        return;
    } 
    let subs = getSelectedSubscription();
    if (!subs) {
        new Notification('No selected Subscription');
        return;
    }
    console.log('Peeking...');
    let peekMessagesPromise = window.servicebus.peekMessages(conn, subs, isDeadLetter);
    peekMessagesPromise.then(messages => {
        console.log('Peeked');
        console.log(messages);
        let messageTable = document.getElementById("conses_table_message");
        populateTable(messageTable, messages);
    }).catch(err => console.log(err));
}

/**
 * @param {HTMLTableElement} table 
 * @param {Array<Object>} messages 
 */
function populateTable(table, messages) {
    let rowCount = table.rows.length;
    messages.forEach((message, index) => {
        let newRow = table.insertRow(rowCount);
        newRow.insertCell(0).innerHTML = (index + 1);
        newRow.insertCell(1).innerHTML = message.enqueuedTimeUtc;
        let thirdcell = newRow.insertCell(2);
        thirdcell.setAttribute("data-mbody", JSON.stringify(message.body));
        thirdcell.innerHTML = "view";
        thirdcell.addEventListener('dblclick', evt => {
            /** @type {HTMLTableCellElement} */
            let cell = evt.target;
            /** @type {HTMLTextAreaElement} */
            let textArea = document.getElementById("conses_textarea_message");
            let dataMBody = cell.getAttribute("data-mbody");
            textArea.value = JSON.stringify( JSON.parse(dataMBody), undefined, 3);
        
        });
        rowCount = rowCount + 1;
    });

}

async function createSubscription() {
    let conn = getSelectedConn();
    /** @type {string} */
    let newSubs = document.getElementById("conses_substext").value;
    newSubs = newSubs.trim();
    if(newSubs === '') {
        new Notification('Not valid subscription name');
        return;
    }
    let a = await window.servicebus.createSubscription(conn, newSubs);
    await loadView('connection-session');
    await populateSession();
}

/**
 * @param {MouseEvent} event 
 */
async function showSubsConfigEvent(event) {
    let conn = getSelectedConn();
    /** @type {HTMLLIElement} */
    let currentElement = event.target;
    let selectedSub = currentElement.getAttribute("data-subsname");
    let subsConfig = await window.servicebus.getSubsConfigProperties(conn, selectedSub);
    let rules = await window.servicebus.listRules(conn, selectedSub);
    let subsProps = {subsConfig, rules};
    document.getElementById("conses_subsconfig").value = JSON.stringify(subsProps, null, 3);
    currentElement.parentElement.querySelectorAll("li").forEach(e => e.style.fontWeight = null);
    currentElement.style.fontWeight = "bold";
}

/**
 * @param {MouseEvent} event 
 */
async function deleteSubsEvent(event) {
    let conn = getSelectedConn();
    let selectedSub = event.target.getAttribute("data-subsname");
    if(confirm(`Remove ${selectedSub}?`)) {
        await window.servicebus.deleteSubscription(conn, selectedSub);
        await loadView('connection-session');
        await populateSession();
    }
}

/**
 * 
 * @param {PointerEvent} event 
 */
async function updateConfig(event) {
    let configStr = document.getElementById("conses_subsconfig").value;
    try {
        event.target.disabled = true;        
        let configObj = JSON.parse(configStr);
        let conn = getSelectedConn();
        let updateConfigPromise = window.servicebus.updateSubsConfig(conn, configObj.subsConfig);
        let updateRulesPromise = window.servicebus.persistRules(conn, configObj.subsConfig.subscriptionName, configObj.rules);
        await Promise.all([updateConfigPromise, updateRulesPromise]);
        alert("Config updated!");
    } catch(err) {
        console.log(err);
        alert("Error!");
    } finally {
        event.target.disabled = false;
    }
}

/**
 * 
 * @param {PointerEvent} event 
 */
async function publish(event) {
    event.target.disabled = true;
    try {
        let appPropsStr = document.querySelector("#conses_appprops").value;
        let messageStr = document.querySelector("#conses_messagebody").value;
        let appProps = JSON.parse(appPropsStr);
        let message = JSON.parse(messageStr);
        let conn = getSelectedConn();
        await window.servicebus.publish(conn, message, appProps);
        alert("Message sent");
    } catch(err) {
        console.error(err);
        alert("Error");
    } finally {
        event.target.disabled = false;
    } 
}