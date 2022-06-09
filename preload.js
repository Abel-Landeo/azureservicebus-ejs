const { contextBridge } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const { AdminServiceBus, ClientServiceBus, SenderServiceBus } = require('./services/AzureServiceBus');

const RESOURCES_DIR = './resources/';
const RESOURCES_FILE = 'connections.json'
const CONNECTIONS_PATH = `${RESOURCES_DIR}${RESOURCES_FILE}`;
const VIEWS_DIR = './webapp/views';

window.addEventListener('DOMContentLoaded', async () => {
    contextBridge.exposeInMainWorld('preload', {
        fetchConnections,
        fetchViewAsHtml,
        appendConnection,
        modifyConnection,
        removeConnection
    });

    contextBridge.exposeInMainWorld('servicebus', {
        listSubscriptions,
        peekMessages,
        createSubscription,
        deleteSubscription,
        getSubsConfigProperties,
        updateSubsConfig,
        listRules,
        persistRules,
        publish

    });

});

async function publish(connection, message, appProps) {
    let senderSb = new SenderServiceBus(connection.topicString, connection.topicName);
    await senderSb.publish(message, appProps);        
}

async function persistRules(connection, subs, rules) {
    let adminSb = new AdminServiceBus(connection.topicString, connection.topicName);
    await adminSb.persistRules(subs, rules);
}

async function listRules(connection, subs) {
    let adminSb = new AdminServiceBus(connection.topicString, connection.topicName);
    return await adminSb.listRules(subs);
}

async function updateSubsConfig(connection, subsObj) {
    let adminSb = new AdminServiceBus(connection.topicString, connection.topicName);
    await adminSb.updateSubsConfig(subsObj);
}

async function getSubsConfigProperties(connection, subs) {
    let adminSb = new AdminServiceBus(connection.topicString, connection.topicName);
    return await adminSb.getSubscription(subs, {isRuntime: false});
}

async function deleteSubscription(connection, subs) {
    let adminSb = new AdminServiceBus(connection.topicString, connection.topicName);
    return await adminSb.deleteSubscription(subs);
}

async function createSubscription(connection, newSubs) {
    let adminSb = new AdminServiceBus(connection.topicString, connection.topicName);
    return await adminSb.createSubscription(newSubs);
}

async function listSubscriptions(connection) {
    let adminSb = new AdminServiceBus(connection.topicString, connection.topicName);
    return await adminSb.listSubscriptions({isRuntime: true});

}

async function peekMessages(connection, subs, isDeadLetter = false) {
    let clientSb = new ClientServiceBus(connection.topicString, connection.topicName, subs.subscriptionName);
    return await clientSb.peekMessages(isDeadLetter);
}



/**
 * @typedef connection
 * @property {string} name - name of the connection
 * @property {string} topicString - connection string of the topic in Azure Service Bus
 * @property {string} topicName - name of the topic in Azure ServiceBus
 */

/**
 * Fetch all topic connections
 * @returns {Promise<Array<connection>>} promise with all connections fetched
 */
async function fetchConnections() {
    try {
        await fs.access(CONNECTIONS_PATH);
        let connections = await fetchContent(CONNECTIONS_PATH);
        return JSON.parse(connections);
    } catch (error) {
        console.error(error);
        await fs.mkdir(RESOURCES_DIR, {recursive: true});
        await fs.writeFile(CONNECTIONS_PATH, JSON.stringify([]));
        return [];
    }
}

async function fetchViewAsHtml(viewFile) {
    try {
        let viewContent = await fetchContent(path.join(VIEWS_DIR, viewFile));
        return viewContent;
    } catch (error) {
        console.error(error);
        let notFound404 = await fs.readFile(path.join(VIEWS_DIR, 'notfound-404.html'));
        return notFound404.toString();
    }
}

/**
 * Returns content from a file as string
 * @param {string} file 
 * @returns {Promise<string>}
 */
async function fetchContent(file) {
    let content = await fs.readFile(file);
    return content.toString();
}

/**
 * Adds a new connection to the json connection array
 * @param {connection} connection 
 */
async function appendConnection(connection) {
    let connections = await fetchConnections();
    connections.push(connection);
    await fs.writeFile(CONNECTIONS_PATH, JSON.stringify(connections));
}

/**
 * Modify a existing connection of the json connection array
 * @param {connection} connection 
 */
 async function modifyConnection(connection) {
    let connections = await fetchConnections();
    let foundedConnection = connections.find(e => e.name === connection.name);
    if(foundedConnection) {
        foundedConnection.topicName = connection.topicName;
        foundedConnection.topicString = connection.topicString;
        await fs.writeFile(CONNECTIONS_PATH, JSON.stringify(connections));
        return;
    }
    throw new Error("connection not found");
}

/**
 * Remove specific connection from the connections array
 * @param {connection} connection
 */
async function removeConnection(connection) {
    let connections = await fetchConnections();
    let remainingConnections = connections.filter(c => c.name !== connection.name);
    await fs.writeFile(CONNECTIONS_PATH, JSON.stringify(remainingConnections));    
}


