/**
 * validates each element of the form
 * @param {Array<ChildNode>} form 
 */
function validateForm(form) {
    for (const e of form) {
        if (e.value.trim() === '') {
            throw new Error("no empty fields allowed");
        }
    }
}

async function createConnection() {
    try {
        let form = document.connection;
        validateForm(form);
        let newConnection = {
            name: form.name.value,
            topicString: form.topicString.value,
            topicName: form.topicName.value
        };
        document.getElementById("main_content").innerHTML = "";
        await window.preload.appendConnection(newConnection);
        await listConnections();
        new Notification("Success", {body: "Connection created!"});
        
    } catch (error) {
        console.error(error);
        new Notification('error', { body: error.message });
    }
}

async function updateConnection() {
    try {
        let form = document.connection;
        validateForm(form);
        let modifiedConnection = {
            name: form.name.value,
            topicString: form.topicString.value,
            topicName: form.topicName.value
        };
        document.getElementById("main_content").innerHTML = "";
        await window.preload.modifyConnection(modifiedConnection);
        await listConnections();
        new Notification("Success", {body: "Connection modified!"});
    } catch(error) {
        console.log(error);
        new Notification("error", {body: error.message});
    }

}
